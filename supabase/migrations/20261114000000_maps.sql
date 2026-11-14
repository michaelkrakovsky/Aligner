-- Reality maps (member journeys). One row per map; the nodes, edges, and
-- roles live in `data` as JSON validated by the app (src/lib/map/schema.ts).
-- Normalized node/edge tables can come later with change proposals.

create table public.maps (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Kept from day one so maps can move into shared team workspaces.
  workspace_id text not null default 'ws_default',
  name text not null check (char_length(name) between 1 and 120),
  -- Position in the person's stack-ranked list of journeys (0 = top).
  rank integer not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index maps_owner_rank_idx on public.maps (owner_id, rank);

alter table public.maps enable row level security;

create policy "Owners can read their maps" on public.maps
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "Owners can create maps" on public.maps
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "Owners can update their maps" on public.maps
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy "Owners can delete their maps" on public.maps
  for delete to authenticated using (owner_id = (select auth.uid()));

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger maps_touch_updated_at before update on public.maps
  for each row execute function public.touch_updated_at();
