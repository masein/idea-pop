"use client";

export type Persona = "kid" | "parent" | "teacher" | "reviewer" | "other";

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
    case "reviewer":
      return "/dashboard/reviewer";
    case "parent":
    default:
      return "/dashboard/parent";
  }
}

/** The account's real role (from the API/JWT) → UI persona. */
export function roleToPersona(role: string): Persona {
  switch (role) {
    case "kid":
      return "kid";
    case "teacher":
      return "teacher";
    case "reviewer":
    case "admin":
      return "reviewer";
    case "parent":
      return "parent";
    default:
      return "other";
  }
}

/**
 * Make the persona cookie agree with the authenticated account's role.
 * The cookie only styles the UI — the account is the source of truth, so a
 * parent logging in on a browser that previously did kid onboarding must
 * never stay in the kid experience.
 */
export function reconcilePersona(role: string): Persona {
  const persona = roleToPersona(role);
  if (getPersona() !== persona) setPersona(persona);
  return persona;
}
