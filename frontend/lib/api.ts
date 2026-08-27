/**
 * Centralized API configuration.
 * All API calls should use this module instead of hardcoding URLs.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const API = {
  baseUrl: API_BASE_URL,

  // Upload endpoints
  upload: {
    questionPaper: `${API_BASE_URL}/api/v1/upload/question-paper`,
    answerSheet: `${API_BASE_URL}/api/v1/upload/answer-sheet`,
  },

  // Extraction
  extraction: {
    extract: (sessionId: string) => `${API_BASE_URL}/api/v1/extraction/${sessionId}/extract`,
    status: (sessionId: string) => `${API_BASE_URL}/api/v1/extraction/${sessionId}/status`,
  },

  // Mapping
  mapping: {
    autoMap: (sessionId: string) => `${API_BASE_URL}/api/v1/mapping/${sessionId}/auto-map`,
    get: (sessionId: string) => `${API_BASE_URL}/api/v1/mapping/${sessionId}`,
    update: (sessionId: string) => `${API_BASE_URL}/api/v1/mapping/${sessionId}`,
  },

  // Grading
  grading: {
    grade: (sessionId: string) => `${API_BASE_URL}/api/v1/grading/${sessionId}/grade`,
    results: (sessionId: string) => `${API_BASE_URL}/api/v1/grading/${sessionId}/results`,
  },

  // Session data
  data: {
    session: (sessionId: string) => `${API_BASE_URL}/api/v1/data/${sessionId}`,
    questions: (sessionId: string) => `${API_BASE_URL}/api/v1/data/${sessionId}/questions`,
    answers: (sessionId: string) => `${API_BASE_URL}/api/v1/data/${sessionId}/answers`,
  },
} as const;

/**
 * Helper for making API requests with common config.
 */
export async function apiFetch(url: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `API Error: ${res.status}`);
  }

  return res.json();
}

/**
 * Helper for uploading files (multipart/form-data).
 */
export async function apiUpload(url: string, file: File, fieldName = "file") {
  const formData = new FormData();
  formData.append(fieldName, file);

  const res = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `Upload Error: ${res.status}`);
  }

  return res.json();
}
