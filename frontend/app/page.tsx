"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { Upload, X, FileText, ArrowRight, GraduationCap, Loader2, AlertCircle } from "lucide-react";
import { API, apiFetch, apiUpload, SessionCreateResponse, FileUploadResponse } from "@/lib/api";
import { saveSession, clearSession } from "@/lib/session";

interface UploadedFile {
  name: string;
  size: string;
  pages: number;
}

type UploadState = "idle" | "uploading" | "done" | "error";

function UploadCard({
  label,
  accent,
  file,
  state,
  error,
  onUpload,
  onRemove,
}: {
  label: string;
  accent: boolean;
  file: UploadedFile | null;
  state: UploadState;
  error: string | null;
  onUpload: (f: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      onClick={() => !file && state === "idle" && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault(); setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) onUpload(f);
      }}
      style={{
        flex: 1, minHeight: 140,
        border: `2px dashed ${error ? "#EF4444" : dragging ? "#E85D26" : state === "done" ? "#22C55E" : "#D1D5DB"}`,
        borderRadius: 16,
        backgroundColor: file ? "#FFFFFF" : "#FAFAFA",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        cursor: (file || state === "uploading") ? "default" : "pointer",
        padding: 24, position: "relative",
        transition: "border-color 0.2s",
        boxShadow: file ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }}
      />

      {state === "uploading" && (
        <>
          <Loader2 size={28} color="#E85D26" style={{ marginBottom: 8, animation: "spin 1s linear infinite" }} />
          <div style={{ fontSize: 13, color: "#6B7280" }}>Uploading…</div>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </>
      )}

      {state !== "uploading" && file && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            style={{
              position: "absolute", top: 12, right: 12,
              width: 28, height: 28, borderRadius: "50%",
              backgroundColor: "#1A1A1A", color: "#fff",
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <X size={14} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 44, height: 54, backgroundColor: "#EF4444", borderRadius: 6,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <FileText size={20} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#1A1A1A", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</div>
              <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>{file.size} • {file.pages} page{file.pages !== 1 ? "s" : ""}</div>
            </div>
          </div>
        </>
      )}

      {state !== "uploading" && !file && !error && (
        <>
          <Upload size={24} color="#9CA3AF" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>
            Upload <span style={{ color: accent ? "#E85D26" : "#1A1A1A" }}>{label}</span>
          </div>
          <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>PDF / JPG / PNG · Max 50MB</div>
        </>
      )}

      {state !== "uploading" && !file && error && (
        <>
          <AlertCircle size={24} color="#EF4444" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 13, color: "#EF4444", textAlign: "center", maxWidth: 200 }}>{error}</div>
          <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 6, cursor: "pointer" }} onClick={() => inputRef.current?.click()}>Try again</div>
        </>
      )}
    </div>
  );
}

export default function UploadPage() {
  const router = useRouter();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [questionFile, setQuestionFile] = useState<UploadedFile | null>(null);
  const [questionState, setQuestionState] = useState<UploadState>("idle");
  const [questionError, setQuestionError] = useState<string | null>(null);

  const [answerFile, setAnswerFile] = useState<UploadedFile | null>(null);
  const [answerState, setAnswerState] = useState<UploadState>("idle");
  const [answerError, setAnswerError] = useState<string | null>(null);

  // Create a session on mount
  useEffect(() => {
    clearSession();
    apiFetch<SessionCreateResponse>(API.upload.session, { method: "POST" })
      .then((res) => {
        setSessionId(res.session_id);
        saveSession(res.session_id);
      })
      .catch((err) => setSessionError(err.message));
  }, []);

  const handleUpload = useCallback(async (file: File, type: "question" | "answer") => {
    if (!sessionId) {
      const setError = type === "question" ? setQuestionError : setAnswerError;
      setError("Session not ready. Please wait a moment and try again.");
      return;
    }

    const setFile = type === "question" ? setQuestionFile : setAnswerFile;
    const setState = type === "question" ? setQuestionState : setAnswerState;
    const setError = type === "question" ? setQuestionError : setAnswerError;
    const url = type === "question"
      ? `${API.upload.questionPaper}?session_id=${sessionId}`
      : `${API.upload.answerSheet}?session_id=${sessionId}`;

    setState("uploading");
    setError(null);
    try {
      const res = await apiUpload<FileUploadResponse>(url, file);
      setFile({
        name: res.filename,
        size: `${(res.file_size_bytes / (1024 * 1024)).toFixed(1)} MB`,
        pages: res.page_count,
      });
      setState("done");
    } catch (err: unknown) {
      setState("error");
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }, [sessionId]);

  const handleRemove = (type: "question" | "answer") => {
    if (type === "question") {
      setQuestionFile(null);
      setQuestionState("idle");
      setQuestionError(null);
    } else {
      setAnswerFile(null);
      setAnswerState("idle");
      setAnswerError(null);
    }
  };

  const bothUploaded = questionState === "done" && answerState === "done";
  const isUploading = questionState === "uploading" || answerState === "uploading";

  const handleStartMapping = () => {
    if (bothUploaded) router.push("/extract");
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#F0F0F0" }}>
      <Sidebar />
      <div style={{ marginLeft: 260, flex: 1, display: "flex", flexDirection: "column" }}>
        <TopBar backLabel="Exams" />
        <main style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "40px 60px",
        }}>

          {/* Session error banner */}
          {sessionError && (
            <div style={{
              backgroundColor: "#FEE2E2", border: "1px solid #FCA5A5",
              borderRadius: 10, padding: "12px 20px", marginBottom: 24,
              color: "#DC2626", fontSize: 14, display: "flex", alignItems: "center", gap: 8,
            }}>
              <AlertCircle size={16} /> Backend unavailable: {sessionError}
            </div>
          )}

          <h1 style={{ fontSize: 38, fontWeight: 800, textAlign: "center", margin: 0, lineHeight: 1.2 }}>
            Upload{" "}
            <span style={{ color: "#E85D26", backgroundColor: "#FDE8DF", borderRadius: 12, padding: "2px 12px" }}>
              Question Paper &amp; Answer Sheets
            </span>
          </h1>
          <p style={{ fontSize: 16, color: "#6B7280", marginTop: 12, marginBottom: 32 }}>
            Upload both files to get started
          </p>

          {/* Teacher avatar */}
          <div style={{ position: "relative", width: 100, height: 100, marginBottom: 36 }}>
            <div style={{
              width: 100, height: 100, borderRadius: "50%",
              backgroundColor: "#FDE8DF",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "4px solid #FCC5AE",
            }}>
              <GraduationCap size={48} color="#E85D26" />
            </div>
            {([{t:0,l:8,r:undefined,b:undefined},{t:20,r:-8,l:undefined,b:undefined},{b:5,l:2,t:undefined,r:undefined},{b:15,r:4,t:undefined,l:undefined}] as {t?:number;l?:number;r?:number;b?:number}[]).map((pos,i)=>(
              <div key={i} style={{
                position:"absolute", width: i%2===0?10:7, height: i%2===0?10:7,
                borderRadius:"50%", backgroundColor:"#E85D26",
                top: pos.t, left: pos.l, right: pos.r, bottom: pos.b, opacity: 0.85,
              }}/>
            ))}
          </div>

          {/* Upload cards */}
          <div style={{
            display: "flex", gap: 20, width: "100%", maxWidth: 820,
            backgroundColor: "#FAFAFA", borderRadius: 20, padding: 20,
            border: "1px solid #E5E5E5",
          }}>
            <UploadCard
              label="Question Paper"
              accent={true}
              file={questionFile}
              state={questionState}
              error={questionError}
              onUpload={(f) => handleUpload(f, "question")}
              onRemove={() => handleRemove("question")}
            />
            <UploadCard
              label="Answer Sheet"
              accent={false}
              file={answerFile}
              state={answerState}
              error={answerError}
              onUpload={(f) => handleUpload(f, "answer")}
              onRemove={() => handleRemove("answer")}
            />
          </div>

          {/* CTA */}
          <button
            onClick={handleStartMapping}
            disabled={!bothUploaded || isUploading}
            style={{
              marginTop: 28,
              display: "flex", alignItems: "center", gap: 8,
              backgroundColor: bothUploaded ? "#1A1A1A" : "#D1D5DB",
              color: "#fff", border: "none", borderRadius: 50,
              padding: "14px 32px", fontSize: 16, fontWeight: 600,
              cursor: bothUploaded ? "pointer" : "not-allowed",
              transition: "background-color 0.2s",
            }}
          >
            {isUploading ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Uploading…</> : <>Start Mapping <ArrowRight size={18} /></>}
          </button>
        </main>
      </div>
    </div>
  );
}
