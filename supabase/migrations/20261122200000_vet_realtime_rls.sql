-- Vets didn't receive chat messages live: the consults/messages read policies
-- looked the vet up in public.providers, which has RLS on and no policy, so for
-- the signed-in vet that lookup always came back empty (owners were fine).
-- A security-definer helper returns only the caller's own provider ids,
-- without opening the providers table to clients.

create or replace function public.my_provider_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id from public.providers p where p.profile_id = (select auth.uid())
$$;

revoke execute on function public.my_provider_ids() from public, anon;
grant execute on function public.my_provider_ids() to authenticated;

drop policy if exists "consults_participants_read" on public.consults;
create policy "consults_participants_read" on public.consults
  as permissive for select to authenticated
  using (
    (select auth.uid()) = owner_id
    or provider_id in (select public.my_provider_ids())
  );

drop policy if exists "messages_participants_read" on public.messages;
create policy "messages_participants_read" on public.messages
  as permissive for select to authenticated
  using (
    exists (
      select 1 from public.consults c
      where c.id = consult_id
        and ((select auth.uid()) = c.owner_id or c.provider_id in (select public.my_provider_ids()))
    )
  );
