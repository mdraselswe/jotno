-- Platform pieces Drizzle doesn't model: auth trigger, storage buckets,
-- Realtime, rate limiting, grants. Written by hand.

-- ── Every new auth user gets a profile ──────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ── Storage ─────────────────────────────────────────────────────────────────
-- Uploads use one-time signed upload URLs made by the server, so no insert
-- policies are needed. `media` is public read; `private` is read via signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('media', 'media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('private', 'private', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

-- ── Realtime: chat messages and consult status reach participants live ─────
alter publication supabase_realtime add table public.messages, public.consults;

-- ── Rate limiting (fixed window), called by the server ──────────────────────
create or replace function public.rate_hit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  hits integer;
begin
  insert into public.rate_limits as r (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update set
    count = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.count + 1 end,
    window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning count into hits;
  return hits <= p_limit;
end;
$$;

revoke execute on function public.rate_hit(text, integer, integer) from public, anon, authenticated;

-- ── Browser roles: nothing by default (the server does the work) ───────────
-- RLS is on for every table with no policies except chat reads, so anon and
-- authenticated can't read or write anything else even with the public key.
revoke all on all tables in schema public from anon;
grant select on public.consults, public.messages to authenticated;
