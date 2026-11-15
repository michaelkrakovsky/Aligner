-- One Google Docs connection per person. The refresh token is encrypted by
-- the app (AES-256-GCM, key in GOOGLE_TOKEN_ENCRYPTION_KEY) before it gets
-- here, so the database never holds a usable token.

create table public.google_connections (
  owner_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  refresh_token_ciphertext text not null,
  scope text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_connections enable row level security;

create policy "Owners can read their Google connection" on public.google_connections
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "Owners can create their Google connection" on public.google_connections
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "Owners can update their Google connection" on public.google_connections
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy "Owners can delete their Google connection" on public.google_connections
  for delete to authenticated using (owner_id = (select auth.uid()));

create trigger google_connections_touch_updated_at before update on public.google_connections
  for each row execute function public.touch_updated_at();
