-- ----------------------------------------------------------------------------
-- Admin booking override
-- Lets a club admin remove ANY member's booking from a session (not just their
-- own), reusing the same waitlist auto-promote rule as cancel_booking().
-- ----------------------------------------------------------------------------

create or replace function admin_cancel_booking(p_instance_id uuid, p_member_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_status text;
  v_club   uuid;
  v_promote uuid;
begin
  if not is_admin() then raise exception 'Admins only'; end if;

  -- The target session must belong to the admin's own club.
  select e.club_id into v_club
    from event_instances ei
    join events e on e.id = ei.event_id
    where ei.id = p_instance_id;
  if v_club is null or v_club <> my_club_id() then
    raise exception 'That session is not in your club';
  end if;

  select status into v_status from bookings
    where instance_id = p_instance_id and member_id = p_member_id;
  if not found then return; end if;

  delete from bookings where instance_id = p_instance_id and member_id = p_member_id;

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

grant execute on function admin_cancel_booking(uuid, uuid) to authenticated;
