/**
 * Entity ids. UUIDs so two devices can mint ids independently without
 * colliding — the merges that read these ids treat a collision as "same
 * entity", so a counter seeded from the clock is not good enough.
 */

/**
 * `crypto.randomUUID` only exists in a secure context. A self-hosted backend
 * reached over a LAN IP (http://192.168.x.x:8080) is not one, so fall back
 * rather than throw.
 */
export function genId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${randomHex(8)}-${randomHex(4)}-${randomHex(4)}-${randomHex(4)}-${randomHex(12)}`;
}

function randomHex(length: number): string {
  let out = "";
  while (out.length < length) {
    out += Math.floor(Math.random() * 0x10000)
      .toString(16)
      .padStart(4, "0");
  }
  return out.slice(0, length);
}
