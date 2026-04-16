import { cookies } from "next/headers";
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { redirect } from "next/navigation";

const COOKIE_NAME = "ruikd_session";

function hashPassword(v: string) {
  return createHash("sha256").update(v).digest("hex");
}

function getSecret() {
  return process.env.SESSION_SECRET || "dev-insecure-secret";
}

function sign(payload: string) {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function encode(email: string) {
  const payload = JSON.stringify({ email, iat: Date.now() });
  const sig = sign(payload);
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

function decode(token: string) {
  const decoded = Buffer.from(token, "base64url").toString();
  const [payload, sig] = decoded.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  return JSON.parse(payload) as { email: string; iat: number };
}

export async function login(email: string, password: string) {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@ruikd.local";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin1234";

  if (email !== adminEmail || hashPassword(password) !== hashPassword(adminPassword)) {
    return false;
  }

  (await cookies()).set(COOKIE_NAME, encode(email), { httpOnly: true, sameSite: "lax", path: "/" });
  return true;
}

export async function logout() {
  (await cookies()).delete(COOKIE_NAME);
}

export async function requireAuth() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) redirect("/login");
  const decoded = decode(token);
  if (!decoded) redirect("/login");
  return decoded;
}
