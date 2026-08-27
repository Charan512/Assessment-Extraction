"use client";

import { ArrowLeft, ClipboardList, HelpCircle, Bell, Sparkles, User, ChevronDown } from "lucide-react";

interface TopBarProps {
  backLabel?: string;
}

export default function TopBar({ backLabel = "Exams" }: TopBarProps) {
  return (
    <header style={{
      height: 60, display: "flex", alignItems: "center",
      justifyContent: "space-between",
      padding: "0 28px", backgroundColor: "#FFFFFF",
      borderBottom: "1px solid #E5E5E5",
      position: "sticky", top: 0, zIndex: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#6B7280", fontSize: 14 }}>
        <button style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280", display: "flex", alignItems: "center" }}>
          <ArrowLeft size={18} />
        </button>
        <ClipboardList size={16} color="#6B7280" />
        <span>{backLabel}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280", display: "flex", alignItems: "center" }}>
          <HelpCircle size={20} />
        </button>
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <button style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280", display: "flex", alignItems: "center" }}>
            <Bell size={20} />
          </button>
          <span style={{
            position: "absolute", top: -2, right: -2, width: 8, height: 8,
            backgroundColor: "#EF4444", borderRadius: "50%",
          }} />
        </div>
        <button style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280", display: "flex", alignItems: "center" }}>
          <Sparkles size={20} />
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            backgroundColor: "#F3F4F6", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>
            <User size={16} color="#6B7280" />
          </div>
          <span style={{ fontSize: 14, fontWeight: 500 }}>Madhur Rastogi</span>
          <ChevronDown size={14} color="#6B7280" />
        </div>
      </div>
    </header>
  );
}
