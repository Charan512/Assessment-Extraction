"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
  ArrowLeft, ClipboardList, HelpCircle, Bell, Sparkles, User,
  ChevronDown, CheckCircle2, Clock, AlertTriangle
} from "lucide-react";

interface TopBarProps {
  backLabel?: string;
  backHref?: string;
}

// ─── Hardcoded Notifications Data ─────────────────────────────────────────────
const NOTIFICATIONS = [
  {
    id: 1,
    type: "success",
    title: "Grading Complete",
    message: "Science — Photosynthesis (Class 9-B) has been successfully graded.",
    time: "10 min ago",
    read: false,
  },
  {
    id: 2,
    type: "warning",
    title: "Low Average Score",
    message: "History Map Activity (Class 10-B) has an unusually low average of 68%.",
    time: "2 hours ago",
    read: false,
  },
  {
    id: 3,
    type: "info",
    title: "New AI Feature",
    message: "Try the new 'Plagiarism Check' tool in your AI Toolkit.",
    time: "1 day ago",
    read: true,
  },
];

export default function TopBar({ backLabel = "Exams", backHref }: TopBarProps) {
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);

  const handleBack = () => {
    if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (helpRef.current && !helpRef.current.contains(event.target as Node)) {
        setShowHelp(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = NOTIFICATIONS.filter(n => !n.read).length;

  return (
    <header style={{
      height: 60, display: "flex", alignItems: "center",
      justifyContent: "space-between",
      padding: "0 28px", backgroundColor: "#FFFFFF",
      borderBottom: "1px solid #E5E5E5",
      position: "sticky", top: 0, zIndex: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#6B7280", fontSize: 14 }}>
        <button
          onClick={handleBack}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280", display: "flex", alignItems: "center" }}
          title={`Back to ${backLabel}`}
        >
          <ArrowLeft size={18} />
        </button>
        <ClipboardList size={16} color="#6B7280" />
        <span>{backLabel}</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* Help / User Manual Dropdown */}
        <div style={{ position: "relative", display: "flex", alignItems: "center" }} ref={helpRef}>
          <button
            onClick={() => setShowHelp(!showHelp)}
            style={{
              background: showHelp ? "#F3F4F6" : "none",
              border: "none", cursor: "pointer", color: "#6B7280",
              display: "flex", alignItems: "center",
              padding: 6, borderRadius: "50%", transition: "background-color 0.15s"
            }}
            title="Help & User Manual"
          >
            <HelpCircle size={20} />
          </button>

          {showHelp && (
            <div style={{
              position: "absolute", top: "calc(100% + 12px)", right: 0,
              width: 320, backgroundColor: "#FFFFFF",
              border: "1px solid #E5E5E5", borderRadius: 12,
              boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
              display: "flex", flexDirection: "column",
              overflow: "hidden", animation: "slideDown 0.15s ease-out",
              zIndex: 9999,
            }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #F3F4F6", backgroundColor: "#FAFAFA" }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: "#1A1A1A" }}>User Manual</span>
              </div>
              <div style={{ padding: "8px 0" }}>
                {[
                  { title: "How to upload answer sheets", desc: "Supported formats and file sizes." },
                  { title: "Understanding auto-mapping", desc: "How AI matches answers to questions." },
                  { title: "Reviewing grades", desc: "Adjusting scores and leaving feedback." },
                  { title: "Exporting results", desc: "Download options for report cards." },
                ].map((item, i) => (
                  <div key={i} style={{
                    padding: "12px 20px", cursor: "pointer", transition: "background-color 0.15s"
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#F9FAFB")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13, color: "#1A1A1A" }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>{item.desc}</div>
                  </div>
                ))}
              </div>
              <div style={{ padding: "12px", textAlign: "center", borderTop: "1px solid #E5E5E5", backgroundColor: "#F9FAFB" }}>
                <span style={{ fontSize: 13, color: "#E85D26", fontWeight: 600, cursor: "pointer" }}>View full documentation</span>
              </div>
            </div>
          )}
        </div>

        {/* Notifications Dropdown */}
        <div style={{ position: "relative", display: "flex", alignItems: "center" }} ref={dropdownRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            style={{
              background: showNotifications ? "#F3F4F6" : "none",
              border: "none", cursor: "pointer", color: "#6B7280",
              display: "flex", alignItems: "center",
              padding: 6, borderRadius: "50%", transition: "background-color 0.15s"
            }}
            title="Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span style={{
                position: "absolute", top: 4, right: 6, width: 8, height: 8,
                backgroundColor: "#EF4444", borderRadius: "50%",
                border: "2px solid #FFFFFF",
              }} />
            )}
          </button>

          {showNotifications && (
            <div style={{
              position: "absolute", top: "calc(100% + 12px)", right: -10,
              width: 360, backgroundColor: "#FFFFFF",
              border: "1px solid #E5E5E5", borderRadius: 12,
              boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
              display: "flex", flexDirection: "column",
              overflow: "hidden", animation: "slideDown 0.15s ease-out",
              zIndex: 9999,
            }}>
              {/* Dropdown Header */}
              <div style={{
                padding: "16px 20px", borderBottom: "1px solid #F3F4F6",
                display: "flex", justifyContent: "space-between", alignItems: "center"
              }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: "#1A1A1A" }}>Notifications</span>
                {unreadCount > 0 && (
                  <span style={{ fontSize: 12, color: "#E85D26", fontWeight: 600, cursor: "pointer" }}>Mark all as read</span>
                )}
              </div>

              {/* Notification List */}
              <div style={{ maxHeight: 400, overflowY: "auto" }}>
                {NOTIFICATIONS.map(notif => (
                  <div key={notif.id} style={{
                    padding: "16px 20px", borderBottom: "1px solid #F3F4F6",
                    backgroundColor: notif.read ? "transparent" : "#FFF7F5",
                    display: "flex", gap: 14, cursor: "pointer",
                    transition: "background-color 0.15s"
                  }}
                  onMouseEnter={e => { if (notif.read) e.currentTarget.style.backgroundColor = "#F9FAFB"; }}
                  onMouseLeave={e => { if (notif.read) e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    {/* Icon */}
                    <div style={{ marginTop: 2 }}>
                      {notif.type === "success" && <CheckCircle2 size={18} color="#059669" />}
                      {notif.type === "warning" && <AlertTriangle size={18} color="#D97706" />}
                      {notif.type === "info" && <Sparkles size={18} color="#3B82F6" />}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: "#1A1A1A" }}>{notif.title}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#9CA3AF" }}>
                          <Clock size={12} />
                          <span style={{ fontSize: 11 }}>{notif.time}</span>
                        </div>
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: "#6B7280", lineHeight: 1.4 }}>{notif.message}</p>
                    </div>

                    {/* Unread indicator dot */}
                    {!notif.read && (
                      <div style={{ width: 8, height: 8, backgroundColor: "#E85D26", borderRadius: "50%", marginTop: 6 }} />
                    )}
                  </div>
                ))}
              </div>

              {/* View All */}
              <div style={{ padding: "12px", textAlign: "center", borderTop: "1px solid #E5E5E5", backgroundColor: "#F9FAFB" }}>
                <span style={{ fontSize: 13, color: "#E85D26", fontWeight: 600, cursor: "pointer" }}>View all notifications</span>
              </div>
            </div>
          )}
        </div>

        <button style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280", display: "flex", alignItems: "center" }} title="AI Toolkit">
          <Sparkles size={20} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", paddingLeft: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            backgroundColor: "#F3F4F6", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>
            <User size={16} color="#6B7280" />
          </div>
          <span style={{ fontSize: 14, fontWeight: 500, color: "#1A1A1A" }}>Teacher</span>
          <ChevronDown size={14} color="#6B7280" />
        </div>
      </div>
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </header>
  );
}
