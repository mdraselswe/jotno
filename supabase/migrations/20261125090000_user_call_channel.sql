-- Each signed-in person gets a private Realtime topic "user:<their uuid>". The
-- server (as postgres, via realtime.send) rings it when someone calls them, so
-- the incoming-call screen shows on every page, not only on the chat page.
-- Only the person themself may listen; nobody may send from the browser.

create or replace function public.is_own_user_topic(topic text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select topic is not null
    and (select auth.uid()) is not null
    and topic = 'user:' || (select auth.uid())::text
$$;

revoke execute on function public.is_own_user_topic(text) from public, anon;
grant execute on function public.is_own_user_topic(text) to authenticated;

drop policy if exists "user_channel_read" on realtime.messages;
create policy "user_channel_read" on realtime.messages
  as permissive for select to authenticated
  using (
    realtime.messages.extension in ('broadcast')
    and public.is_own_user_topic((select realtime.topic()))
  );
