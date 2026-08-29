-- Pickleball Club Manager — initial schema
-- Run this in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Safe to re-run: it drops and recreates the app tables (it does NOT touch auth users).

-- ----------------------------------------------------------------------------
-- Clean slate (app tables only)
-- ----------------------------------------------------------------------------
drop table if exists bookings cascade;
drop table if exists event_instances cascade;
drop table if exists events cascade;
drop table if exists members cascade;
drop table if exists clubs cascade;

drop function if exists my_club_id() cascade;
drop function if exists current_member_id() cascade;
drop function if exists is_admin() cascade;
drop function if exists book_slot(uuid) cascade;
drop function if exists cancel_booking(uuid) cascade;
drop function if exists handle_new_user() cascade;

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------
create table clubs (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

-- A member belongs to a club. user_id links to an auth user once they sign in,
-- but stays null for members an admin adds manually before they've signed up.
create table members (
  id              uuid primary key default gen_random_uuid(),
  club_id         uuid not null references clubs(id) on delete cascade,
  user_id         uuid references auth.users(id) on delete set null,
  name            text not null,
  email           text not null,
  membership_type text not null default 'generic' check (membership_type in ('admin','generic','family')),
  skill_rating    numeric(2,1) not null default 3.0,
  dues_status     text not null default 'none' check (dues_status in ('active','past_due','none')),
  joined_at       date not null default current_date,
  created_at      timestamptz not null default now(),
  unique (club_id, email)
);

create table events (
  id           uuid primary key default gen_random_uuid(),
  club_id      uuid not null references clubs(id) on delete cascade,
  title        text not null,
  duration_min int not null default 60,
  skill_level  text not null default 'Any',
  instructor   text,
  created_at   timestamptz not null default now()
);

create table event_instances (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references events(id) on delete cascade,
  starts_at  timestamptz not null,
  capacity   int not null default 8,
  created_at timestamptz not null default now()
);

create table bookings (
  id          uuid primary key default gen_random_uuid(),
  instance_id uuid not null references event_instances(id) on delete cascade,
  member_id   uuid not null references members(id) on delete cascade,
  status      text not null check (status in ('confirmed','waitlisted')),
  created_at  timestamptz not null default now(),
  unique (instance_id, member_id)
);

-- ----------------------------------------------------------------------------
-- Helper functions (security definer so they don't trigger RLS recursion)
-- ----------------------------------------------------------------------------
create function my_club_id()
returns uuid language sql stable security definer set search_path = public as $$
  select club_id from members where user_id = auth.uid() limit 1;
$$;

create function current_member_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from members where user_id = auth.uid() limit 1;
$$;

create function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from members where user_id = auth.uid() and membership_type = 'admin');
$$;

-- ----------------------------------------------------------------------------
-- Row-Level Security: users only see/act within their own club
-- ----------------------------------------------------------------------------
alter table clubs enable row level security;
alter table members enable row level security;
alter table events enable row level security;
alter table event_instances enable row level security;
alter table bookings enable row level security;

-- Clubs: read your own club
create policy clubs_select on clubs for select to authenticated
  using (id = my_club_id());

-- Members: read your club's roster; admins manage it
create policy members_select on members for select to authenticated
  using (club_id = my_club_id());
create policy members_admin_write on members for all to authenticated
  using (is_admin() and club_id = my_club_id())
  with check (is_admin() and club_id = my_club_id());

-- Events: read your club's; admins manage
create policy events_select on events for select to authenticated
  using (club_id = my_club_id());
create policy events_admin_write on events for all to authenticated
  using (is_admin() and club_id = my_club_id())
  with check (is_admin() and club_id = my_club_id());

-- Event instances: read your club's; admins manage
create policy instances_select on event_instances for select to authenticated
  using (exists (select 1 from events e where e.id = event_instances.event_id and e.club_id = my_club_id()));
create policy instances_admin_write on event_instances for all to authenticated
  using (exists (select 1 from events e where e.id = event_instances.event_id and e.club_id = my_club_id() and is_admin()))
  with check (exists (select 1 from events e where e.id = event_instances.event_id and e.club_id = my_club_id() and is_admin()));

-- Bookings: read all bookings for your club's instances (needed to show counts).
-- Writes go through book_slot()/cancel_booking() only (no direct insert/delete policy).
create policy bookings_select on bookings for select to authenticated
  using (exists (
    select 1 from event_instances ei
    join events e on e.id = ei.event_id
    where ei.id = bookings.instance_id and e.club_id = my_club_id()
  ));

-- ----------------------------------------------------------------------------
-- Booking logic (atomic, server-side) — enforces capacity + waitlist promote
-- ----------------------------------------------------------------------------
create function book_slot(p_instance_id uuid)
returns bookings language plpgsql security definer set search_path = public as $$
declare
  v_member uuid;
  v_capacity int;
  v_confirmed int;
  v_status text;
  v_row bookings;
begin
  v_member := current_member_id();
  if v_member is null then raise exception 'No member profile for the current user'; end if;

  select * into v_row from bookings where instance_id = p_instance_id and member_id = v_member;
  if found then return v_row; end if; -- already booked/waitlisted

  select capacity into v_capacity from event_instances where id = p_instance_id for update;
  if v_capacity is null then raise exception 'Event instance not found'; end if;

  select count(*) into v_confirmed from bookings where instance_id = p_instance_id and status = 'confirmed';
  v_status := case when v_confirmed < v_capacity then 'confirmed' else 'waitlisted' end;

  insert into bookings(instance_id, member_id, status)
  values (p_instance_id, v_member, v_status)
  returning * into v_row;
  return v_row;
end;
$$;

create function cancel_booking(p_instance_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_member uuid;
  v_status text;
  v_promote uuid;
begin
  v_member := current_member_id();
  if v_member is null then raise exception 'No member profile for the current user'; end if;

  select status into v_status from bookings where instance_id = p_instance_id and member_id = v_member;
  if not found then return; end if;

  delete from bookings where instance_id = p_instance_id and member_id = v_member;

  -- If a confirmed seat opened up, promote the earliest-waiting person.
  if v_status = 'confirmed' then
    select id into v_promote from bookings
      where instance_id = p_instance_id and status = 'waitlisted'
      order by created_at asc limit 1 for update;
    if found then
      update bookings set status = 'confirmed' where id = v_promote;
    end if;
  end if;
end;
$$;

grant execute on function book_slot(uuid) to authenticated;
grant execute on function cancel_booking(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- Auto-link / create a member row when someone signs in for the first time
-- ----------------------------------------------------------------------------
create function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_club uuid;
  v_linked uuid;
begin
  select id into v_club from clubs order by created_at asc limit 1;
  if v_club is null then return new; end if;

  -- Link to a manually-added member with the same email, if one exists...
  update members set user_id = new.id
    where club_id = v_club and lower(email) = lower(new.email) and user_id is null
    returning id into v_linked;

  -- ...otherwise create a fresh generic member for them.
  if v_linked is null then
    insert into members(club_id, user_id, name, email, membership_type)
    values (v_club, new.id,
            coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
            new.email, 'generic');
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ----------------------------------------------------------------------------
-- Seed data (one club, events, upcoming sessions, roster, sample bookings)
-- ----------------------------------------------------------------------------
do $$
declare
  c uuid;
  e_open uuid; e_beg uuid; e_int uuid; e_adv uuid;
  i_open1 uuid; i_beg1 uuid; i_int1 uuid; i_adv1 uuid; i_open2 uuid;
  m_ana uuid; m_ben uuid; m_carmen uuid; m_dev uuid; m_ella uuid;
begin
  insert into clubs(name) values ('Riverside Dinkers') returning id into c;

  insert into events(club_id,title,duration_min,skill_level,instructor)
    values (c,'Open Play',120,'Any',null) returning id into e_open;
  insert into events(club_id,title,duration_min,skill_level,instructor)
    values (c,'Beginner Clinic',60,'2.5','Coach Ana') returning id into e_beg;
  insert into events(club_id,title,duration_min,skill_level,instructor)
    values (c,'Intermediate Drills',90,'3.5','Coach Ana') returning id into e_int;
  insert into events(club_id,title,duration_min,skill_level,instructor)
    values (c,'Advanced Strategy',90,'4.5','Coach Marco') returning id into e_adv;

  insert into event_instances(event_id,starts_at,capacity)
    values (e_open, now()+interval '1 day', 12) returning id into i_open1;
  insert into event_instances(event_id,starts_at,capacity)
    values (e_beg, now()+interval '1 day 8 hours', 4) returning id into i_beg1;
  insert into event_instances(event_id,starts_at,capacity)
    values (e_int, now()+interval '2 days', 6) returning id into i_int1;
  insert into event_instances(event_id,starts_at,capacity)
    values (e_adv, now()+interval '3 days', 4) returning id into i_adv1;
  insert into event_instances(event_id,starts_at,capacity)
    values (e_open, now()+interval '5 days', 12) returning id into i_open2;

  insert into members(club_id,name,email,membership_type,skill_rating,dues_status)
    values (c,'Ana Rivera','ana@example.com','admin',4.5,'active')   returning id into m_ana;
  insert into members(club_id,name,email,membership_type,skill_rating,dues_status)
    values (c,'Ben Cho','ben@example.com','generic',3.0,'past_due')  returning id into m_ben;
  insert into members(club_id,name,email,membership_type,skill_rating,dues_status)
    values (c,'Carmen Diaz','carmen@example.com','family',4.0,'active') returning id into m_carmen;
  insert into members(club_id,name,email,membership_type,skill_rating,dues_status)
    values (c,'Dev Patel','dev@example.com','generic',2.5,'none')    returning id into m_dev;
  insert into members(club_id,name,email,membership_type,skill_rating,dues_status)
    values (c,'Ella Novak','ella@example.com','family',3.5,'active') returning id into m_ella;

  -- Beginner Clinic: full (4/4) with Ana waitlisted
  insert into bookings(instance_id,member_id,status,created_at) values
    (i_beg1,m_ben,'confirmed',   now()-interval '2 days'),
    (i_beg1,m_carmen,'confirmed',now()-interval '47 hours'),
    (i_beg1,m_dev,'confirmed',   now()-interval '46 hours'),
    (i_beg1,m_ella,'confirmed',  now()-interval '1 day'),
    (i_beg1,m_ana,'waitlisted',  now()-interval '23 hours');

  -- Intermediate Drills: 5/6 (one seat open)
  insert into bookings(instance_id,member_id,status,created_at) values
    (i_int1,m_ana,'confirmed',   now()-interval '2 days'),
    (i_int1,m_carmen,'confirmed',now()-interval '47 hours'),
    (i_int1,m_ella,'confirmed',  now()-interval '46 hours'),
    (i_int1,m_ben,'confirmed',   now()-interval '1 day'),
    (i_int1,m_dev,'confirmed',   now()-interval '23 hours');
end $$;
