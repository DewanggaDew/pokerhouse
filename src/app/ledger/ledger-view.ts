export const LEDGER_VIEWS = ["lifetime", "balances", "payments", "unsettled"] as const;
export type LedgerView = (typeof LEDGER_VIEWS)[number];
export const DEFAULT_LEDGER_VIEW: LedgerView = "lifetime";

export function parseLedgerView(value: string | undefined): LedgerView {
  return (LEDGER_VIEWS as readonly string[]).includes(value ?? "")
    ? (value as LedgerView)
    : DEFAULT_LEDGER_VIEW;
}
