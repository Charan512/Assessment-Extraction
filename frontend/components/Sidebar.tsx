"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutGrid, MonitorSmartphone, FileText, ClipboardList,
  Clock, School, Sparkles, History, ChevronRight, X,
  BookOpen, Users, GraduationCap, CheckCircle2, AlertCircle,
} from "lucide-react";

// ─── Hardcoded "Exam History" data ───────────────────────────────────────────
const EXAM_HISTORY = [
  {
    id: 1,
    subject: "Mathematics — Algebra",
    class: "Class 10-A",
    date: "Aug 24, 2026",
    score: "87%",
    status: "graded",
    grade: "A",
    questions: 12,
  },
  {
    id: 2,
    subject: "Science — Photosynthesis",
    class: "Class 9-B",
    date: "Aug 21, 2026",
    score: "74%",
    status: "graded",
    grade: "B+",
    questions: 8,
  },
  {
    id: 3,
    subject: "English — Essay Writing",
    class: "Class 11-A",
    date: "Aug 18, 2026",
    score: "91%",
    status: "graded",
    grade: "A+",
    questions: 5,
  },
  {
    id: 4,
    subject: "History — World War II",
    class: "Class 10-B",
    date: "Aug 15, 2026",
    score: "68%",
    status: "graded",
    grade: "B",
    questions: 10,
  },
];

// ─── Classroom data ───────────────────────────────────────────────────────────
const CLASSROOM_DATA = [
  { id: 1, name: "Class 10-A", students: 34, subject: "Mathematics", exams: 6, color: "#E85D26" },
  { id: 2, name: "Class 9-B",  students: 38, subject: "Science",     exams: 4, color: "#1A1A1A" },
  { id: 3, name: "Class 11-A", students: 30, subject: "English",     exams: 3, color: "#7C3AED" },
  { id: 4, name: "Class 10-B", students: 36, subject: "History",     exams: 5, color: "#0891B2" },
];

// ─── Slide-over panel ─────────────────────────────────────────────────────────
function SlidePanel({
  open, onClose, title, children,
}: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.25)",
          zIndex: 100, backdropFilter: "blur(2px)",
        }}
      />
      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 480,
        backgroundColor: "#FFFFFF", zIndex: 101,
        boxShadow: "-4px 0 32px rgba(0,0,0,0.12)",
        display: "flex", flexDirection: "column",
        animation: "slideIn 0.25s ease",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px", borderBottom: "1px solid #F3F4F6",
        }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: "#1A1A1A" }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", display: "flex" }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {children}
        </div>
      </div>
      <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </>
  );
}

type Panel = "home" | "classroom" | "assignments" | "library" | null;

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [activePanel, setActivePanel] = useState<Panel>(null);

  // Determine which nav item is active based on current route
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const navItems = [
    {
      icon: <LayoutGrid size={18} />,
      label: "Home",
      href: "#home",
      action: () => setActivePanel("home"),
    },
    {
      icon: <MonitorSmartphone size={18} />,
      label: "My Classroom",
      href: "#classroom",
      action: () => setActivePanel("classroom"),
    },
    {
      icon: <FileText size={18} />,
      label: "Assignments",
      href: "#assignments",
      action: () => setActivePanel("assignments"),
    },
    {
      icon: <ClipboardList size={18} />,
      label: "Exams",
      href: "/",
      action: () => router.push("/"),
    },
    {
      icon: <Clock size={18} />,
      label: "My Library",
      href: "#library",
      action: () => setActivePanel("library"),
    },
  ];

  const gradeColor = (grade: string) => {
    if (grade.startsWith("A")) return { bg: "#D1FAE5", color: "#059669" };
    if (grade.startsWith("B")) return { bg: "#DBEAFE", color: "#1D4ED8" };
    return { bg: "#FEE2E2", color: "#DC2626" };
  };

  return (
    <>
      <aside style={{
        width: 260, minWidth: 260, height: "100vh",
        backgroundColor: "#FFFFFF", borderRight: "1px solid #E5E5E5",
        display: "flex", flexDirection: "column",
        padding: "24px 16px",
        position: "fixed", top: 0, left: 0, zIndex: 30,
      }}>
        {/* Logo */}
        <div
          onClick={() => router.push("/")}
          style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28, cursor: "pointer" }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: "linear-gradient(135deg, #1A1A1A 60%, #E85D26 100%)",
            color: "white", display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: 18, fontFamily: "Georgia, serif",
          }}>V</div>
          <span style={{ fontWeight: 700, fontSize: 18, color: "#1A1A1A" }}>VedaAI</span>
        </div>

        {/* AI Teacher's Toolkit pill */}
        <button
          onClick={() => setActivePanel("library")}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            backgroundColor: "#1A1A1A", color: "#fff",
            border: "none", borderRadius: 50, padding: "10px 16px",
            fontWeight: 600, fontSize: 14, cursor: "pointer",
            marginBottom: 28, width: "100%",
            transition: "background-color 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#E85D26")}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#1A1A1A")}
        >
          <Sparkles size={16} color="#E85D26" />
          AI Teacher&apos;s Toolkit
          <ChevronRight size={14} style={{ marginLeft: "auto" }} />
        </button>

        {/* Nav Items */}
        <nav style={{ flex: 1 }}>
          {navItems.map((item) => {
            const active = activePanel === null
              ? isActive(item.href) && !item.href.startsWith("#")
              : activePanel === item.href.replace("#", "");

            return (
              <button
                key={item.label}
                onClick={item.action}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: "10px 12px", borderRadius: 10,
                  border: "none", cursor: "pointer", textAlign: "left",
                  backgroundColor: active ? "#FFF3EE" : "transparent",
                  color: active ? "#E85D26" : "#6B7280",
                  fontWeight: active ? 600 : 400,
                  fontSize: 14, marginBottom: 2,
                  transition: "all 0.15s",
                  borderLeft: active ? "3px solid #E85D26" : "3px solid transparent",
                }}
                onMouseEnter={e => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = "#F9FAFB";
                    e.currentTarget.style.color = "#1A1A1A";
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "#6B7280";
                  }
                }}
              >
                <span style={{ width: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {item.icon}
                </span>
                {item.label}
                {item.href.startsWith("#") && (
                  <ChevronRight size={12} style={{ marginLeft: "auto", opacity: 0.4 }} />
                )}
              </button>
            );
          })}
        </nav>

        {/* Quick stats strip */}
        <div style={{
          backgroundColor: "#FFF3EE", borderRadius: 10, padding: "12px 14px",
          border: "1px solid #FECDB7", marginBottom: 12,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#E85D26", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            This Week
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {[
              { val: "4", label: "Exams graded" },
              { val: "127", label: "Answers" },
              { val: "82%", label: "Avg score" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#1A1A1A" }}>{s.val}</div>
                <div style={{ fontSize: 10, color: "#9CA3AF" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* School card */}
        <div style={{
          backgroundColor: "#F9FAFB", borderRadius: 12, padding: "14px 16px",
          border: "1px solid #E5E5E5", display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: "50%",
            backgroundColor: "#1A1A1A", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>
            <School size={18} color="#E85D26" />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: "#1A1A1A" }}>Delhi Public School</div>
            <div style={{ fontSize: 11, color: "#9CA3AF" }}>Bokaro Steel City</div>
          </div>
        </div>
      </aside>

      {/* ── Home Dashboard Panel ─────────────────────────────────────────────── */}
      <SlidePanel open={activePanel === "home"} onClose={() => setActivePanel(null)} title="Dashboard">
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 24, fontWeight: 800, color: "#1A1A1A", margin: 0 }}>Welcome back!</h3>
          <p style={{ fontSize: 13, color: "#9CA3AF", marginTop: 4 }}>Here's what's happening today.</p>
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
          <div style={{ backgroundColor: "#F3F4F6", borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#1A1A1A" }}>12</div>
            <div style={{ fontSize: 12, color: "#6B7280" }}>Pending to grade</div>
          </div>
          <div style={{ backgroundColor: "#FFF3EE", borderRadius: 12, padding: 16, border: "1px solid #FECDB7" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#E85D26" }}>4</div>
            <div style={{ fontSize: 12, color: "#E85D26" }}>New assignments</div>
          </div>
        </div>

        <p style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A", marginBottom: 16 }}>Quick Actions</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={() => router.push("/")}
            style={{
              width: "100%", padding: "14px", textAlign: "left",
              backgroundColor: "#1A1A1A", color: "#fff",
              border: "none", borderRadius: 12, cursor: "pointer",
              fontSize: 14, fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "space-between"
            }}
          >
            <span>Grade New Exam</span>
            <ChevronRight size={16} />
          </button>
          <button
            onClick={() => setActivePanel("library")}
            style={{
              width: "100%", padding: "14px", textAlign: "left",
              backgroundColor: "#FFFFFF", color: "#1A1A1A",
              border: "1px solid #E5E5E5", borderRadius: 12, cursor: "pointer",
              fontSize: 14, fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "space-between"
            }}
          >
            <span>Open AI Toolkit</span>
            <ChevronRight size={16} color="#9CA3AF" />
          </button>
        </div>
      </SlidePanel>

      {/* ── My Library Panel (incorporating Exam History) ──────────────────── */}
      <SlidePanel open={activePanel === "library"} onClose={() => setActivePanel(null)} title="My Library">
        <p style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 20 }}>Your past exams and grading history</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {EXAM_HISTORY.map(exam => {
            const gc = gradeColor(exam.grade);
            return (
              <div key={exam.id} style={{
                border: "1px solid #F3F4F6", borderRadius: 12, padding: "14px 16px",
                cursor: "pointer", transition: "box-shadow 0.15s",
              }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.08)")}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#1A1A1A" }}>{exam.subject}</div>
                    <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
                      {exam.class} · {exam.date} · {exam.questions} questions
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#E85D26" }}>{exam.score}</span>
                    <span style={{
                      backgroundColor: gc.bg, color: gc.color,
                      borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 700,
                    }}>{exam.grade}</span>
                  </div>
                </div>
                <div style={{ marginTop: 10, height: 4, backgroundColor: "#F3F4F6", borderRadius: 99 }}>
                  <div style={{
                    height: "100%", borderRadius: 99, backgroundColor: "#E85D26",
                    width: exam.score, transition: "width 0.6s ease",
                  }} />
                </div>
              </div>
            );
          })}
        </div>
        
        <div style={{ marginTop: 32, marginBottom: 16 }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A", margin: 0 }}>AI Teacher's Toolkit</h4>
          <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>More tools coming soon</p>
        </div>
        {[
          { icon: <CheckCircle2 size={20} color="#059669" />, title: "Auto Grading", desc: "AI grades handwritten answers", badge: "Active", badgeColor: "#059669", badgeBg: "#D1FAE5" },
          { icon: <BookOpen size={20} color="#7C3AED" />,     title: "Question Generator", desc: "Generate exam questions", badge: "Coming Soon", badgeColor: "#6B7280", badgeBg: "#F3F4F6" },
        ].map((tool, i) => (
          <div key={i} style={{
            border: "1px solid #F3F4F6", borderRadius: 12, padding: "14px 16px", marginBottom: 12,
            cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 12,
          }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#FAFAFA")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#FFFFFF")}
          >
            <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: "#F9FAFB", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {tool.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: "#1A1A1A" }}>{tool.title}</span>
                <span style={{ backgroundColor: tool.badgeBg, color: tool.badgeColor, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
                  {tool.badge}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4, lineHeight: 1.5 }}>{tool.desc}</div>
            </div>
          </div>
        ))}
      </SlidePanel>

      {/* ── My Classroom Panel ────────────────────────────────────────────── */}
      <SlidePanel open={activePanel === "classroom"} onClose={() => setActivePanel(null)} title="My Classroom">
        <p style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 20 }}>Manage your classes and students</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {CLASSROOM_DATA.map(cls => (
            <div key={cls.id} style={{
              border: "1px solid #F3F4F6", borderRadius: 12, padding: "14px 16px",
              display: "flex", alignItems: "center", gap: 14,
              cursor: "pointer",
            }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#FAFAFA")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#FFFFFF")}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                backgroundColor: cls.color, display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <GraduationCap size={22} color="#fff" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#1A1A1A" }}>{cls.name}</div>
                <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{cls.subject}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1A1A" }}>{cls.students}</div>
                <div style={{ fontSize: 11, color: "#9CA3AF" }}>students</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#E85D26" }}>{cls.exams}</div>
                <div style={{ fontSize: 11, color: "#9CA3AF" }}>exams</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{
          marginTop: 20, padding: "16px", backgroundColor: "#FFF3EE",
          borderRadius: 12, border: "1px solid #FECDB7",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Users size={16} color="#E85D26" />
            <span style={{ fontWeight: 600, fontSize: 13, color: "#1A1A1A" }}>Total Enrollment</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#E85D26" }}>138</div>
          <div style={{ fontSize: 12, color: "#9CA3AF" }}>students across 4 classes</div>
        </div>
      </SlidePanel>

      {/* ── Assignments Panel ─────────────────────────────────────────────── */}
      <SlidePanel open={activePanel === "assignments"} onClose={() => setActivePanel(null)} title="Assignments">
        <p style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 20 }}>Pending and completed assignments</p>
        {[
          { title: "Algebra Chapter 5 — Problem Set", class: "Class 10-A", due: "Aug 30, 2026", status: "pending", submissions: 28, total: 34 },
          { title: "Essay: Climate Change Impact",    class: "Class 11-A", due: "Aug 28, 2026", status: "overdue", submissions: 30, total: 30 },
          { title: "Science Lab Report — Osmosis",   class: "Class 9-B",  due: "Sep 2, 2026",  status: "pending", submissions: 12, total: 38 },
          { title: "History Map Activity",            class: "Class 10-B", due: "Aug 25, 2026", status: "graded",  submissions: 36, total: 36 },
        ].map((a, i) => {
          const statusCfg: Record<string, { bg: string; color: string; label: string }> = {
            pending: { bg: "#FEF3C7", color: "#D97706", label: "Pending" },
            overdue: { bg: "#FEE2E2", color: "#DC2626", label: "Overdue" },
            graded:  { bg: "#D1FAE5", color: "#059669", label: "Graded"  },
          };
          const sc = statusCfg[a.status];
          const pct = Math.round((a.submissions / a.total) * 100);
          return (
            <div key={i} style={{
              border: "1px solid #F3F4F6", borderRadius: 12, padding: "14px 16px", marginBottom: 12,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#1A1A1A" }}>{a.title}</div>
                  <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{a.class} · Due {a.due}</div>
                </div>
                <span style={{ backgroundColor: sc.bg, color: sc.color, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                  {sc.label}
                </span>
              </div>
              <div style={{ marginTop: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9CA3AF", marginBottom: 4 }}>
                  <span>Submissions</span><span>{a.submissions}/{a.total}</span>
                </div>
                <div style={{ height: 4, backgroundColor: "#F3F4F6", borderRadius: 99 }}>
                  <div style={{ height: "100%", borderRadius: 99, backgroundColor: a.status === "overdue" ? "#EF4444" : "#E85D26", width: `${pct}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </SlidePanel>


    </>
  );
}
