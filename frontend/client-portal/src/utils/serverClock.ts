// frontend/client-portal/src/utils/serverClock.ts

/**
 * Tracks the offset between server clock and client clock (in ms).
 * Positive value means server is ahead of client.
 * Updated on each API response via the HTTP Date header.
 */
let serverClockOffsetMs = 0;

/**
 * Update the server clock offset from an HTTP response Date header.
 */
export function updateServerClockOffset(serverDateHeader: string | null): void {
  if (!serverDateHeader) return;
  const serverTime = new Date(serverDateHeader).getTime();
  if (Number.isNaN(serverTime)) return;
  serverClockOffsetMs = serverTime - Date.now();
}

/**
 * Get the estimated current server time, adjusted for clock skew.
 */
export function getServerNow(): number {
  return Date.now() + serverClockOffsetMs;
}
