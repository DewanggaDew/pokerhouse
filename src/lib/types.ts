export type Player = {
  id: string;
  name: string;
  created_at: string;
};

export type Session = {
  id: string;
  name: string;
  date: string;
  buy_in: number;
  notes: string | null;
  status: "active" | "completed";
  share_code: string;
  created_at: string;
};

export type Game = {
  id: string;
  session_id: string;
  game_number: number;
  created_at: string;
};

export type GameResult = {
  id: string;
  game_id: string;
  player_id: string;
  result: "win" | "loss";
  amount: number;
};

export type Settlement = {
  id: string;
  session_id: string;
  from_player_id: string;
  to_player_id: string;
  amount: number;
  settled: boolean;
  settled_at: string | null;
  created_at: string;
};

export type GameWithResults = Game & {
  game_results: (GameResult & { player: Player })[];
};

export type PlayerNet = {
  player: Player;
  net: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
};

export type SettlementTransaction = {
  from: Player;
  to: Player;
  amount: number;
};

export type SessionPhoto = {
  id: string;
  session_id: string;
  player_id: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
};

export type SessionPhotoWithPlayer = SessionPhoto & {
  player: Player;
};

export const MAX_PHOTOS_PER_PLAYER_PER_SESSION = 2;
export const SESSION_PHOTOS_BUCKET = "session-photos";
