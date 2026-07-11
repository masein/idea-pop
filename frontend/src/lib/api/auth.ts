"use client";

import { reconcilePersona } from "@/lib/auth/persona";

/**
 * In-memory access token store.
 *
 * Access token lives only in JS memory (never localStorage) to prevent XSS
 * harvesting. The refresh token is in an httpOnly Secure SameSite cookie —
 * the server sets it; JS never reads it.
 */
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

// Single-flight: several 401s land at once after a reload; the refresh
// ROTATES the session, so parallel refreshes race each other and losers get
// revoked. Share one in-flight refresh among all callers.
let inflightRefresh: Promise<string | null> | null = null;

export function refreshAccessToken(): Promise<string | null> {
  inflightRefresh ??= doRefresh().finally(() => {
    inflightRefresh = null;
  });
  return inflightRefresh;
}

async function doRefresh(): Promise<string | null> {
  // Same-origin: rides the /api/* rewrite in next.config.mjs.
  const res = await fetch(`/api/auth/refresh`, {
    method: "POST",
    credentials: "include", // sends httpOnly refresh cookie
  });
  if (!res.ok) {
    accessToken = null;
    return null;
  }
  const data = (await res.json()) as { access_token: string };
  accessToken = data.access_token;
  syncPersonaFromToken(data.access_token);
  return accessToken;
}

/** Keep the UI persona cookie in lockstep with the authenticated role.
 * The JWT payload carries the role claim, so this costs no extra request. */
function syncPersonaFromToken(token: string): void {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (typeof payload.role === "string") reconcilePersona(payload.role);
  } catch {
    /* malformed token — leave the cookie alone */
  }
}

export function clearAuth(): void {
  accessToken = null;
}

/** Revoke the server session and clear both tokens (cookie + memory). */
export async function logout(): Promise<void> {
  try {
    await fetch(`/api/auth/logout`, {
      method: "POST",
      credentials: "include", // sends + clears the httpOnly refresh cookie
    });
  } finally {
    accessToken = null;
  }
}
