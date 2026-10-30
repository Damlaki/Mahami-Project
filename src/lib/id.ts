/**
 * Collision-resistant id that works on Hermes (which has no crypto.randomUUID).
 * When tasks move to a database later, the server can keep these ids as-is.
 */
export function createId(prefix = "t"): string {
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${time}${random}`;
}
