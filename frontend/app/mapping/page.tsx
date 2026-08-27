"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Minus, Plus, ArrowRight, Sun, Wind, Droplets, Leaf } from "lucide-react";

// --- Sample data matching Figma ---
const QUESTIONS = [
  { id: 1, text: "Which blood vessel carries blood away from the heart?", marks: "2/2", awarded: 2, total: 2 },
  { id: 2, text: "Which of the following organelles is primarily involved in photosynthesis?", marks: "2/2", awarded: 2, total: 2, feedback: "Excellent work! You correctly identified the chloroplast as the organelle responsible for photosynthesis. Keep it up!" },
  { id: 3, text: "Explain the role of chloroplasts in photosynthesis, naming the main pigments involved and briefly outlining the two major stages of the process.", marks: "2/2", awarded: 2, total: 2 },
  { id: 4, text: "Describe the flow of blood through the human heart starting from the right atrium and ending at the aorta; include the names of valves crossed.", marks: "0/2", awarded: 0, total: 2 },
  { id: 5, text: "Draw a labelled diagram of an alveolus showing capillaries and air space (label alveolar sac, capillary, and direction of gas exchange).", marks: "2/3", awarded: 2, total: 3 },
  { id: 6, text: "Draw a neat labelled diagram of the human digestive system (stomach, small intestine, large intestine, liver, pancreas) and label the site where most absorption occurs.", marks: "4/5", awarded: 4, total: 5 },
  { id: 7, text: "Draw and label a nephron (Bowman's capsule, glomerulus, proximal tubule, loop of Henle, distal tubule, collecting duct).", marks: "5/5", awarded: 5, total: 5 },
  { id: 8, text: "Explain the structural differences between palisade mesophyll and spongy mesophyll and state how each structure aids its function in the leaf.", marks: "3/5", awarded: 3, total: 5 },
  { id: 9, text: "Describe the process of transpiration in plants in two to three sentences and name two environmental factors that increase its rate.", marks: "5/5", awarded: 5, total: 5 },
  { id: 10, text: "Explain how the structure of xylem vessels facilitates water transport in plants (mention one structural feature and its role).", marks: "4/5", awarded: 4, total: 5 },
  { id: 11, text: "A diagram shows two potted plants – Plant A in bright light with broad green leaves, Plant B in dim light with pale, elongated leaves.", marks: "2/2", awarded: 2, total: 2 },
  { id: 12, text: "A resting person has tidal volume (air per breath) of 0.5 L and breathes 12 times per minute.", marks: "4/5", awarded: 4, total: 5 },
  { id: 13, text: "If dead space is 0.15 L per breath, calculate the alveolar ventilation rate. Show working.", marks: "4/5", awarded: 4, total: 5 },
];

function MarksTag({ text, awarded, total }: { text: string; awarded: number; total: number }) {
  const color = awarded === total ? "#E85D26" : awarded === 0 ? "#EF4444" : "#F59E0B";
  return (
    <span style={{
      backgroundColor: `${color}15`,
      color: color,
      borderRadius: 6, padding: "2px 8px",
      fontSize: 13, fontWeight: 700,
    }}>{text}</span>
  );
}

export default function MappingPage() {
  const router = useRouter();
  const [activeQ, setActiveQ] = useState(2); // 0-indexed
  const [expandAll, setExpandAll] = useState(false);
  const [page, setPage] = useState(1);
  const totalPages = 4;

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#F0F0F0" }}>
      <Sidebar />
      <div style={{ marginLeft: 260, flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <TopBar backLabel="Exams" />

        {/* Main split layout */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden", height: "calc(100vh - 60px)" }}>

          {/* LEFT: Questions panel */}
          <div style={{
            width: 480, backgroundColor: "#FFFFFF",
            borderRight: "1px solid #E5E5E5",
            display: "flex", flexDirection: "column",
            overflow: "hidden",
          }}>
            {/* Panel header */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "16px 20px", borderBottom: "1px solid #F3F4F6",
            }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: "#1A1A1A" }}>
                Extracted Questions (from question paper)
              </span>
              <button
                onClick={() => setExpandAll(!expandAll)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#6B7280", fontWeight: 500 }}
              >
                {expandAll ? "Collapse All" : "Expand All"}
              </button>
            </div>

            {/* Questions list */}
            <div style={{ overflowY: "auto", flex: 1 }}>
              {QUESTIONS.map((q, i) => {
                const isActive = i === activeQ;
                const isExpanded = isActive || expandAll;
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
                      {/* Number badge */}
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                        backgroundColor: isActive ? "#E85D26" : "#1A1A1A",
                        color: "#fff", display: "flex",
                        alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 700,
                      }}>{q.id}</div>
                      {/* Question text + marks */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                          <span style={{ fontSize: 13, color: "#1A1A1A", lineHeight: 1.5, flex: 1 }}>{q.text}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                            <MarksTag text={q.marks} awarded={q.awarded} total={q.total} />
                            {isActive ? <ChevronUp size={14} color="#E85D26" /> : <ChevronDown size={14} color="#9CA3AF" />}
                          </div>
                        </div>

                        {/* Expanded: AI Feedback */}
                        {isExpanded && q.feedback && (
                          <div style={{
                            marginTop: 10, padding: "10px 14px",
                            backgroundColor: "#FFF7F5",
                            border: "1px solid #E85D26",
                            borderRadius: 8,
                          }}>
                            <div style={{ fontWeight: 700, fontSize: 12, color: "#E85D26", marginBottom: 4 }}>AI Feedback</div>
                            <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.5 }}>{q.feedback}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Answer Sheet viewer */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Answer sheet toolbar */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 20px", backgroundColor: "#FFFFFF",
              borderBottom: "1px solid #E5E5E5",
            }}>
              <span style={{ fontWeight: 600, fontSize: 14, color: "#1A1A1A" }}>Answer Sheet</span>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#6B7280" }}>
                  <button style={{ background: "none", border: "1px solid #E5E5E5", borderRadius: 4, padding: "2px 8px", cursor: "pointer", display: "flex", alignItems: "center" }}>
                    <Minus size={12} />
                  </button>
                  <span style={{ fontWeight: 600, color: "#1A1A1A" }}>100%</span>
                  <button style={{ background: "none", border: "1px solid #E5E5E5", borderRadius: 4, padding: "2px 8px", cursor: "pointer", display: "flex", alignItems: "center" }}>
                    <Plus size={12} />
                  </button>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <button onClick={() => setPage(p => Math.max(1, p-1))} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280", display: "flex", alignItems: "center" }}>
                    <ChevronLeft size={14} />
                  </button>
                  <span style={{ color: "#6B7280" }}>Page {page} of {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p+1))} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280", display: "flex", alignItems: "center" }}>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Answer sheet content */}
            <div style={{
              flex: 1, overflowY: "auto",
              padding: 24,
              backgroundColor: "#E8E8E8",
              display: "flex", flexDirection: "column", gap: 0, alignItems: "center",
            }}>
              <div style={{
                backgroundColor: "#FFFFFF",
                width: "100%", maxWidth: 680,
                minHeight: 900,
                borderRadius: 4,
                padding: "40px 48px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
                position: "relative",
                fontFamily: "'Georgia', serif",
                lineHeight: 1.9,
              }}>
                {/* Simulate handwritten answer sheet with bounding boxes */}
                <div style={{ fontSize: 14, color: "#1A1A1A" }}>
                  {/* Q1 - highlighted if active q is 0 */}
                  <div style={{
                    border: activeQ === 0 ? "2px solid #22C55E" : "transparent",
                    borderRadius: 4, padding: "8px", marginBottom: 12,
                    backgroundColor: activeQ === 0 ? "#F0FDF4" : "transparent",
                  }}>
                    <strong style={{ color: "#374151" }}>Q1.</strong>
                    <p style={{ margin: "4px 0", fontStyle: "italic" }}>
                      Photosynthesis is the process used by green plants and some other organisms to convert light energy into chemical energy.
                    </p>
                    <div style={{ textAlign: "center", padding: "12px 0", fontFamily: "monospace", fontSize: 13 }}>
                      6CO₂ + 6H₂O <span style={{ color: "#22C55E" }}>→</span> C₆H₁₂O₆ + 6O₂<br/>
                      <span style={{ color: "#6B7280" }}>Chlorophyll</span>
                    </div>
                    <div style={{ textAlign: "center", padding: "12px 0" }}>
                      {/* Diagram icons */}
                      <div style={{ display: "inline-flex", gap: 24 }}>
                        <div style={{ textAlign: "center" }}><Sun size={24} color="#F59E0B" /><br/><span style={{ fontSize: 11 }}>Sunlight</span></div>
                        <div style={{ textAlign: "center" }}><Wind size={24} color="#6B7280" /><br/><span style={{ fontSize: 11 }}>Carbon dioxide</span></div>
                        <div style={{ textAlign: "center" }}><Droplets size={24} color="#3B82F6" /><br/><span style={{ fontSize: 11 }}>Water</span></div>
                        <div style={{ textAlign: "center" }}><Leaf size={24} color="#22C55E" /><br/><span style={{ fontSize: 11 }}>Oxygen</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Q2 - highlighted if active */}
                  <div style={{
                    border: activeQ === 1 ? "2px solid #22C55E" : "1px solid #E5E5E5",
                    borderRadius: 4, padding: "8px", marginBottom: 12,
                    backgroundColor: activeQ === 1 ? "#F0FDF4" : "transparent",
                  }}>
                    <strong>Q2.</strong>
                    <p style={{ margin: "4px 0", fontStyle: "italic" }}>
                      The process mainly occurs in the chloroplast of the plant cell. It has two main stages:
                    </p>
                    <ol style={{ margin: "4px 0 4px 20px", fontSize: 13 }}>
                      <li>Light reaction — Captures light energy.</li>
                      <li>Dark reaction — Uses energy to make glucose.</li>
                    </ol>
                  </div>

                  {/* Q3 */}
                  <div style={{
                    border: activeQ === 2 ? "2px solid #22C55E" : "1px solid #E5E5E5",
                    borderRadius: 4, padding: "8px", marginBottom: 12,
                    backgroundColor: activeQ === 2 ? "#F0FDF4" : "transparent",
                  }}>
                    <strong>Q3.</strong>
                    <p style={{ margin: "4px 0", fontStyle: "italic" }}>
                      Chloroplasts contain chlorophyll (green) and carotenoids (yellow/orange). The two major stages are:
                      the light-dependent reactions (in thylakoid) and the Calvin cycle (in stroma).
                    </p>
                  </div>

                  {/* Remaining questions as faint lines */}
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} style={{
                      height: 80, borderBottom: "1px solid #F3F4F6",
                      display: "flex", alignItems: "center", paddingLeft: 8,
                      color: "#9CA3AF", fontSize: 13, fontStyle: "italic",
                    }}>
                      <strong style={{ color: "#374151", marginRight: 8 }}>Q{i + 4}.</strong>
                      [Student answer {i + 4}...]
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom action bar */}
        <div style={{
          position: "fixed", bottom: 24, left: "50%",
          transform: "translateX(-50%)",
          zIndex: 20,
        }}>
          <button
            onClick={() => router.push("/results")}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              backgroundColor: "#1A1A1A", color: "#fff",
              border: "none", borderRadius: 50,
              padding: "14px 32px", fontSize: 16, fontWeight: 600,
              cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
            }}
          >
            Generate Grading <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
