import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

export const recoveryEmailChallengeCookie = "khuree-recovery-email-challenge";
export const phoneRecoveryChallengeCookie = "khuree-phone-recovery-challenge";
export const phoneRecoveryAuthorizedCookie = "khuree-phone-recovery-authorized";

export type RecoveryPurpose = "link-email" | "reset-phone" | "reset-phone-authorized";
export type RecoveryToken = {
  purpose: RecoveryPurpose;
  userId: string;
  email: string;
  phone?: string;
  codeHash?: string;
  expiresAt: number;
};

function secret() {
  const value = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) throw new Error("Recovery secret тохируулаагүй байна.");
  return value;
}

function signature(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function createRecoveryCode() {
  return randomInt(100000, 1000000).toString();
}

export function hashRecoveryCode(userId: string, email: string, code: string) {
  return createHmac("sha256", secret()).update(`recovery:${userId}:${email}:${code}`).digest("base64url");
}

export function matchesRecoveryCode(expectedHash: string | undefined, userId: string, email: string, code: string) {
  if (!expectedHash) return false;
  const actual = Buffer.from(hashRecoveryCode(userId, email, code));
  const expected = Buffer.from(expectedHash);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function signRecoveryToken(payload: RecoveryToken) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signature(encoded)}`;
}

export function readRecoveryToken(value: string | undefined, purpose: RecoveryPurpose) {
  if (!value) return null;
  const [encoded, suppliedSignature] = value.split(".");
  if (!encoded || !suppliedSignature) return null;
  const expectedSignature = signature(encoded);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as RecoveryToken;
    if (payload.purpose !== purpose || !payload.userId || !payload.email || payload.expiresAt < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function recoveryCookieOptions(maxAge = 10 * 60) {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/", maxAge };
}
