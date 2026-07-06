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

export async function fetchMe() {
  const { data, error } = await apiClient.GET("/api/me");
  if (error) throw new Error("Failed to load account");
  return data;
}

export async function fetchCourses() {
  const { data, error } = await apiClient.GET("/api/library/courses");
  if (error) throw new Error("Failed to load courses");
  return data;
}

export async function fetchCreator(id: string) {
  const { data, error } = await apiClient.GET("/api/creators/{id}", {
    params: { path: { id } },
  });
  if (error) throw new Error("Failed to load creator");
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

export async function fetchKidProgress() {
  const { data, error } = await apiClient.GET("/api/me/progress");
  if (error) throw new Error("Failed to load progress");
  return data;
}

export async function fetchMyProjects() {
  const { data, error } = await apiClient.GET("/api/me/projects");
  if (error) throw new Error("Failed to load projects");
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

// ── Ideas Wall ────────────────────────────────────────────────────────────────

export async function fetchIdeas(
  challengeId: string,
  sort: "newest" | "most_remixed" = "newest"
) {
  const { data, error } = await apiClient.GET("/api/challenges/{id}/ideas", {
    params: { path: { id: challengeId }, query: { sort } },
  });
  if (error) throw new Error("Failed to load ideas");
  return data;
}

/** Returns the new idea id. Throws with code 'restricted' on 403. */
export async function submitIdea(
  challengeId: string,
  projectId: string,
  caption: string
) {
  const { data, error, response } = await apiClient.POST(
    "/api/challenges/{id}/ideas",
    {
      params: { path: { id: challengeId } },
      body: { project_id: projectId, caption },
    }
  );
  if (response.status === 403) {
    const e = new Error("restricted");
    (e as Error & { code: string }).code = "restricted";
    throw e;
  }
  if (error) throw new Error("Failed to submit idea");
  return data;
}

export async function reactToIdea(
  ideaId: string,
  reaction: "clap" | "star" | "lightbulb"
) {
  const { error } = await apiClient.POST("/api/ideas/{id}/react", {
    params: { path: { id: ideaId } },
    body: { reaction },
  });
  if (error) throw new Error("Failed to react");
}

export async function remixIdea(ideaId: string) {
  const { data, error, response } = await apiClient.POST(
    "/api/ideas/{id}/remix",
    { params: { path: { id: ideaId } } }
  );
  if (response.status === 403) {
    const e = new Error("restricted");
    (e as Error & { code: string }).code = "restricted";
    throw e;
  }
  if (error) throw new Error("Failed to remix");
  return data;
}

/** PATCH /api/projects/{id}/visibility. Throws with code 'restricted' on 403. */
export async function updateVisibility(
  projectId: string,
  visibility: "private" | "class" | "public"
) {
  const { data, error, response } = await apiClient.PATCH(
    "/api/projects/{id}/visibility",
    {
      params: { path: { id: projectId } },
      body: { visibility },
    }
  );
  if (response.status === 403) {
    const e = new Error("restricted");
    (e as Error & { code: string }).code = "restricted";
    throw e;
  }
  if (error) throw new Error("Failed to update visibility");
  return data;
}

// ── Parent ────────────────────────────────────────────────────────────────────

export async function fetchParentChildren() {
  const { data, error } = await apiClient.GET("/api/parent/children");
  if (error) throw new Error("Failed to load children");
  return data;
}

export async function fetchChildReport(childId: string) {
  const { data, error } = await apiClient.GET("/api/parent/children/{id}/report", {
    params: { path: { id: childId } },
  });
  if (error) throw new Error("Failed to load report");
  return data;
}

export async function grantConsent(childId: string, scope: "class" | "public" | "all") {
  const { error } = await apiClient.POST("/api/consents/grant", {
    body: { child_id: childId, scope },
  });
  if (error) throw new Error("Failed to grant consent");
}

export async function revokeConsent(childId: string, scope: "class" | "public" | "all") {
  const { error } = await apiClient.POST("/api/consents/revoke", {
    body: { child_id: childId, scope },
  });
  if (error) throw new Error("Failed to revoke consent");
}

export async function startCheckout(plan: "monthly" | "annual") {
  const { data, error } = await apiClient.POST("/billing/checkout", {
    body: { plan },
  });
  if (error) throw new Error("Failed to start checkout");
  return data;
}

export async function openBillingPortal() {
  const { data, error } = await apiClient.POST("/billing/portal");
  if (error) throw new Error("Failed to open billing portal");
  return data;
}

export async function fetchSubscription() {
  const { data, error } = await apiClient.GET("/billing/subscription");
  if (error) throw new Error("Failed to load subscription");
  return data;
}

// ── Teacher ───────────────────────────────────────────────────────────────────

export async function fetchTeacherClass() {
  const { data, error } = await apiClient.GET("/api/teacher/class");
  if (error) throw new Error("Failed to load class");
  return data;
}

export async function assignMission(challengeId: string) {
  const { error } = await apiClient.POST("/api/teacher/class/assign", {
    body: { challenge_id: challengeId },
  });
  if (error) throw new Error("Failed to assign mission");
}

export async function fetchClassGallery() {
  const { data, error } = await apiClient.GET("/api/teacher/class/gallery");
  if (error) throw new Error("Failed to load gallery");
  return data;
}

// ── Moderation ────────────────────────────────────────────────────────────────

export async function fetchModerationQueue(status?: "pending" | "approved" | "rejected") {
  const { data, error } = await apiClient.GET("/api/moderation/queue", {
    params: { query: status ? { status } : undefined },
  });
  if (error) throw new Error("Failed to load moderation queue");
  return data;
}

export async function approveItem(itemId: string) {
  const { error } = await apiClient.POST("/api/moderation/{id}/approve", {
    params: { path: { id: itemId } },
  });
  if (error) throw new Error("Failed to approve item");
}

export async function rejectItem(itemId: string, reason: string) {
  const { error } = await apiClient.POST("/api/moderation/{id}/reject", {
    params: { path: { id: itemId } },
    body: { reason },
  });
  if (error) throw new Error("Failed to reject item");
}

export async function fetchReports() {
  const { data, error } = await apiClient.GET("/api/reports");
  if (error) throw new Error("Failed to load reports");
  return data;
}

export async function fetchChallenges() {
  const { data, error } = await apiClient.GET("/api/challenges");
  if (error) throw new Error("Failed to load challenges");
  return data;
}
