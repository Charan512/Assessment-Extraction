"use client";

import { useRouter } from "next/navigation";
import { LayoutGrid, MonitorSmartphone, FileText, ClipboardList, Clock, School, Sparkles, Copy } from "lucide-react";
import { ReactNode } from "react";

const navItems: { icon: ReactNode; label: string; href: string; active?: boolean }[] = [
  { icon: <LayoutGrid size={18} />, label: "Home", href: "#" },
  { icon: <MonitorSmartphone size={18} />, label: "My Classroom", href: "#" },
  { icon: <FileText size={18} />, label: "Assignments", href: "#" },
  { icon: <ClipboardList size={18} />, label: "Exams", href: "/", active: true },
  { icon: <Clock size={18} />, label: "My Library", href: "#" },
];

export default function Sidebar() {
  const router = useRouter();
  return (
    <aside style={{
      width: 260,
      minWidth: 260,
      height: "100vh",
      backgroundColor: "#FFFFFF",
      borderRight: "1px solid #E5E5E5",
      display: "flex",
      flexDirection: "column",
      padding: "24px 16px",
      position: "fixed",
      top: 0,
      left: 0,
    }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          backgroundColor: "#1A1A1A", color: "white",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 800, fontSize: 18, fontFamily: "Georgia, serif"
        }}>V</div>
        <span style={{ fontWeight: 700, fontSize: 18, color: "#1A1A1A" }}>VedaAI</span>
        <button style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" }}>
          <Copy size={16} />
        </button>
      </div>

      {/* AI Teacher's Toolkit pill */}
      <button style={{
        display: "flex", alignItems: "center", gap: 8,
        backgroundColor: "#1A1A1A", color: "#fff",
        border: "none", borderRadius: 50, padding: "10px 16px",
        fontWeight: 600, fontSize: 14, cursor: "pointer",
        marginBottom: 28, width: "100%",
      }}>
        <Sparkles size={16} color="#E85D26" />
        AI Teacher&apos;s Toolkit
      </button>

      {/* Nav Items */}
      <nav style={{ flex: 1 }}>
        {navItems.map((item) => (
          <button
            key={item.label}
            onClick={() => item.href !== "#" && router.push(item.href)}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              width: "100%", padding: "10px 12px", borderRadius: 10,
              border: "none", cursor: "pointer", textAlign: "left",
              backgroundColor: item.active ? "#F3F4F6" : "transparent",
              color: item.active ? "#1A1A1A" : "#6B7280",
              fontWeight: item.active ? 600 : 400,
              fontSize: 14, marginBottom: 2,
            }}
          >
            <span style={{ width: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* School card */}
      <div style={{
        backgroundColor: "#F9FAFB", borderRadius: 12, padding: "14px 16px",
        border: "1px solid #E5E5E5", display: "flex", alignItems: "center", gap: 10,
        marginTop: "auto",
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: "50%",
          backgroundColor: "#E5E7EB", display: "flex",
          alignItems: "center", justifyContent: "center",
        }}>
          <School size={20} color="#6B7280" />
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: "#1A1A1A" }}>Delhi Public School</div>
          <div style={{ fontSize: 12, color: "#9CA3AF" }}>Bokaro Steel City</div>
        </div>
      </div>
    </aside>
  );
}
