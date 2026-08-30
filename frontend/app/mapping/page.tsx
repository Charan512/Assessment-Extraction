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

function BoundingBoxOverlay({ box, isActive, qNumber, imageNaturalWidth, imageNaturalHeight }: { box: any, isActive: boolean, qNumber?: string, imageNaturalWidth: number, imageNaturalHeight: number }) {
  if (!imageNaturalWidth || !imageNaturalHeight) return null;
  
  // Calculate percentages relative to natural image size
  const left = (box.x / imageNaturalWidth) * 100;
  const top = (box.y / imageNaturalHeight) * 100;
  const width = (box.width / imageNaturalWidth) * 100;
  const height = (box.height / imageNaturalHeight) * 100;

  return (
    <div style={{
      position: "absolute",
      left: `${left}%`, top: `${top}%`,
      width: `${width}%`, height: `${height}%`,
      border: isActive ? "3px solid #22C55E" : "1px solid rgba(34, 197, 94, 0.4)",
      backgroundColor: isActive ? "rgba(34, 197, 94, 0.15)" : "transparent",
      pointerEvents: "none",
      transition: "all 0.2s ease"
    }}>
      {isActive && qNumber && (
        <div style={{
            position: "absolute", top: -28, left: -3, 
            backgroundColor: "#22C55E", color: "#fff", 
            padding: "4px 12px", fontSize: 13, fontWeight: 700, 
            borderTopLeftRadius: 6, borderTopRightRadius: 6,
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
        }}>
          Q{qNumber}
        </div>
      )}
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
  const [imgDims, setImgDims] = useState({ width: 0, height: 0 });

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
          <div style={{ width: 480, backgroundColor: "#F9FAFB", borderRight: "1px solid #E5E5E5", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #E5E5E5", backgroundColor: "#FFFFFF" }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: "#1A1A1A", display: "inline-block", position: "relative" }}>
                Extracted Questions (from question paper)
                <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: 6, backgroundColor: "#F472B6", opacity: 0.4, zIndex: 0 }}></div>
              </span>
              <button
                onClick={() => setExpandAll(!expandAll)}
                style={{ background: "#FFFFFF", border: "1px solid #E5E5E5", borderRadius: 20, padding: "4px 12px", cursor: "pointer", fontSize: 12, color: "#1A1A1A", fontWeight: 600, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}
              >
                {expandAll ? "Collapse All" : "Expand All"}
              </button>
            </div>

            <div style={{ overflowY: "auto", flex: 1, padding: "16px 20px" }}>
              {questions.map((q, i) => {
                const isActive = i === activeQ;
                const isExpanded = isActive || expandAll;
                const mappedAnswer = getMappedAnswer(q.id);

                return (
                  <div
                    key={q.id}
                    onClick={() => setActiveQ(i)}
                    style={{
                      padding: "16px",
                      marginBottom: 12,
                      borderRadius: 12,
                      border: isActive ? "2px solid #E85D26" : "1px solid #E5E5E5",
                      cursor: "pointer",
                      backgroundColor: "#FFFFFF",
                      transition: "all 0.15s ease",
                      boxShadow: isActive ? "0 4px 12px rgba(232, 93, 38, 0.1)" : "0 1px 3px rgba(0,0,0,0.05)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                        backgroundColor: isActive ? "#E85D26" : "#4B5563",
                        color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 700,
                      }}>{q.question_number || i + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                          <span style={{ fontSize: 13, color: "#1F2937", lineHeight: 1.5, flex: 1, fontWeight: 500 }}>{q.text}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                            {/* Show marks available — NOT awarded (grading hasn't run yet) */}
                            <MarksLabel total={q.marks || 0} />
                            {isActive ? <ChevronUp size={16} color="#E85D26" /> : <ChevronDown size={16} color="#9CA3AF" />}
                          </div>
                        </div>
                        {isExpanded && mappedAnswer && (
                          <div style={{ marginTop: 16, padding: "12px 16px", backgroundColor: "#FFF7F5", border: "1px solid rgba(232, 93, 38, 0.3)", borderRadius: 8 }}>
                            <div style={{ fontWeight: 700, fontSize: 12, color: "#E85D26", marginBottom: 6 }}>Mapped Answer (OCR Text)</div>
                            <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6, fontStyle: "italic" }}>
                              "{mappedAnswer.text.slice(0, 200)}{mappedAnswer.text.length > 200 ? "…" : ""}"
                            </div>
                          </div>
                        )}
                        {isExpanded && !mappedAnswer && (
                          <div style={{ marginTop: 12, fontSize: 13, color: "#9CA3AF", fontStyle: "italic" }}>No answer mapped for this question.</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Answer viewer */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", backgroundColor: "#1E1E1E" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", backgroundColor: "#2D2D2D", borderBottom: "1px solid #404040", color: "#FFFFFF" }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Answer Sheet</span>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                {/* Zoom */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, backgroundColor: "#404040", padding: "4px", borderRadius: 6 }}>
                  <button
                    onClick={() => setZoom(z => Math.max(50, z - 10))}
                    style={{ background: "none", border: "none", color: "#A3A3A3", cursor: "pointer", display: "flex", alignItems: "center", padding: 4 }}
                  >
                    <Minus size={14} />
                  </button>
                  <span style={{ fontWeight: 600, color: "#FFFFFF", minWidth: 42, textAlign: "center" }}>{zoom}%</span>
                  <button
                    onClick={() => setZoom(z => Math.min(200, z + 10))}
                    style={{ background: "none", border: "none", color: "#A3A3A3", cursor: "pointer", display: "flex", alignItems: "center", padding: 4 }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
                {/* Pagination */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, backgroundColor: "#404040", padding: "4px 8px", borderRadius: 6 }}>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{ background: "none", border: "none", cursor: page === 1 ? "not-allowed" : "pointer", color: page === 1 ? "#737373" : "#FFFFFF", display: "flex", alignItems: "center" }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ color: "#FFFFFF", fontWeight: 500, minWidth: 80, textAlign: "center" }}>Page {page} of 4</span>
                  <button
                    onClick={() => setPage(p => Math.min(4, p + 1))}
                    disabled={page === 4}
                    style={{ background: "none", border: "none", cursor: page === 4 ? "not-allowed" : "pointer", color: page === 4 ? "#737373" : "#FFFFFF", display: "flex", alignItems: "center" }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div style={{ flex: 1, overflow: "auto", padding: 40, display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
              <div style={{ 
                position: "relative", 
                transform: `scale(${zoom / 100})`, 
                transformOrigin: "top center", 
                transition: "transform 0.2s ease",
                backgroundColor: "#FFFFFF",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)"
              }}>
                <img 
                  src={API.data.image(getSession()!, page)} 
                  alt={`Answer Sheet Page ${page}`}
                  style={{ display: "block", maxWidth: "100%", height: "auto", width: 800 }}
                  onLoad={(e) => setImgDims({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })}
                  id="answer-sheet-image"
                />
                
                {/* Overlays for bounding boxes */}
                {answers.filter(a => a.page_numbers.includes(page)).map(a => {
                  const boxes = a.bounding_boxes.filter(b => b.page_number === page);
                  const isMappedToActive = a.id === activeAnswer?.id;
                  
                  return boxes.map((box, i) => (
                    <BoundingBoxOverlay 
                      key={`${a.id}-${i}`} 
                      box={box} 
                      isActive={isMappedToActive} 
                      qNumber={activeQuestion?.question_number}
                      imageNaturalWidth={imgDims.width}
                      imageNaturalHeight={imgDims.height}
                    />
                  ));
                })}
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
