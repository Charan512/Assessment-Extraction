/**
 * Session persistence helpers.
 * Stores the active session ID in localStorage so it survives
 * page navigations (Next.js client-side routing clears React state).
 */

const SESSION_KEY = "vedai_session_id";

export function saveSession(sessionId: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, sessionId);
  }
}

export function getSession(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem(SESSION_KEY);
  }
  return null;
}

export function clearSession(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
  }
}
