import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const ADMIN_SESSION_COOKIE = "ai_pilot_admin_session";
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 12;

function getAdminPassword() {
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    throw new Error("Missing ADMIN_PASSWORD environment variable");
  }

  return password;
}

function getSessionSecret() {
  return process.env.CONFIG_ENCRYPTION_KEY ?? getAdminPassword();
}

function signPayload(payload: string) {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("hex");
}

function buildSessionToken() {
  const expiresAt = Date.now() + ADMIN_SESSION_TTL_SECONDS * 1000;
  const payload = `admin:${expiresAt}`;
  const signature = signPayload(payload);

  return `${payload}:${signature}`;
}

function verifySessionToken(token: string | undefined) {
  if (!token) {
    return false;
  }

  const [scope, expiresAtRaw, signature] = token.split(":");
  if (!scope || !expiresAtRaw || !signature || scope !== "admin") {
    return false;
  }

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
    return false;
  }

  const expected = signPayload(`${scope}:${expiresAtRaw}`);

  try {
    return timingSafeEqual(
      Buffer.from(signature, "utf8"),
      Buffer.from(expected, "utf8"),
    );
  } catch {
    return false;
  }
}

export function isValidAdminPassword(submittedPassword: string) {
  return submittedPassword === getAdminPassword();
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function requireAdminAuth() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin?error=auth-required");
  }
}

export async function createAdminSession() {
  const cookieStore = await cookies();

  cookieStore.set(ADMIN_SESSION_COOKIE, buildSessionToken(), {
    httpOnly: true,
    maxAge: ADMIN_SESSION_TTL_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();

  cookieStore.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
