-- ----------------------------------------------------------------------------
-- Member lifecycle (active/suspended, past-due tracking, grace period) +
-- rating history. Attendance is derived from bookings in the app (no table).
-- ----------------------------------------------------------------------------

-- 1. New columns -------------------------------------------------------------
alter table members add column if not exists status text not null default 'active'
  check (status in ('active', 'suspended'));
-- When the member first went past due (null unless currently past due).
alter table members add column if not exists past_due_since date;

-- Admin-configurable grace window before a past-due member should be suspended.
alter table clubs add column if not exists grace_days int not null default 14;

-- Backfill past_due_since for anyone already marked past due.
update members set past_due_since = current_date
  where dues_status = 'past_due' and past_due_since is null;

-- 2. Keep past_due_since in sync with dues_status ---------------------------
create or replace function sync_past_due_since()
returns trigger language plpgsql as $$
begin
  if new.dues_status = 'past_due' then
    if tg_op = 'INSERT' or old.dues_status is distinct from 'past_due' then
      new.past_due_since := current_date;
    end if;
  else
    new.past_due_since := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_past_due on members;
create trigger trg_sync_past_due before insert or update on members
  for each row execute function sync_past_due_since();

-- 3. Rating history (e.g. DUPR over time) -----------------------------------
create table if not exists member_rating_history (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references members(id) on delete cascade,
  rating     numeric(4,3) not null,               -- e.g. 3.456 (DUPR-style)
  source     text not null default 'DUPR' check (source in ('DUPR', 'self', 'admin')),
  as_of      date not null default current_date,
  note       text,
  created_at timestamptz not null default now()
);

alter table member_rating_history enable row level security;

create policy mrh_select on member_rating_history for select to authenticated
  using (exists (
    select 1 from members m where m.id = member_rating_history.member_id and m.club_id = my_club_id()
  ));

create policy mrh_admin_write on member_rating_history for all to authenticated
  using (exists (
    select 1 from members m
    where m.id = member_rating_history.member_id and m.club_id = my_club_id() and is_admin()
  ))
  with check (exists (
    select 1 from members m
    where m.id = member_rating_history.member_id and m.club_id = my_club_id() and is_admin()
  ));

-- 4. Block past-due / suspended members from booking ------------------------
create or replace function book_slot(p_instance_id uuid)
returns bookings language plpgsql security definer set search_path = public as $$
declare
  v_member uuid;
  v_dues text;
  v_status text;
  v_capacity int;
  v_confirmed int;
  v_book_status text;
  v_row bookings;
begin
  v_member := current_member_id();
  if v_member is null then raise exception 'No member profile for the current user'; end if;

  select dues_status, status into v_dues, v_status from members where id = v_member;
  if v_status = 'suspended' then
    raise exception 'Your membership is suspended. Please contact an admin.';
  end if;
  if v_dues = 'past_due' then
    raise exception 'Your dues are past due. Please settle up before booking.';
  end if;

  select * into v_row from bookings where instance_id = p_instance_id and member_id = v_member;
  if found then return v_row; end if; -- already booked/waitlisted

  select capacity into v_capacity from event_instances where id = p_instance_id for update;
  if v_capacity is null then raise exception 'Event instance not found'; end if;

  select count(*) into v_confirmed from bookings where instance_id = p_instance_id and status = 'confirmed';
  v_book_status := case when v_confirmed < v_capacity then 'confirmed' else 'waitlisted' end;

  insert into bookings(instance_id, member_id, status)
  values (p_instance_id, v_member, v_book_status)
  returning * into v_row;
  return v_row;
end;
$$;

-- 5. Suspend / reinstate a member -------------------------------------------
-- Suspending cancels the member's FUTURE bookings (promoting waitlists as
-- seats free up) and keeps the row + history for later reinstatement.
create or replace function admin_set_member_status(p_member_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_club uuid;
  r record;
  v_promote uuid;
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  if p_status not in ('active', 'suspended') then raise exception 'Invalid status'; end if;

  select club_id into v_club from members where id = p_member_id;
  if v_club is null or v_club <> my_club_id() then raise exception 'That member is not in your club'; end if;

  if p_status = 'suspended' then
    for r in
      select b.id, b.instance_id, b.status
      from bookings b
      join event_instances ei on ei.id = b.instance_id
      where b.member_id = p_member_id and ei.starts_at >= now()
    loop
      delete from bookings where id = r.id;
      if r.status = 'confirmed' then
        select id into v_promote from bookings
          where instance_id = r.instance_id and status = 'waitlisted'
          order by created_at asc limit 1 for update;
        if found then
          update bookings set status = 'confirmed' where id = v_promote;
        end if;
      end if;
    end loop;
  end if;

  update members set status = p_status where id = p_member_id;
end;
$$;

grant execute on function admin_set_member_status(uuid, text) to authenticated;
