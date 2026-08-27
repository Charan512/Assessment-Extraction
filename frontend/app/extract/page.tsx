"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

function SparkleIcon() {
  return (
    <div style={{ position: "relative", width: 100, height: 100 }}>
      <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
        <style>{`
          @keyframes sparkle-pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(0.88); }
          }
          .sp-main { animation: sparkle-pulse 1.8s ease-in-out infinite; transform-origin: center; }
        `}</style>
        <g className="sp-main">
          {/* Big star */}
          <path d="M50 4 L55 44 L94 50 L55 56 L50 96 L45 56 L6 50 L45 44 Z" fill="#E85D26"/>
          {/* Small star top-right */}
          <path d="M80 14 L82 26 L94 28 L82 30 L80 42 L78 30 L66 28 L78 26 Z" fill="#E85D26" opacity="0.55"/>
          {/* Tiny dot bottom-left */}
          <circle cx="22" cy="74" r="4.5" fill="#E85D26" opacity="0.4"/>
        </g>
      </svg>
    </div>
  );
}

export default function ExtractPage() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.push("/mapping"), 3500);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#FFFFFF",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 0,
    }}>
      <SparkleIcon />
      <h2 style={{
        fontSize: 34, fontWeight: 800, color: "#1A1A1A",
        margin: "20px 0 0 0", letterSpacing: "-0.5px",
      }}>
        Extracting...
      </h2>
      <p style={{ fontSize: 15, color: "#9CA3AF", marginTop: 10 }}>
        This may take a while
      </p>
    </div>
  );
}
