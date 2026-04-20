-- PokerHouse · Atomic game insert
-- Idempotent migration. Safe to run multiple times in the Supabase SQL Editor.
--
-- Fixes three device-level bugs in the "Add Game" flow:
--   1. After a game is deleted, the client's local count becomes stale so it
--      tries to reuse an existing game_number and hits the
--      unique(session_id, game_number) constraint.
--   2. Two devices (host + shared link) add a game at the same time, both
--      compute the same next number, one fails.
--   3. A flaky mobile network drops the request between the `games` insert
--      and the `game_results` insert, leaving an orphan game row.
--
-- The RPC below assigns game_number on the server inside a single transaction
-- guarded by a per-session advisory lock, and inserts the results in the same
-- transaction. The client never picks game_number itself.

create or replace function insert_game_with_results(
  p_session_id uuid,
  p_results    jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_next_num   int;
  v_game_id    uuid;
  v_result_cnt int;
begin
  if p_session_id is null then
    raise exception 'session_id is required' using errcode = 'check_violation';
  end if;
  if p_results is null or jsonb_typeof(p_results) <> 'array' then
    raise exception 'results must be a JSON array' using errcode = 'check_violation';
  end if;

  -- Serialize concurrent "add game" calls for the same session. Using the
  -- session's uuid avoids blocking unrelated sessions. The lock is released
  -- automatically at end of transaction.
  perform pg_advisory_xact_lock(hashtext(p_session_id::text));

  select coalesce(max(game_number), 0) + 1
    into v_next_num
    from games
   where session_id = p_session_id;

  insert into games (session_id, game_number)
       values (p_session_id, v_next_num)
    returning id into v_game_id;

  insert into game_results (game_id, player_id, result, amount)
  select v_game_id,
         (r->>'player_id')::uuid,
          r->>'result',
         (r->>'amount')::numeric
    from jsonb_array_elements(p_results) as r;

  get diagnostics v_result_cnt = row_count;
  if v_result_cnt = 0 then
    raise exception 'At least one result is required'
      using errcode = 'check_violation';
  end if;

  return jsonb_build_object(
    'id',          v_game_id,
    'session_id',  p_session_id,
    'game_number', v_next_num
  );
end;
$$;

-- Make the RPC callable from the browser (same permission model as the
-- existing "Allow all" policies).
grant execute on function insert_game_with_results(uuid, jsonb) to anon, authenticated;
