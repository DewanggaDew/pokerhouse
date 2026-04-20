# PokerHouse

Track your poker tournament sessions — who won, who lost, who owes whom.

Built with Next.js, Supabase, and shadcn/ui.

## Setup

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com) and create a new project.

### 2. Run the database schema

Open the SQL Editor in your Supabase dashboard and run:

1. `supabase/schema.sql` — core tables (players, sessions, games, results, settlements)
2. `supabase/photos.sql` — session photos table, upload limits, and the public storage bucket
3. `supabase/games.sql` — atomic `insert_game_with_results` RPC that serializes concurrent "Add Game" calls and assigns `game_number` on the server

All files are idempotent and safe to re-run.

### 3. Configure environment variables

Copy the example env file and fill in your Supabase credentials:

```bash
cp .env.local.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your Supabase project settings (Settings → API).

### 4. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Push this repo to GitHub
2. Import the repo on [vercel.com](https://vercel.com)
3. Add the two environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
4. Deploy

## How It Works

1. **Add Players** — Build a roster of your regular players
2. **Create a Session** — Set the date, buy-in amount, and session name
3. **Add Games** — For each game, select players, then mark who lost
4. **View Standings** — See net winnings/losses per player (always balanced to zero)
5. **Settle Up** — Generate minimal settlement transactions (who pays whom)
6. **Share** — Share results via QR code or link
7. **Photos** — Each player can attach up to 2 photos per session (limit is enforced in the database). Uploaded images are auto-resized client-side to WebP to keep storage light.
8. **Feed** — A chronological stream of every photo across every session — the social layer.
