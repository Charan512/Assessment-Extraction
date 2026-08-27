"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { Check, Minus, X, HelpCircle, ChevronUp, ChevronDown } from "lucide-react";

const RESULTS = [
  { id: 1, q: "Which blood vessel carries blood away from the heart?", answer: "The aorta carries blood away from the heart.", awarded: 2, total: 2, eval: "correct", feedback: "Perfect! The aorta is indeed the main artery that carries oxygenated blood away from the left ventricle." },
  { id: 2, q: "Which organelle is primarily involved in photosynthesis?", answer: "Chloroplast is primarily involved in photosynthesis.", awarded: 2, total: 2, eval: "correct", feedback: "Excellent work! You correctly identified the chloroplast as the organelle responsible for photosynthesis. Keep it up!" },
  { id: 3, q: "Explain the role of chloroplasts in photosynthesis, naming the main pigments involved and briefly outlining the two major stages of the process.", answer: "Chloroplasts contain chlorophyll and carotenoids. The two stages are light reactions and the Calvin cycle.", awarded: 2, total: 2, eval: "correct", feedback: "Good answer covering both pigments and stages." },
  { id: 4, q: "Describe the flow of blood through the human heart starting from the right atrium and ending at the aorta.", answer: "", awarded: 0, total: 2, eval: "unanswered", feedback: "No answer provided for this question." },
  { id: 5, q: "Draw a labelled diagram of an alveolus showing capillaries and air space.", answer: "[Diagram drawn - partially labelled]", awarded: 2, total: 3, eval: "partial", feedback: "Good diagram but missing the label for direction of gas exchange." },
  { id: 6, q: "Draw a neat labelled diagram of the human digestive system.", answer: "[Detailed diagram with labels]", awarded: 4, total: 5, eval: "partial", feedback: "Excellent diagram. The site of most absorption (small intestine) was mentioned but could be more specific." },
  { id: 7, q: "Draw and label a nephron.", answer: "[Complete nephron diagram with all parts]", awarded: 5, total: 5, eval: "correct", feedback: "Perfect! All parts of the nephron correctly labelled." },
  { id: 8, q: "Explain structural differences between palisade and spongy mesophyll.", answer: "Palisade mesophyll has tightly packed elongated cells for maximum light absorption. Spongy mesophyll has loosely packed cells with air spaces for gas exchange.", awarded: 3, total: 5, eval: "partial", feedback: "Good distinction but missed mentioning the chloroplast density difference." },
];

function EvalBadge({ eval: ev }: { eval: string }) {
  const cfg: Record<string, { bg: string; color: string; label: string; icon: React.ReactNode }> = {
    correct: { bg: "#D1FAE5", color: "#059669", label: "Correct", icon: <Check size={12} /> },
    partial: { bg: "#FEF3C7", color: "#D97706", label: "Partial", icon: <Minus size={12} /> },
    incorrect: { bg: "#FEE2E2", color: "#DC2626", label: "Incorrect", icon: <X size={12} /> },
    unanswered: { bg: "#F3F4F6", color: "#6B7280", label: "Unanswered", icon: <HelpCircle size={12} /> },
  };
  const c = cfg[ev] || cfg.incorrect;
  return (
    <span style={{
      backgroundColor: c.bg, color: c.color,
      borderRadius: 20, padding: "3px 10px",
      fontSize: 12, fontWeight: 600,
      display: "inline-flex", alignItems: "center", gap: 4,
    }}>
      {c.icon} {c.label}
    </span>
  );
}

export default function ResultsPage() {
  const [expanded, setExpanded] = useState<number | null>(null);

  const totalAwarded = RESULTS.reduce((s, r) => s + r.awarded, 0);
  const totalPossible = RESULTS.reduce((s, r) => s + r.total, 0);
  const pct = Math.round((totalAwarded / totalPossible) * 100);
  const grade = pct >= 90 ? "A" : pct >= 75 ? "B" : pct >= 60 ? "C" : pct >= 45 ? "D" : "F";
  const correct = RESULTS.filter(r => r.eval === "correct").length;
  const partial = RESULTS.filter(r => r.eval === "partial").length;
  const incorrect = RESULTS.filter(r => r.eval === "incorrect").length;
  const unanswered = RESULTS.filter(r => r.eval === "unanswered").length;

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#F0F0F0" }}>
      <Sidebar />
      <div style={{ marginLeft: 260, flex: 1, display: "flex", flexDirection: "column" }}>
        <TopBar backLabel="Exams" />
        <main style={{ flex: 1, padding: "28px 32px" }}>

          {/* Summary Card */}
          <div style={{
            backgroundColor: "#FFFFFF", borderRadius: 20, padding: "28px 32px",
            marginBottom: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 40, flexWrap: "wrap" }}>
              {/* Score */}
              <div>
                <div style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 4, fontWeight: 500 }}>Total Score</div>
                <div style={{ fontSize: 48, fontWeight: 800, color: "#1A1A1A", lineHeight: 1 }}>
                  {totalAwarded}
                  <span style={{ fontSize: 28, color: "#9CA3AF", fontWeight: 400 }}>/{totalPossible}</span>
                </div>
              </div>

              {/* Divider */}
              <div style={{ width: 1, height: 64, backgroundColor: "#E5E5E5" }} />

              {/* Percentage */}
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 4, fontWeight: 500 }}>Percentage</div>
                <div style={{
                  fontSize: 36, fontWeight: 800, color: "#E85D26",
                  backgroundColor: "#FDE8DF", borderRadius: 12,
                  padding: "4px 16px",
                }}>{pct}%</div>
              </div>

              {/* Grade */}
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 4, fontWeight: 500 }}>Grade</div>
                <div style={{
                  fontSize: 36, fontWeight: 800, color: "#1A1A1A",
                  backgroundColor: "#F3F4F6", borderRadius: 12,
                  padding: "4px 20px",
                }}>{grade}</div>
              </div>

              {/* Divider */}
              <div style={{ width: 1, height: 64, backgroundColor: "#E5E5E5" }} />

              {/* Stats */}
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                {[
                  { label: "Correct", val: correct, color: "#059669", bg: "#D1FAE5" },
                  { label: "Partial", val: partial, color: "#D97706", bg: "#FEF3C7" },
                  { label: "Incorrect", val: incorrect, color: "#DC2626", bg: "#FEE2E2" },
                  { label: "Unanswered", val: unanswered, color: "#6B7280", bg: "#F3F4F6" },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: "center" }}>
                    <div style={{
                      fontSize: 26, fontWeight: 800, color: s.color,
                      backgroundColor: s.bg, borderRadius: 10, padding: "4px 14px",
                    }}>{s.val}</div>
                    <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Per-question results */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {RESULTS.map((r, i) => (
              <div
                key={r.id}
                style={{
                  backgroundColor: "#FFFFFF", borderRadius: 14,
                  overflow: "hidden",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  border: "1px solid #F3F4F6",
                }}
              >
                {/* Row header */}
                <div
                  onClick={() => setExpanded(expanded === i ? null : i)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "14px 20px", cursor: "pointer",
                  }}
                >
                  {/* Number */}
                  <div style={{
                    width: 30, height: 30, borderRadius: "50%",
                    backgroundColor: "#1A1A1A", color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700, flexShrink: 0,
                  }}>{r.id}</div>

                  {/* Question */}
                  <span style={{ flex: 1, fontSize: 14, color: "#1A1A1A", fontWeight: 500 }}>{r.q}</span>

                  {/* Eval badge + marks */}
                  <EvalBadge eval={r.eval} />
                  <span style={{
                    fontSize: 14, fontWeight: 700, color: r.awarded === r.total ? "#E85D26" : r.awarded === 0 ? "#DC2626" : "#D97706",
                    marginLeft: 8, minWidth: 36,
                  }}>{r.awarded}/{r.total}</span>
                  {expanded === i ? <ChevronUp size={14} color="#9CA3AF" /> : <ChevronDown size={14} color="#9CA3AF" />}
                </div>

                {/* Expanded details */}
                {expanded === i && (
                  <div style={{
                    borderTop: "1px solid #F3F4F6",
                    padding: "16px 20px 20px",
                    backgroundColor: "#FAFAFA",
                  }}>
                    <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                      {/* Student Answer */}
                      <div style={{ flex: 1, minWidth: 240 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Student&apos;s Answer
                        </div>
                        <div style={{
                          backgroundColor: "#FFFFFF", borderRadius: 8, padding: "12px 14px",
                          border: "1px solid #E5E5E5", fontSize: 13,
                          lineHeight: 1.6, fontStyle: r.eval === "unanswered" ? "italic" : "normal",
                          color: r.eval === "unanswered" ? "#9CA3AF" : "#374151",
                        }}>
                          {r.answer || "No answer provided."}
                        </div>
                      </div>
                      {/* AI Feedback */}
                      <div style={{ flex: 1, minWidth: 240 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#E85D26", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          AI Feedback
                        </div>
                        <div style={{
                          backgroundColor: "#FFF7F5", borderRadius: 8, padding: "12px 14px",
                          border: "1px solid #FECDB7", fontSize: 13, color: "#374151",
                          lineHeight: 1.6,
                        }}>
                          {r.feedback}
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
    </div>
  );
}
