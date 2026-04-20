-- PokerHouse Database Schema
-- Run this in your Supabase SQL Editor to set up the database

-- Players: master roster of all players
create table players (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamptz default now() not null,
  constraint players_name_unique unique (name)
);

-- Sessions: a gathering/event where multiple games are played
create table sessions (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  date date not null default current_date,
  buy_in numeric(10,2) not null default 5.00,
  notes text,
  status text not null default 'active' check (status in ('active', 'completed')),
  share_code text unique default encode(gen_random_bytes(6), 'hex'),
  created_at timestamptz default now() not null
);

-- Games: individual games within a session
create table games (
  id uuid default gen_random_uuid() primary key,
  session_id uuid not null references sessions(id) on delete cascade,
  game_number int not null,
  created_at timestamptz default now() not null,
  unique(session_id, game_number)
);

-- Game results: each player's result in a specific game
create table game_results (
  id uuid default gen_random_uuid() primary key,
  game_id uuid not null references games(id) on delete cascade,
  player_id uuid not null references players(id) on delete restrict,
  result text not null check (result in ('win', 'loss')),
  amount numeric(10,2) not null,
  unique(game_id, player_id)
);

-- Settlements: optional tracking of who paid whom after a session
create table settlements (
  id uuid default gen_random_uuid() primary key,
  session_id uuid not null references sessions(id) on delete cascade,
  from_player_id uuid not null references players(id) on delete restrict,
  to_player_id uuid not null references players(id) on delete restrict,
  amount numeric(10,2) not null check (amount > 0),
  settled boolean not null default false,
  settled_at timestamptz,
  created_at timestamptz default now() not null
);

-- Indexes for common queries
create index idx_games_session on games(session_id);
create index idx_game_results_game on game_results(game_id);
create index idx_game_results_player on game_results(player_id);
create index idx_settlements_session on settlements(session_id);
create index idx_sessions_share_code on sessions(share_code);

-- Enable RLS on all tables
alter table players enable row level security;
alter table sessions enable row level security;
alter table games enable row level security;
alter table game_results enable row level security;
alter table settlements enable row level security;

-- Permissive policies (no auth for now - single host model)
-- These allow all operations via the anon key
create policy "Allow all on players" on players for all using (true) with check (true);
create policy "Allow all on sessions" on sessions for all using (true) with check (true);
create policy "Allow all on games" on games for all using (true) with check (true);
create policy "Allow all on game_results" on game_results for all using (true) with check (true);
create policy "Allow all on settlements" on settlements for all using (true) with check (true);

-- Session photos live in a separate migration file so they can be added to
-- existing databases without reapplying the whole schema. Run after this file:
--   supabase/photos.sql
