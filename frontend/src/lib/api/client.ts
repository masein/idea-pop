import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "./schema";
import {
  getAccessToken,
  refreshAccessToken,
  setAccessToken,
} from "./auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

/** Attach the in-memory access token to every request. */
const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const token = getAccessToken();
    if (token) {
      request.headers.set("Authorization", `Bearer ${token}`);
    }
    return request;
  },
  async onResponse({ response, request }) {
    if (response.status !== 401) return response;

    // Try a silent refresh and replay the original request once.
    const fresh = await refreshAccessToken();
    if (!fresh) return response;

    const retried = request.clone();
    retried.headers.set("Authorization", `Bearer ${fresh}`);
    return fetch(retried);
  },
};

export const apiClient = createClient<paths>({ baseUrl: BASE_URL });
apiClient.use(authMiddleware);

/** Login helper — stores the returned access token in memory. */
export async function login(email: string, password: string): Promise<void> {
  const { data, error } = await apiClient.POST("/api/auth/login", {
    body: { email, password },
  });
  if (error) throw new Error("Login failed");
  setAccessToken(data.access_token);
}

/** Register a new adult account (parent or teacher). */
export async function register(
  email: string,
  password: string,
  role: "parent" | "teacher" = "parent"
): Promise<void> {
  const { error } = await apiClient.POST("/api/auth/register", {
    body: { email, password, role },
  });
  if (error) throw new Error("Registration failed");
}

/** Create a child profile (unauthenticated — kid self-signup). */
export async function createChild(data: {
  nickname: string;
  avatar_id: string;
  birth_year: number;
  parent_email: string;
}): Promise<{ id: string; access_token: string }> {
  const { data: res, error } = await apiClient.POST("/api/children", {
    body: data,
  });
  if (error || !res) throw new Error("Could not create profile");
  setAccessToken(res.access_token);
  return res;
}

/** Verify consent token (parent arrives from email link). */
export async function verifyConsent(token: string): Promise<void> {
  const { error } = await apiClient.POST("/api/consent/verify", {
    body: { token },
  });
  if (error) throw new Error("Consent verification failed");
}

/** Create a class for a teacher account. */
export async function createClass(
  name: string
): Promise<{ id: string; class_code: string; name: string }> {
  const { data: res, error } = await apiClient.POST("/api/classes", {
    body: { name },
  });
  if (error || !res) throw new Error("Could not create class");
  return res;
}
