"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { API, apiFetch, ExtractionStatusResponse } from "@/lib/api";
import { getSession } from "@/lib/session";

type Step = {
  label: string;
  done: boolean;
  active: boolean;
};

function SparkleIcon({ pulse }: { pulse: boolean }) {
  return (
    <div style={{ position: "relative", width: 100, height: 100 }}>
      <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
        <style>{`
          @keyframes sparkle-pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(0.88); }
          }
          .sp-main { animation: ${pulse ? "sparkle-pulse 1.8s ease-in-out infinite" : "none"}; transform-origin: center; }
        `}</style>
        <g className="sp-main">
          <path d="M50 4 L55 44 L94 50 L55 56 L50 96 L45 56 L6 50 L45 44 Z" fill="#E85D26"/>
          <path d="M80 14 L82 26 L94 28 L82 30 L80 42 L78 30 L66 28 L78 26 Z" fill="#E85D26" opacity="0.55"/>
          <circle cx="22" cy="74" r="4.5" fill="#E85D26" opacity="0.4"/>
        </g>
      </svg>
    </div>
  );
}

export default function ExtractPage() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("Initialising…");
  const [questionsFound, setQuestionsFound] = useState(0);
  const [answersFound, setAnswersFound] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Track which extraction phases have been kicked off
  const kickedRef = useRef({ questions: false, answers: false });

  const steps: Step[] = [
    { label: "Upload received",      done: progress >= 10,  active: progress < 10 },
    { label: "Extracting questions", done: progress >= 50,  active: progress >= 10 && progress < 50 },
    { label: "Extracting answers",   done: progress >= 100, active: progress >= 50 && progress < 100 },
    { label: "Matching & ready",     done: done,            active: progress >= 100 && !done },
  ];

  useEffect(() => {
    const sessionId = getSession();
    if (!sessionId) {
      setError("No active session found. Please go back and upload your files.");
      return;
    }

    let cancelled = false;

    /**
     * Critical fix: Fire extraction calls WITHOUT awaiting them here.
     * They run in the background on the server; we poll status every 2s
     * to get real progress updates instead of a frozen UI.
     */
    const kickOffExtractions = () => {
      if (!kickedRef.current.questions) {
        kickedRef.current.questions = true;
        setCurrentStep("Extracting questions…");
        setProgress(10);
        apiFetch(`${API.extraction.questions}?session_id=${sessionId}`, {
          method: "POST",
          timeoutMs: 600_000, // 10 min max for large papers
        }).catch((err) => {
          if (!cancelled) {
             const msg = err instanceof Error ? err.message : "Question extraction failed";
             // Safari's generic CORS/network error
             setError(msg === "Load failed" ? "Network error: The backend may be down or restarting." : msg);
          }
        });
      }
    };

    const kickOffAnswers = () => {
      if (!kickedRef.current.answers) {
        kickedRef.current.answers = true;
        setCurrentStep("Extracting handwritten answers…");
        apiFetch(`${API.extraction.answers}?session_id=${sessionId}`, {
          method: "POST",
          timeoutMs: 600_000,
        }).catch((err) => {
          if (!cancelled) {
             const msg = err instanceof Error ? err.message : "Answer extraction failed";
             setError(msg === "Load failed" ? "Network error: The backend may be down or restarting." : msg);
          }
        });
      }
    };

    // Fire question extraction immediately
    kickOffExtractions();

    // Poll status every 2 seconds for real progress
    pollRef.current = setInterval(async () => {
      if (cancelled) return;
      try {
        const status = await apiFetch<ExtractionStatusResponse>(
          API.extraction.status(sessionId),
          { timeoutMs: 10_000 }
        );

        setProgress(status.progress);
        setCurrentStep(status.extraction_step);
        setQuestionsFound(status.questions_found);
        setAnswersFound(status.answers_found);

        if (status.error_message) {
          clearInterval(pollRef.current!);
          setError(status.error_message);
          return;
        }

        // Once questions are done (≥50%), kick off answer extraction
        if (status.progress >= 50) {
          kickOffAnswers();
        }

        if (status.progress >= 100) {
          clearInterval(pollRef.current!);
          setDone(true);
          setCurrentStep("Complete! Redirecting…");
          setTimeout(() => router.push("/mapping"), 1200);
        }
      } catch (err) {
        // If the session was lost (e.g. backend restarted), stop polling and show error
        if (err instanceof Error && (err.message.includes("not found") || err.message.includes("expired"))) {
          clearInterval(pollRef.current!);
          setError("Your session has expired or was lost (the server may have restarted). Please start over.");
        }
        // Otherwise assume transient poll failure and keep trying
      }
    }, 2000);

    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#F0F0F0" }}>
      <Sidebar />
      <div style={{ marginLeft: 260, flex: 1, display: "flex", flexDirection: "column" }}>
        <TopBar backLabel="Exams" />

        <main style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: 40, gap: 0,
        }}>
          <SparkleIcon pulse={!error && !done} />

          {error ? (
            <>
              <AlertCircle size={40} color="#EF4444" style={{ marginTop: 20 }} />
              <h2 style={{ fontSize: 24, fontWeight: 700, color: "#EF4444", margin: "12px 0 8px" }}>Extraction Failed</h2>
              <p style={{ fontSize: 14, color: "#6B7280", maxWidth: 400, textAlign: "center" }}>{error}</p>
              <button
                onClick={() => router.push("/")}
                style={{
                  marginTop: 20, padding: "12px 28px",
                  backgroundColor: "#1A1A1A", color: "#fff",
                  border: "none", borderRadius: 50, cursor: "pointer",
                  fontSize: 14, fontWeight: 600,
                }}
              >
                ← Start Over
              </button>
            </>
          ) : (
            <>
              <h2 style={{ fontSize: 34, fontWeight: 800, color: "#1A1A1A", margin: "20px 0 0 0", letterSpacing: "-0.5px" }}>
                {done ? "Done!" : "Extracting…"}
              </h2>
              <p style={{ fontSize: 15, color: "#9CA3AF", marginTop: 10, marginBottom: 28 }}>
                {currentStep}
              </p>

              {/* Progress bar */}
              <div style={{ width: 320, height: 6, backgroundColor: "#F3F4F6", borderRadius: 99, marginBottom: 24, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 99,
                  backgroundColor: "#E85D26",
                  width: `${progress}%`,
                  transition: "width 0.6s ease",
                }} />
              </div>

              {/* Steps */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 320 }}>
                {steps.map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                      backgroundColor: s.done ? "#E85D26" : s.active ? "#FDE8DF" : "#F3F4F6",
                      border: `2px solid ${s.done ? "#E85D26" : s.active ? "#E85D26" : "#E5E5E5"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {s.done && <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#fff" }} />}
                      {s.active && <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#E85D26", animation: "pulse 1s infinite" }} />}
                    </div>
                    <span style={{ fontSize: 13, color: s.done ? "#1A1A1A" : s.active ? "#E85D26" : "#9CA3AF", fontWeight: s.active ? 600 : 400 }}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>

              {(questionsFound > 0 || answersFound > 0) && (
                <div style={{ marginTop: 24, display: "flex", gap: 24 }}>
                  {questionsFound > 0 && (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 28, fontWeight: 800, color: "#E85D26" }}>{questionsFound}</div>
                      <div style={{ fontSize: 12, color: "#9CA3AF" }}>Questions found</div>
                    </div>
                  )}
                  {answersFound > 0 && (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 28, fontWeight: 800, color: "#1A1A1A" }}>{answersFound}</div>
                      <div style={{ fontSize: 12, color: "#9CA3AF" }}>Answers found</div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}
