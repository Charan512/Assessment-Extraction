/**
 * Centralized API configuration and typed fetch helpers.
 * All API calls must go through this module — no hardcoded URLs elsewhere.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Default timeout for all API calls (5 minutes — OCR can be slow)
const DEFAULT_TIMEOUT_MS = 300_000;

// ─── Endpoint map ────────────────────────────────────────────────────────────

export const API = {
  baseUrl: API_BASE_URL,

  upload: {
    session:       `${API_BASE_URL}/api/v1/upload/session`,
    questionPaper: `${API_BASE_URL}/api/v1/upload/question-paper`,
    answerSheet:   `${API_BASE_URL}/api/v1/upload/answer-sheet`,
    status:        (sid: string) => `${API_BASE_URL}/api/v1/upload/status/${sid}`,
  },

  extraction: {
    questions: `${API_BASE_URL}/api/v1/extraction/questions`,
    answers:   `${API_BASE_URL}/api/v1/extraction/answers`,
    status:    (sid: string) => `${API_BASE_URL}/api/v1/extraction/status/${sid}`,
  },

  mapping: {
    matchAnswers: `${API_BASE_URL}/api/v1/mapping/match-answers`,
    verify:       (sid: string) => `${API_BASE_URL}/api/v1/mapping/verify/${sid}`,
  },

  grading: {
    evaluate:         `${API_BASE_URL}/api/v1/grading/evaluate`,
    evaluateQuestion: `${API_BASE_URL}/api/v1/grading/evaluate-question`,
  },

  data: {
    questions: (sid: string) => `${API_BASE_URL}/api/v1/data/questions/${sid}`,
    answers:   (sid: string) => `${API_BASE_URL}/api/v1/data/answers/${sid}`,
    mappings:  (sid: string) => `${API_BASE_URL}/api/v1/data/mapping/${sid}`,
    grading:   (sid: string) => `${API_BASE_URL}/api/v1/data/grading/${sid}`,
    image:     (sid: string, page: number) => `${API_BASE_URL}/api/v1/data/image/${sid}/${page}`,
  },
} as const;

// ─── TypeScript types matching backend schemas ────────────────────────────────

export interface SessionCreateResponse {
  session_id: string;
  created_at: string;
  message: string;
}

export interface FileUploadResponse {
  file_id: string;
  filename: string;
  file_type: string;
  page_count: number;
  file_size_bytes: number;
  preview_page_count: number;
  message: string;
}

export interface ExtractionStatusResponse {
  session_id: string;
  extraction_step: string;
  progress: number;
  questions_found: number;
  answers_found: number;
  error_message: string | null;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  page_number: number;
}

export interface QuestionResponse {
  id: string;
  question_number: string;
  text: string;
  page_number: number;
  bounding_box: BoundingBox | null;
  marks: number | null;
  has_sub_parts: boolean;
  sub_parts: QuestionResponse[];
  metadata: Record<string, unknown>;
}

export interface AnswerResponse {
  id: string;
  text: string;
  page_numbers: number[];
  bounding_boxes: BoundingBox[];
  question_label_found: string | null;
  confidence: number;
  metadata: Record<string, unknown>;
}

export interface MappingResponse {
  id: string;
  question_id: string;
  answer_id: string;
  confidence: number;
  mapping_method: string;
  metadata: Record<string, unknown>;
}

export interface GradingResultResponse {
  question_id: string;
  answer_id: string | null;
  question_number: string;
  question_text: string;
  answer_text: string | null;
  is_answered: boolean;
  marks_awarded: number;
  marks_total: number;
  percentage: number;
  evaluation: "correct" | "partial" | "incorrect" | "unanswered";
  feedback: string;
  confidence: number;
}

export interface GradingSummaryResponse {
  session_id: string;
  total_marks_awarded: number;
  total_marks_possible: number;
  percentage: number;
  grade: string;
  total_questions: number;
  answered_count: number;
  correct_count: number;
  partial_count: number;
  incorrect_count: number;
  unanswered_count: number;
  results: GradingResultResponse[];
}

// Union type used by /data/grading — backend may return {message} if not graded yet
export type GradingDataResponse =
  | {
      session_id: string;
      results: GradingResultResponse[];
      summary: {
        total_marks_awarded: number;
        total_marks_possible: number;
        percentage: number;
        grade: string;
        statistics: {
          correct: number;
          partial: number;
          incorrect: number;
          unanswered: number;
          total_questions: number;
        };
      };
    }
  | { message: string };

// ─── Fetch helpers ────────────────────────────────────────────────────────────

/**
 * Typed fetch with:
 * - Configurable timeout (default 5 minutes for slow OCR)
 * - Proper error extraction from FastAPI {detail: ...} shape
 * - Safe JSON parsing (handles 204 No Content / empty bodies)
 */
export async function apiFetch<T>(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;

  // AbortController for timeout
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json", ...fetchOptions.headers },
      ...fetchOptions,
      signal: controller.signal,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(error.detail || `API Error: ${res.status}`);
    }

    // Handle 204 No Content or empty body gracefully
    const text = await res.text();
    if (!text) return undefined as unknown as T;

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Invalid JSON response from server`);
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Request timed out. The server is taking too long — please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function apiUpload<T>(url: string, file: File, fieldName = "file"): Promise<T> {
  const formData = new FormData();
  formData.append(fieldName, file);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(url, { method: "POST", body: formData, signal: controller.signal });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(error.detail || `Upload Error: ${res.status}`);
    }
    return res.json() as Promise<T>;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Upload timed out. Please check your connection and try again.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
