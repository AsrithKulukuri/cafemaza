create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null,
  phone_e164 text,
  pending_phone_e164 text,
  phone_verified boolean not null default false,
  last_login_phone_verified_at timestamptz,
  otp_send_count integer not null default 0,
  otp_send_window_started_at timestamptz,
  otp_verify_fail_count integer not null default 0,
  otp_locked_until timestamptz,
  last_otp_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_profiles_phone_format check (
    phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{7,14}$'
  ),
  constraint user_profiles_pending_phone_format check (
    pending_phone_e164 is null or pending_phone_e164 ~ '^\+[1-9][0-9]{7,14}$'
  )
);

create or replace function public.handle_user_profiles_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;

create trigger trg_user_profiles_updated_at
before update on public.user_profiles
for each row
execute function public.handle_user_profiles_updated_at();

alter table public.user_profiles enable row level security;

alter table public.user_profiles add column if not exists otp_send_count integer not null default 0;
alter table public.user_profiles add column if not exists otp_send_window_started_at timestamptz;
alter table public.user_profiles add column if not exists otp_verify_fail_count integer not null default 0;
alter table public.user_profiles add column if not exists otp_locked_until timestamptz;
alter table public.user_profiles add column if not exists last_otp_sent_at timestamptz;

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update on table public.user_profiles to authenticated;
grant select, insert, update, delete on table public.user_profiles to service_role;

drop policy if exists "Users can view own profile" on public.user_profiles;
create policy "Users can view own profile"
on public.user_profiles
for select
using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.user_profiles;
create policy "Users can insert own profile"
on public.user_profiles
for insert
with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.user_profiles;
create policy "Users can update own profile"
on public.user_profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);
