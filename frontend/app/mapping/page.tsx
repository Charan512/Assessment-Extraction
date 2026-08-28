"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import {
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  Minus, Plus, ArrowRight, Loader2, AlertCircle, X,
  Sun, Wind, Droplets, Leaf,
} from "lucide-react";
import { API, apiFetch, QuestionResponse, AnswerResponse, MappingResponse } from "@/lib/api";
import { getSession } from "@/lib/session";

const ANSWERS_PER_PAGE = 3;

// Shows total available marks for a question (not awarded — grading hasn't run yet)
function MarksLabel({ total }: { total: number }) {
  if (!total) return null;
  return (
    <span style={{
      backgroundColor: "#F3F4F6", color: "#6B7280",
      borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 600,
    }}>
      {total} mk
    </span>
  );
}

// Inline toast for non-fatal errors
function ErrorToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div style={{
      position: "fixed", bottom: 96, left: "50%", transform: "translateX(-50%)",
      backgroundColor: "#1A1A1A", color: "#fff",
      borderRadius: 12, padding: "12px 20px",
      display: "flex", alignItems: "center", gap: 12,
      fontSize: 14, boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
      zIndex: 50, maxWidth: 420,
    }}>
      <AlertCircle size={16} color="#EF4444" />
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onDismiss} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", display: "flex", alignItems: "center" }}>
        <X size={14} />
      </button>
    </div>
  );
}

export default function MappingPage() {
  const router = useRouter();

  const [questions, setQuestions] = useState<QuestionResponse[]>([]);
  const [answers, setAnswers] = useState<AnswerResponse[]>([]);
  const [mappings, setMappings] = useState<MappingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [gradingError, setGradingError] = useState<string | null>(null);
  const [grading, setGrading] = useState(false);

  const [activeQ, setActiveQ] = useState(0);
  const [expandAll, setExpandAll] = useState(false);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    const sessionId = getSession();
    if (!sessionId) {
      setLoadError("No session found. Please upload files first.");
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const [qs, ans] = await Promise.all([
          apiFetch<QuestionResponse[]>(API.data.questions(sessionId)),
          apiFetch<AnswerResponse[]>(API.data.answers(sessionId)),
        ]);

        // Guard: must have data from extraction step
        if (qs.length === 0) {
          setLoadError("No questions found. Please complete the extraction step first.");
          setLoading(false);
          return;
        }

        setQuestions(qs);
        setAnswers(ans);

        // Auto-match answers to questions
        const mapResult = await apiFetch<{ mappings: MappingResponse[] }>(
          `${API.mapping.matchAnswers}?session_id=${sessionId}`,
          { method: "POST" }
        );
        setMappings(mapResult.mappings);
      } catch (err: unknown) {
        setLoadError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const getMappedAnswer = (questionId: string): AnswerResponse | null => {
    const mapping = mappings.find((m) => m.question_id === questionId);
    if (!mapping) return null;
    return answers.find((a) => a.id === mapping.answer_id) || null;
  };

  const handleGenerateGrading = async () => {
    const sessionId = getSession();
    if (!sessionId) return;
    setGrading(true);
    setGradingError(null);
    try {
      await apiFetch(`${API.grading.evaluate}?session_id=${sessionId}`, { method: "POST" });
      router.push("/results");
    } catch (err: unknown) {
      // Show inline toast, do NOT replace the entire mapping UI
      setGradingError(err instanceof Error ? err.message : "Grading failed. Please try again.");
      setGrading(false);
    }
  };

  // Pagination
  const totalPages = Math.max(1, Math.ceil(answers.length / ANSWERS_PER_PAGE));
  const pagedAnswers = answers.slice((page - 1) * ANSWERS_PER_PAGE, page * ANSWERS_PER_PAGE);

  const activeQuestion = questions[activeQ] || null;
  const activeAnswer = activeQuestion ? getMappedAnswer(activeQuestion.id) : null;

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#F0F0F0" }}>
        <div style={{ textAlign: "center" }}>
          <Loader2 size={40} color="#E85D26" style={{ animation: "spin 1s linear infinite", marginBottom: 16 }} />
          <p style={{ color: "#6B7280", fontSize: 15 }}>Loading questions &amp; answers…</p>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#F0F0F0" }}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <AlertCircle size={40} color="#EF4444" />
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1A1A1A", margin: "12px 0 8px" }}>Something went wrong</h2>
          <p style={{ color: "#6B7280", maxWidth: 360, margin: "0 auto 20px" }}>{loadError}</p>
          <button onClick={() => router.push("/")} style={{ padding: "12px 28px", backgroundColor: "#1A1A1A", color: "#fff", border: "none", borderRadius: 50, cursor: "pointer", fontWeight: 600 }}>
            ← Start Over
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#F0F0F0" }}>
      <Sidebar />
      <div style={{ marginLeft: 260, flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <TopBar backLabel="Exams" />

        <div style={{ display: "flex", flex: 1, overflow: "hidden", height: "calc(100vh - 60px)" }}>

          {/* LEFT: Questions panel */}
          <div style={{ width: 480, backgroundColor: "#FFFFFF", borderRight: "1px solid #E5E5E5", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #F3F4F6" }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: "#1A1A1A" }}>
                Extracted Questions ({questions.length})
              </span>
              <button
                onClick={() => setExpandAll(!expandAll)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#6B7280", fontWeight: 500 }}
              >
                {expandAll ? "Collapse All" : "Expand All"}
              </button>
            </div>

            <div style={{ overflowY: "auto", flex: 1 }}>
              {questions.map((q, i) => {
                const isActive = i === activeQ;
                const isExpanded = isActive || expandAll;
                const mappedAnswer = getMappedAnswer(q.id);

                return (
                  <div
                    key={q.id}
                    onClick={() => setActiveQ(i)}
                    style={{
                      padding: "14px 20px",
                      borderBottom: "1px solid #F3F4F6",
                      cursor: "pointer",
                      backgroundColor: isActive ? "#FFF7F5" : "transparent",
                      transition: "background-color 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                        backgroundColor: isActive ? "#E85D26" : "#1A1A1A",
                        color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: 700,
                      }}>{q.question_number || i + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                          <span style={{ fontSize: 13, color: "#1A1A1A", lineHeight: 1.5, flex: 1 }}>{q.text}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                            {/* Show marks available — NOT awarded (grading hasn't run yet) */}
                            <MarksLabel total={q.marks || 0} />
                            {isActive ? <ChevronUp size={14} color="#E85D26" /> : <ChevronDown size={14} color="#9CA3AF" />}
                          </div>
                        </div>
                        {isExpanded && mappedAnswer && (
                          <div style={{ marginTop: 10, padding: "10px 14px", backgroundColor: "#FFF7F5", border: "1px solid #E85D26", borderRadius: 8 }}>
                            <div style={{ fontWeight: 700, fontSize: 12, color: "#E85D26", marginBottom: 4 }}>Mapped Answer</div>
                            <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.5 }}>
                              {mappedAnswer.text.slice(0, 200)}{mappedAnswer.text.length > 200 ? "…" : ""}
                            </div>
                          </div>
                        )}
                        {isExpanded && !mappedAnswer && (
                          <div style={{ marginTop: 8, fontSize: 12, color: "#9CA3AF", fontStyle: "italic" }}>No answer mapped for this question.</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Answer viewer */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", backgroundColor: "#FFFFFF", borderBottom: "1px solid #E5E5E5" }}>
              <span style={{ fontWeight: 600, fontSize: 14, color: "#1A1A1A" }}>Answer Sheet</span>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                {/* Zoom — now functional */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#6B7280" }}>
                  <button
                    onClick={() => setZoom(z => Math.max(50, z - 10))}
                    style={{ background: "none", border: "1px solid #E5E5E5", borderRadius: 4, padding: "2px 8px", cursor: "pointer", display: "flex", alignItems: "center" }}
                  >
                    <Minus size={12} />
                  </button>
                  <span style={{ fontWeight: 600, color: "#1A1A1A", minWidth: 38, textAlign: "center" }}>{zoom}%</span>
                  <button
                    onClick={() => setZoom(z => Math.min(200, z + 10))}
                    style={{ background: "none", border: "1px solid #E5E5E5", borderRadius: 4, padding: "2px 8px", cursor: "pointer", display: "flex", alignItems: "center" }}
                  >
                    <Plus size={12} />
                  </button>
                </div>
                {/* Pagination — now functional */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{ background: "none", border: "none", cursor: page === 1 ? "not-allowed" : "pointer", color: page === 1 ? "#D1D5DB" : "#6B7280", display: "flex", alignItems: "center" }}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span style={{ color: "#6B7280" }}>Page {page} of {totalPages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    style={{ background: "none", border: "none", cursor: page === totalPages ? "not-allowed" : "pointer", color: page === totalPages ? "#D1D5DB" : "#6B7280", display: "flex", alignItems: "center" }}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 24, backgroundColor: "#E8E8E8", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{
                backgroundColor: "#FFFFFF",
                width: `${zoom}%`, maxWidth: 680, minHeight: 900,
                borderRadius: 4, padding: "40px 48px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.12)", fontFamily: "'Georgia', serif", lineHeight: 1.9,
                transition: "width 0.2s ease",
              }}>
                <div style={{ fontSize: 14, color: "#1A1A1A" }}>
                  {/* Active answer highlighted */}
                  {activeAnswer && (
                    <div style={{ border: "2px solid #22C55E", borderRadius: 4, padding: "12px", marginBottom: 16, backgroundColor: "#F0FDF4" }}>
                      <strong style={{ color: "#059669", fontSize: 12 }}>
                        ✓ Answer for Q{activeQuestion?.question_number}
                      </strong>
                      <p style={{ margin: "8px 0 0", fontStyle: "italic", whiteSpace: "pre-wrap", fontSize: 13 }}>
                        {activeAnswer.text || "(No text extracted)"}
                      </p>
                      {activeAnswer.confidence > 0 && (
                        <div style={{ fontSize: 11, color: "#6B7280", marginTop: 6 }}>
                          OCR confidence: {Math.round(activeAnswer.confidence * 100)}%
                        </div>
                      )}
                    </div>
                  )}

                  {/* Paginated answers (excluding the active one shown above) */}
                  {pagedAnswers
                    .filter((a) => a.id !== activeAnswer?.id)
                    .map((a, i) => (
                      <div key={a.id} style={{ border: "1px solid #E5E5E5", borderRadius: 4, padding: "8px 12px", marginBottom: 10, backgroundColor: "transparent" }}>
                        <strong style={{ color: "#374151", fontSize: 12 }}>
                          {a.question_label_found ? `Q${a.question_label_found}` : `Answer ${(page - 1) * ANSWERS_PER_PAGE + i + 1}`}
                        </strong>
                        <p style={{ margin: "4px 0", fontStyle: "italic", color: "#6B7280", fontSize: 13 }}>
                          {a.text.slice(0, 150)}{a.text.length > 150 ? "…" : ""}
                        </p>
                      </div>
                    ))}

                  {answers.length === 0 && (
                    <div style={{ textAlign: "center", padding: "60px 0", color: "#9CA3AF" }}>
                      <div style={{ display: "inline-flex", gap: 24, marginBottom: 16 }}>
                        <div style={{ textAlign: "center" }}><Sun size={24} color="#F59E0B" /><br/><span style={{ fontSize: 11 }}>Sunlight</span></div>
                        <div style={{ textAlign: "center" }}><Wind size={24} color="#6B7280" /><br/><span style={{ fontSize: 11 }}>CO₂</span></div>
                        <div style={{ textAlign: "center" }}><Droplets size={24} color="#3B82F6" /><br/><span style={{ fontSize: 11 }}>Water</span></div>
                        <div style={{ textAlign: "center" }}><Leaf size={24} color="#22C55E" /><br/><span style={{ fontSize: 11 }}>O₂</span></div>
                      </div>
                      <p>No answers extracted yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom action bar */}
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 20 }}>
          <button
            onClick={handleGenerateGrading}
            disabled={grading || questions.length === 0}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              backgroundColor: questions.length === 0 ? "#D1D5DB" : "#1A1A1A",
              color: "#fff", border: "none", borderRadius: 50,
              padding: "14px 32px", fontSize: 16, fontWeight: 600,
              cursor: questions.length === 0 ? "not-allowed" : "pointer",
              boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
            }}
          >
            {grading
              ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Grading…</>
              : <>Generate Grading <ArrowRight size={18} /></>}
          </button>
        </div>
      </div>

      {/* Inline toast for grading errors — does NOT replace the page */}
      {gradingError && (
        <ErrorToast message={gradingError} onDismiss={() => setGradingError(null)} />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
