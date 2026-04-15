import type { Player, PlayerNet, SettlementTransaction, GameWithResults } from "./types";

/**
 * Calculate the payout amounts for a single game.
 * Each loser pays the buy-in. Winners split the pot equally.
 */
export function calculateGamePayouts(
  buyIn: number,
  losers: string[],
  winners: string[]
): { playerId: string; amount: number; result: "win" | "loss" }[] {
  const totalPot = losers.length * buyIn;
  const winnerPayout = totalPot / winners.length;

  return [
    ...losers.map((id) => ({
      playerId: id,
      amount: -buyIn,
      result: "loss" as const,
    })),
    ...winners.map((id) => ({
      playerId: id,
      amount: winnerPayout,
      result: "win" as const,
    })),
  ];
}

/**
 * Aggregate net amounts per player across all games in a session.
 */
export function calculatePlayerNets(
  games: GameWithResults[],
  allPlayers: Player[]
): PlayerNet[] {
  const playerMap = new Map<string, PlayerNet>();

  for (const player of allPlayers) {
    playerMap.set(player.id, {
      player,
      net: 0,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
    });
  }

  for (const game of games) {
    for (const result of game.game_results) {
      const entry = playerMap.get(result.player_id);
      if (!entry) continue;
      entry.net += result.amount;
      entry.gamesPlayed += 1;
      if (result.result === "win") entry.wins += 1;
      else entry.losses += 1;
    }
  }

  return Array.from(playerMap.values())
    .filter((p) => p.gamesPlayed > 0)
    .sort((a, b) => b.net - a.net);
}

/**
 * Calculate optimal settlements to minimize number of transactions.
 * Uses a greedy algorithm: match largest debtor with largest creditor.
 */
export function calculateSettlements(
  playerNets: PlayerNet[]
): SettlementTransaction[] {
  const debtors: { player: Player; amount: number }[] = [];
  const creditors: { player: Player; amount: number }[] = [];

  for (const pn of playerNets) {
    const rounded = Math.round(pn.net * 100) / 100;
    if (rounded < 0) {
      debtors.push({ player: pn.player, amount: Math.abs(rounded) });
    } else if (rounded > 0) {
      creditors.push({ player: pn.player, amount: rounded });
    }
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transactions: SettlementTransaction[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const transferAmount = Math.min(debtors[i].amount, creditors[j].amount);
    const rounded = Math.round(transferAmount * 100) / 100;

    if (rounded > 0) {
      transactions.push({
        from: debtors[i].player,
        to: creditors[j].player,
        amount: rounded,
      });
    }

    debtors[i].amount -= transferAmount;
    creditors[j].amount -= transferAmount;

    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }

  return transactions;
}

/**
 * Format an amount in RM currency.
 */
export function formatRM(amount: number): string {
  const abs = Math.abs(amount);
  const formatted = abs % 1 === 0 ? abs.toFixed(0) : abs.toFixed(2);
  const sign = amount < 0 ? "-" : amount > 0 ? "+" : "";
  return `${sign}RM${formatted}`;
}

/**
 * Format just the amount without sign prefix (for settlement displays).
 */
export function formatRMAmount(amount: number): string {
  const abs = Math.abs(amount);
  return `RM${abs % 1 === 0 ? abs.toFixed(0) : abs.toFixed(2)}`;
}
