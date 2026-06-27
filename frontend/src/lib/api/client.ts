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

// ── Explore ───────────────────────────────────────────────────────────────────

export async function fetchExplore(params?: {
  superpower_category?: string;
  age_mode?: string;
  page?: number;
  per_page?: number;
}) {
  const { data, error } = await apiClient.GET("/api/explore", {
    params: { query: params },
  });
  if (error) throw new Error("Failed to load explore");
  return data;
}

export async function fetchExploreVideo(id: string) {
  const { data, error } = await apiClient.GET("/api/explore/{id}", {
    params: { path: { id } },
  });
  if (error) throw new Error("Failed to load video");
  return data;
}

export async function recordVideoView(videoId: string) {
  const { data, error } = await apiClient.POST("/api/progress/video-view", {
    body: { video_id: videoId },
  });
  if (error) throw new Error("Failed to record video view");
  return data;
}

// ── Library ───────────────────────────────────────────────────────────────────

export async function fetchStudios() {
  const { data, error } = await apiClient.GET("/api/library/studios");
  if (error) throw new Error("Failed to load studios");
  return data;
}

export async function fetchQuickMakes(params?: {
  studio?: string;
  page?: number;
  per_page?: number;
}) {
  const { data, error } = await apiClient.GET("/api/library/quick-makes", {
    params: { query: params },
  });
  if (error) throw new Error("Failed to load quick makes");
  return data;
}

export async function fetchCourse(id: string) {
  const { data, error } = await apiClient.GET("/api/courses/{id}", {
    params: { path: { id } },
  });
  if (error) throw new Error("Failed to load course");
  return data;
}

export async function recordLessonComplete(lessonId: string) {
  const { data, error } = await apiClient.POST("/api/progress/lesson-complete", {
    body: { lesson_id: lessonId },
  });
  if (error) throw new Error("Failed to record lesson complete");
  return data;
}

// ── Progress ──────────────────────────────────────────────────────────────────

export async function fetchProgressSummary() {
  const { data, error } = await apiClient.GET("/api/me/progress");
  if (error) throw new Error("Failed to load progress");
  return data;
}

// ── Challenges ────────────────────────────────────────────────────────────────

export async function fetchChallenge(id: string) {
  const { data, error } = await apiClient.GET("/api/challenges/{id}", {
    params: { path: { id } },
  });
  if (error) throw new Error("Failed to load challenge");
  return data;
}

export async function startAttempt(challengeId: string) {
  const { data, error } = await apiClient.POST("/api/challenges/{id}/attempt", {
    params: { path: { id: challengeId } },
  });
  if (error) throw new Error("Failed to start attempt");
  return data;
}

export async function advanceStep(attemptId: string, step: number) {
  const { data, error } = await apiClient.PATCH("/api/attempts/{id}/step", {
    params: { path: { id: attemptId } },
    body: { step },
  });
  if (error) throw new Error("Failed to advance step");
  return data;
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function createProject(body: {
  title: string;
  what_i_made: string;
  what_i_used: string;
  what_was_hard: string;
  what_id_improve: string;
  challenge_id: string | null;
  step_type: "sketch" | "build";
}) {
  const { data, error } = await apiClient.POST("/api/projects", { body });
  if (error) throw new Error("Failed to create project");
  return data;
}
