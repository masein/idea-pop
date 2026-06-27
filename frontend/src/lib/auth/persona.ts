"use client";

export type Persona = "kid" | "parent" | "teacher" | "other";

const COOKIE_NAME = "ideapop_persona";
const MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export function setPersona(persona: Persona): void {
  document.cookie = `${COOKIE_NAME}=${persona}; path=/; SameSite=Lax; max-age=${MAX_AGE}`;
}

export function getPersona(): Persona | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`)
  );
  return (match?.[1] as Persona) ?? null;
}

export function clearPersona(): void {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
}

export function dashboardHref(persona: Persona): string {
  switch (persona) {
    case "kid":
      return "/dashboard/kid";
    case "teacher":
      return "/dashboard/teacher";
    case "parent":
    default:
      return "/dashboard/parent";
  }
}
