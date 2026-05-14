// Maps Squad/edge-function error_code values into user-friendly messages.
// Always preserves req_id so users can quote it to support.

export interface SquadErrorPayload {
  error?: string;
  message?: string;
  error_code?: string;
  req_id?: string;
  upstream_status?: number;
  [key: string]: unknown;
}

const FRIENDLY: Record<string, string> = {
  INVALID_STATE:
    "This action can't be completed right now because your wallet or escrow is in an unexpected state. Please refresh and try again.",
  SQUAD_ERROR:
    "Our payments partner (Squad) couldn't process this request. Please try again in a moment.",
  NO_SQUAD_KEY:
    "Payments are temporarily unavailable while we configure the gateway. Please try again shortly.",
  UNAUTHENTICATED: "Please sign in again to continue.",
  INVALID_TOKEN: "Your session has expired. Please sign in again.",
  RPC_ERROR: "We couldn't update your wallet right now. Please try again.",
  EXCEPTION: "Something went wrong on our side. Please try again.",
  INSUFFICIENT_FUNDS: "You don't have enough balance for this withdrawal.",
  MIN_AMOUNT: "Minimum withdrawal amount is ₦100.",
  ACCOUNT_NOT_FOUND: "We couldn't find that bank account. Please re-verify the details.",
};

export function mapSquadError(payload: SquadErrorPayload | null | undefined, fallback = "Something went wrong"): string {
  if (!payload) return fallback;
  const code = payload.error_code;
  const friendly = code ? FRIENDLY[code] : null;
  const base = friendly || payload.message || payload.error || fallback;
  return payload.req_id ? `${base} (Ref: ${payload.req_id})` : base;
}
