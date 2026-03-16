-- 1. Create tables if they don't exist
create table if not exists public.quickbooks_clients (
  id text not null primary key, -- realmId
  name text not null,
  access_token text not null,
  refresh_token text not null,
  expires_in int not null,
  x_refresh_token_expires_in int not null,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  client_email text
) tablespace pg_default;

create table if not exists public.import_rules (
  id uuid not null default gen_random_uuid () primary key,
  client_id text not null references public.quickbooks_clients (id) on delete cascade,
  rule_name text not null,
  rule_type text not null,
  match_type text not null default 'AND'::text,
  conditions jsonb not null default '[]'::jsonb,
  actions jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now()
) tablespace pg_default;

create table if not exists public.master_rules (
  id uuid not null default gen_random_uuid () primary key,
  rule_name text not null,
  match_type text not null default 'AND'::text,
  conditions jsonb not null default '[]'::jsonb,
  rule_type text not null,
  actions jsonb not null default '{}'::jsonb,
  applied_client_ids text[] default array[]::text[],
  created_at timestamp with time zone not null default now()
) tablespace pg_default;

-- 2. Profiles Table for Role Management
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  role text not null check (role in ('admin', 'coworker')),
  firm_name text,
  admin_email_display text,
  created_at timestamp with time zone not null default now()
) tablespace pg_default;

-- 3. Add user_id columns for Multi-Tenancy
do $$ 
begin 
    if not exists (select 1 from information_schema.columns where table_name='quickbooks_clients' and column_name='user_id') then
        alter table public.quickbooks_clients add column user_id uuid references auth.users(id) default auth.uid();
    end if;

    if not exists (select 1 from information_schema.columns where table_name='import_rules' and column_name='user_id') then
        alter table public.import_rules add column user_id uuid references auth.users(id) default auth.uid();
    end if;

    if not exists (select 1 from information_schema.columns where table_name='master_rules' and column_name='user_id') then
        alter table public.master_rules add column user_id uuid references auth.users(id) default auth.uid();
    end if;
end $$;

-- 4. Automatic Role Assignment Trigger
-- The FIRST user to sign up will be 'admin'. Everyone else is 'coworker'.
create or replace function public.handle_new_user() 
returns trigger as $$
declare
  is_first_user boolean;
begin
  select not exists (select 1 from public.profiles) into is_first_user;
  
  insert into public.profiles (id, email, role)
  values (
    new.id, 
    new.email, 
    case when is_first_user then 'admin' else 'coworker' end
  );
  return new;
end;
$$ language plpgsql security definer;

-- Re-create trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.quickbooks_clients enable row level security;
alter table public.import_rules enable row level security;
alter table public.master_rules enable row level security;

-- Profiles: Users can view all profiles in their instance (for the user list)
drop policy if exists "Users can view all profiles" on public.profiles;
create policy "Users can view all profiles" on public.profiles for select using (true);
drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles" on public.profiles for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Data isolation policies
drop policy if exists "Users can only access their own connections" on public.quickbooks_clients;
create policy "Allow all authenticated users to access QBO connections" on public.quickbooks_clients 
  for all using (auth.role() = 'authenticated');

drop policy if exists "Users can only manage their own import rules" on public.import_rules;
create policy "Users can only manage their own import rules" on public.import_rules 
  for all using (auth.uid() = user_id);

drop policy if exists "Users can only manage their own master rules" on public.master_rules;
create policy "Users can only manage their own master rules" on public.master_rules 
  for all using (auth.uid() = user_id);
