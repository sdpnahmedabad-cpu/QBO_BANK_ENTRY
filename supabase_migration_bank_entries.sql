-- Migration to create bank_entries table
create table if not exists public.bank_entries (
  id uuid not null default gen_random_uuid () primary key,
  user_id uuid references auth.users(id) default auth.uid(),
  transaction_date date not null,
  description text not null,
  debit_amount decimal(10,2) not null default 0.00,
  credit_amount decimal(10,2) not null default 0.00,
  balance decimal(10,2) not null default 0.00,
  source text not null check (source in ('manual', 'import')),
  imported_at timestamp with time zone not null default now(),
  bank_statement_ref text,
  status text not null check (status in ('pending', 'confirmed', 'rejected')) default 'pending'
) tablespace pg_default;

-- Enable RLS
alter table public.bank_entries enable row level security;

-- Policies
drop policy if exists "Users can manage their own bank entries" on public.bank_entries;
create policy "Users can manage their own bank entries" on public.bank_entries 
  for all using (auth.uid() = user_id);
