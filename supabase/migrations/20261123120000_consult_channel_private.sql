-- Consult chat channels (topic "consult:<uuid>") become private Realtime channels:
-- only the owner and the vet of that consult may join, see presence, or send
-- broadcasts (typing, call signals). Without this, anyone signed in who knew a
-- consult id could listen to or inject call signals on a public channel.
-- The browser joins with { config: { private: true } } (features/consults).
-- Also switch on "private channels only" in the hosted project's Realtime
-- settings so a public channel with the same name can't be used.

create or replace function public.is_consult_participant(topic text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  cid uuid;
begin
  if topic is null
    or topic !~ '^consult:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  cid := substring(topic from 9)::uuid;
  return exists (
    select 1
    from public.consults c
    where c.id = cid
      and (
        c.owner_id = (select auth.uid())
        or c.provider_id in (select p.id from public.providers p where p.profile_id = (select auth.uid()))
      )
  );
end
$$;

revoke execute on function public.is_consult_participant(text) from public, anon;
grant execute on function public.is_consult_participant(text) to authenticated;

drop policy if exists "consult_channel_read" on realtime.messages;
create policy "consult_channel_read" on realtime.messages
  as permissive for select to authenticated
  using (
    realtime.messages.extension in ('broadcast', 'presence')
    and public.is_consult_participant((select realtime.topic()))
  );

drop policy if exists "consult_channel_write" on realtime.messages;
create policy "consult_channel_write" on realtime.messages
  as permissive for insert to authenticated
  with check (
    realtime.messages.extension in ('broadcast', 'presence')
    and public.is_consult_participant((select realtime.topic()))
  );
