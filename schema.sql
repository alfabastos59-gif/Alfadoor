-- AlfaDoor Supabase schema v2
-- Execute no SQL Editor do projeto Supabase.
create extension if not exists pgcrypto;

do $$ begin
  create type public.user_role as enum ('admin', 'operator');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.record_status as enum ('active', 'inactive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.device_status as enum ('pending', 'online', 'offline', 'disabled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.campaign_status as enum ('draft', 'pending_review', 'approved', 'scheduled', 'active', 'paused', 'completed', 'rejected');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.user_role not null default 'operator',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), 'operator')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.current_user_role()
returns public.user_role language sql stable security definer set search_path = ''
as $$
  select role from public.profiles where id = auth.uid() and active = true
$$;

create table if not exists public.advertisers (
  id uuid primary key default gen_random_uuid(),
  company_name text not null check (char_length(company_name) between 2 and 160),
  contact_name text,
  email text,
  phone text,
  status public.record_status not null default 'active',
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists advertisers_company_name_idx on public.advertisers (lower(company_name));
create index if not exists advertisers_status_idx on public.advertisers (status);

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  city text,
  state text,
  contact_name text,
  contact_phone text,
  status public.record_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references public.venues(id) on delete set null,
  name text not null,
  activation_code text unique,
  device_secret_hash text,
  platform text not null default 'android_tv',
  app_version text,
  status public.device_status not null default 'pending',
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists devices_status_idx on public.devices(status);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  duration_seconds integer check (duration_seconds is null or duration_seconds > 0),
  width integer,
  height integer,
  status public.record_status not null default 'active',
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  advertiser_id uuid not null references public.advertisers(id) on delete restrict,
  name text not null,
  status public.campaign_status not null default 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  budget numeric(12,2) check (budget is null or budget >= 0),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create index if not exists campaigns_status_idx on public.campaigns(status);
create index if not exists campaigns_schedule_idx on public.campaigns(starts_at, ends_at);

create table if not exists public.campaign_devices (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  device_id uuid not null references public.devices(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (campaign_id, device_id)
);

create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  device_id uuid references public.devices(id) on delete cascade,
  venue_id uuid references public.venues(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (device_id is not null or venue_id is not null)
);

create table if not exists public.playlist_items (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id) on delete restrict,
  campaign_id uuid references public.campaigns(id) on delete set null,
  position integer not null check (position >= 0),
  duration_override_seconds integer check (duration_override_seconds is null or duration_override_seconds > 0),
  created_at timestamptz not null default now(),
  unique (playlist_id, position)
);

create table if not exists public.playback_events (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  media_asset_id uuid references public.media_assets(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz,
  result text not null default 'started' check (result in ('started','completed','failed','interrupted')),
  app_version text,
  created_at timestamptz not null default now()
);
create index if not exists playback_events_device_started_idx on public.playback_events(device_id, started_at desc);
create index if not exists playback_events_campaign_idx on public.playback_events(campaign_id, started_at desc);

-- RLS enabled on every exposed application table.
alter table public.profiles enable row level security;
alter table public.advertisers enable row level security;
alter table public.venues enable row level security;
alter table public.devices enable row level security;
alter table public.media_assets enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_devices enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_items enable row level security;
alter table public.playback_events enable row level security;

-- A signed-in user can read their own profile; only admins can manage profiles.
drop policy if exists "profile read self or admin" on public.profiles;
create policy "profile read self or admin" on public.profiles for select to authenticated
using (id = auth.uid() or public.current_user_role() = 'admin');
drop policy if exists "profile admin update" on public.profiles;
create policy "profile admin update" on public.profiles for update to authenticated
using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');

-- Initial admin/operator console policies. Tighten to venue/advertiser ownership if client accounts are added.
do $$ declare t text; begin
  foreach t in array array['advertisers','venues','devices','media_assets','campaigns','campaign_devices','playlists','playlist_items','playback_events'] loop
    execute format('drop policy if exists "authenticated read %s" on public.%I', t, t);
    execute format('create policy "authenticated read %s" on public.%I for select to authenticated using (public.current_user_role() in (''admin'', ''operator''))', t, t);
    execute format('drop policy if exists "admin manage %s" on public.%I', t, t);
    execute format('create policy "admin manage %s" on public.%I for all to authenticated using (public.current_user_role() = ''admin'') with check (public.current_user_role() = ''admin'')', t, t);
  end loop;
end $$;

-- Private media bucket. Upload/read policies restricted to admin for this first version.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('alfadoor-media', 'alfadoor-media', false, 524288000, array['image/jpeg','image/png','image/webp','video/mp4','video/webm'])
on conflict (id) do update set public = false, file_size_limit = 524288000,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','video/mp4','video/webm'];

drop policy if exists "admin read alfadoor media" on storage.objects;
create policy "admin read alfadoor media" on storage.objects for select to authenticated
using (bucket_id = 'alfadoor-media' and public.current_user_role() = 'admin');
drop policy if exists "admin upload alfadoor media" on storage.objects;
create policy "admin upload alfadoor media" on storage.objects for insert to authenticated
with check (bucket_id = 'alfadoor-media' and public.current_user_role() = 'admin');
drop policy if exists "admin update alfadoor media" on storage.objects;
create policy "admin update alfadoor media" on storage.objects for update to authenticated
using (bucket_id = 'alfadoor-media' and public.current_user_role() = 'admin')
with check (bucket_id = 'alfadoor-media' and public.current_user_role() = 'admin');
drop policy if exists "admin delete alfadoor media" on storage.objects;
create policy "admin delete alfadoor media" on storage.objects for delete to authenticated
using (bucket_id = 'alfadoor-media' and public.current_user_role() = 'admin');
