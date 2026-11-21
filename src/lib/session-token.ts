export const SESSION_COOKIE_NAME = "mostrador_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 días

export interface SessionPayload {
  uid: number;
  exp: number;
}

function getSecret(): string {
  return (
    process.env.SESSION_SECRET ??
    "dev-mostrador-secreto-local-no-usar-en-produccion-2026"
  );
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/") + "==".slice(0, (4 - (str.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function importHmacKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signSessionToken(uid: number): Promise<{
  token: string;
  maxAge: number;
}> {
  const payload: SessionPayload = {
    uid,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const enc = new TextEncoder();
  const payloadB64 = toBase64Url(enc.encode(JSON.stringify(payload)));
  const key = await importHmacKey();
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(payloadB64));
  const sigB64 = toBase64Url(new Uint8Array(sigBuf));
  return {
    token: `${payloadB64}.${sigB64}`,
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<SessionPayload | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) return null;

  try {
    const enc = new TextEncoder();
    const key = await importHmacKey();
    const sigBytes = fromBase64Url(sigB64);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes.buffer as ArrayBuffer,
      enc.encode(payloadB64)
    );
    if (!valid) return null;

    const jsonStr = new TextDecoder().decode(fromBase64Url(payloadB64));
    const parsed = JSON.parse(jsonStr) as SessionPayload;
    if (
      typeof parsed.uid !== "number" ||
      typeof parsed.exp !== "number" ||
      parsed.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
