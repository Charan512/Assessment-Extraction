"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { Check, Minus, X, HelpCircle, ChevronUp, ChevronDown, Loader2, AlertCircle } from "lucide-react";
import { API, apiFetch, GradingDataResponse, GradingResultResponse } from "@/lib/api";
import { getSession } from "@/lib/session";

function EvalBadge({ eval: ev }: { eval: string }) {
  const cfg: Record<string, { bg: string; color: string; label: string; icon: React.ReactNode }> = {
    correct:    { bg: "#D1FAE5", color: "#059669", label: "Correct",    icon: <Check size={12} /> },
    partial:    { bg: "#FEF3C7", color: "#D97706", label: "Partial",    icon: <Minus size={12} /> },
    incorrect:  { bg: "#FEE2E2", color: "#DC2626", label: "Incorrect",  icon: <X size={12} /> },
    unanswered: { bg: "#F3F4F6", color: "#6B7280", label: "Unanswered", icon: <HelpCircle size={12} /> },
  };
  const c = cfg[ev] || cfg.incorrect;
  return (
    <span style={{
      backgroundColor: c.bg, color: c.color,
      borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600,
      display: "inline-flex", alignItems: "center", gap: 4,
    }}>
      {c.icon} {c.label}
    </span>
  );
}

export default function ResultsPage() {
  const router = useRouter();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [data, setData] = useState<GradingDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sessionId = getSession();
    if (!sessionId) {
      setError("No session found. Please upload and grade files first.");
      setLoading(false);
      return;
    }

    apiFetch<GradingDataResponse>(API.data.grading(sessionId))
      .then((res) => {
        if ("message" in res) {
          setError("Grading has not been performed yet for this session.");
        } else {
          setData(res);
        }
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load results"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#F0F0F0" }}>
        <div style={{ textAlign: "center" }}>
          <Loader2 size={40} color="#E85D26" style={{ animation: "spin 1s linear infinite", marginBottom: 16 }} />
          <p style={{ color: "#6B7280", fontSize: 15 }}>Loading grading results…</p>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#F0F0F0" }}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <AlertCircle size={40} color="#EF4444" />
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1A1A1A", margin: "12px 0 8px" }}>Could Not Load Results</h2>
          <p style={{ color: "#6B7280", maxWidth: 360, margin: "0 auto 20px" }}>{error}</p>
          <button onClick={() => router.push("/")} style={{ padding: "12px 28px", backgroundColor: "#1A1A1A", color: "#fff", border: "none", borderRadius: 50, cursor: "pointer", fontWeight: 600 }}>
            ← Start Over
          </button>
        </div>
      </div>
    );
  }

  const { summary, results } = data;
  const { total_marks_awarded, total_marks_possible, percentage, grade } = summary;
  const { correct, partial, incorrect, unanswered } = summary.statistics;

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#F0F0F0" }}>
      <Sidebar />
      <div style={{ marginLeft: 260, flex: 1, display: "flex", flexDirection: "column" }}>
        <TopBar backLabel="Exams" />
        <main style={{ flex: 1, padding: "28px 32px" }}>

          {/* Summary Card */}
          <div style={{ backgroundColor: "#FFFFFF", borderRadius: 20, padding: "28px 32px", marginBottom: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 40, flexWrap: "wrap" }}>
              {/* Score */}
              <div>
                <div style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 4, fontWeight: 500 }}>Total Score</div>
                <div style={{ fontSize: 48, fontWeight: 800, color: "#1A1A1A", lineHeight: 1 }}>
                  {total_marks_awarded}
                  <span style={{ fontSize: 28, color: "#9CA3AF", fontWeight: 400 }}>/{total_marks_possible}</span>
                </div>
              </div>
              <div style={{ width: 1, height: 64, backgroundColor: "#E5E5E5" }} />
              {/* Percentage */}
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 4, fontWeight: 500 }}>Percentage</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: "#E85D26", backgroundColor: "#FDE8DF", borderRadius: 12, padding: "4px 16px" }}>
                  {Math.round(percentage)}%
                </div>
              </div>
              {/* Grade */}
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 4, fontWeight: 500 }}>Grade</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: "#1A1A1A", backgroundColor: "#F3F4F6", borderRadius: 12, padding: "4px 20px" }}>
                  {grade}
                </div>
              </div>
              <div style={{ width: 1, height: 64, backgroundColor: "#E5E5E5" }} />
              {/* Stats */}
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                {[
                  { label: "Correct",    val: correct,    color: "#059669", bg: "#D1FAE5" },
                  { label: "Partial",    val: partial,    color: "#D97706", bg: "#FEF3C7" },
                  { label: "Incorrect",  val: incorrect,  color: "#DC2626", bg: "#FEE2E2" },
                  { label: "Unanswered", val: unanswered, color: "#6B7280", bg: "#F3F4F6" },
                ].map((s) => (
                  <div key={s.label} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: s.color, backgroundColor: s.bg, borderRadius: 10, padding: "4px 14px" }}>{s.val}</div>
                    <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Per-question results */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {results.map((r: GradingResultResponse, i: number) => (
              <div key={r.question_id} style={{ backgroundColor: "#FFFFFF", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #F3F4F6" }}>
                {/* Row header */}
                <div
                  onClick={() => setExpanded(expanded === i ? null : i)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", cursor: "pointer" }}
                >
                  <div style={{ width: 30, height: 30, borderRadius: "50%", backgroundColor: "#1A1A1A", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                    {r.question_number || i + 1}
                  </div>
                  <span style={{ flex: 1, fontSize: 14, color: "#1A1A1A", fontWeight: 500 }}>
                    {r.question_text || `Question ${i + 1}`}
                  </span>
                  <EvalBadge eval={r.evaluation} />
                  <span style={{
                    fontSize: 14, fontWeight: 700,
                    color: r.marks_awarded === r.marks_total ? "#E85D26" : r.marks_awarded === 0 ? "#DC2626" : "#D97706",
                    marginLeft: 8, minWidth: 36,
                  }}>
                    {r.marks_awarded}/{r.marks_total}
                  </span>
                  {expanded === i ? <ChevronUp size={14} color="#9CA3AF" /> : <ChevronDown size={14} color="#9CA3AF" />}
                </div>

                {/* Expanded details */}
                {expanded === i && (
                  <div style={{ borderTop: "1px solid #F3F4F6", padding: "16px 20px 20px", backgroundColor: "#FAFAFA" }}>
                    <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 240 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Student&apos;s Answer</div>
                        <div style={{
                          backgroundColor: "#FFFFFF", borderRadius: 8, padding: "12px 14px",
                          border: "1px solid #E5E5E5", fontSize: 13,
                          lineHeight: 1.6,
                          fontStyle: r.evaluation === "unanswered" ? "italic" : "normal",
                          color: r.evaluation === "unanswered" ? "#9CA3AF" : "#374151",
                        }}>
                          {r.answer_text || "No answer provided."}
                        </div>
                      </div>
                      <div style={{ flex: 1, minWidth: 240 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#E85D26", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>AI Feedback</div>
                        <div style={{ backgroundColor: "#FFF7F5", borderRadius: 8, padding: "12px 14px", border: "1px solid #FECDB7", fontSize: 13, color: "#374151", lineHeight: 1.6 }}>
                          {r.feedback}
                        </div>
                        <div style={{ marginTop: 8, fontSize: 12, color: "#9CA3AF" }}>
                          Confidence: {Math.round(r.confidence * 100)}%
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </main>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
