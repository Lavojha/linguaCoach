const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const cloudConfigured = Boolean(url && anonKey);

type AuthSession = { access_token: string; refresh_token: string; user: { id: string; email?: string } };
const SESSION_KEY = "linguacoach.auth";

export function getAuthSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
}

function saveSession(session: AuthSession | null) {
  if (typeof window === "undefined") return;
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}

async function authRequest(path: string, body: unknown) {
  if (!cloudConfigured) throw new Error("Cloud account storage is not configured yet.");
  const response = await fetch(url + "/auth/v1/" + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: anonKey! },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error_description || data.msg || data.message || "Authentication failed.");
  return data;
}

export async function signIn(email: string, password: string) {
  const data = await authRequest("token?grant_type=password", { email, password });
  const session = { access_token: data.access_token, refresh_token: data.refresh_token, user: data.user };
  saveSession(session);
  return session;
}

export async function signUp(email: string, password: string, displayName: string) {
  const data = await authRequest("signup", { email, password, data: { display_name: displayName } });
  if (!data.access_token) return null;
  const session = { access_token: data.access_token, refresh_token: data.refresh_token, user: data.user };
  saveSession(session);
  return session;
}

export function signOut() { saveSession(null); }

export async function refreshAuth() {
  const session = getAuthSession();
  if (!session?.refresh_token || !cloudConfigured) return null;
  try {
    const data = await authRequest("token?grant_type=refresh_token", { refresh_token: session.refresh_token });
    const next = { access_token: data.access_token, refresh_token: data.refresh_token, user: data.user };
    saveSession(next);
    return next;
  } catch {
    signOut();
    return null;
  }
}

async function rest(path: string, init: RequestInit = {}) {
  const session = getAuthSession();
  if (!session) throw new Error("Please sign in to sync your learning data.");
  const response = await fetch(url + "/rest/v1/" + path, {
    ...init,
    headers: {
      apikey: anonKey!,
      Authorization: "Bearer " + session.access_token,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers || {}),
    },
  });
  if (response.status === 401) {
    const refreshed = await refreshAuth();
    if (refreshed) return rest(path, init);
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || "Cloud sync failed.");
  return data;
}

export async function loadCloudData() {
  const [sessions, vocabulary] = await Promise.all([
    rest("learning_sessions?select=*&order=created_at.desc&limit=100"),
    rest("vocabulary?select=*&order=first_seen_at.desc&limit=100"),
  ]);
  return { sessions, vocabulary };
}

export async function saveCloudSession(session: {
  id?: string; createdAt: string; language: string; level: string; scenario: string;
  durationSeconds: number; userTurns: number; overall: number; fluency: number;
  grammar: number; vocabulary: number; confidence: number; summary: string;
}) {
  return rest("learning_sessions", {
    method: "POST",
    body: JSON.stringify({
      ...(session.id ? { id: session.id } : {}),
      created_at: session.createdAt, language: session.language, level: session.level,
      scenario: session.scenario, duration_seconds: session.durationSeconds,
      user_turns: session.userTurns, overall: session.overall, fluency: session.fluency,
      grammar: session.grammar, vocabulary: session.vocabulary, confidence: session.confidence,
      summary: session.summary,
    }),
  });
}

export async function upsertCloudVocabulary(items: Array<{
  word: string; meaning: string; example: string; language: string; reviewCount: number;
}>) {
  if (!items.length) return [];
  return rest("vocabulary?on_conflict=user_id,language,word", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(items.map(item => ({
      word: item.word, meaning: item.meaning, example: item.example,
      language: item.language, review_count: item.reviewCount,
    }))),
  });
}
