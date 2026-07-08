"use client";

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

export async function refreshAccessToken(): Promise<string | null> {
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
  return accessToken;
}

export function clearAuth(): void {
  accessToken = null;
}
