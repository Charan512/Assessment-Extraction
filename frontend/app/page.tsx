"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { Upload, X, FileText, ArrowRight, GraduationCap } from "lucide-react";

interface UploadedFile {
  name: string;
  size: string;
  pages: number;
  file: File;
}

function UploadCard({
  label,
  accent,
  file,
  onUpload,
  onRemove,
}: {
  label: string;
  accent: boolean;
  file: UploadedFile | null;
  onUpload: (f: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (f: File) => {
    onUpload(f);
  };

  return (
    <div
      onClick={() => !file && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault(); setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) handleFile(f);
      }}
      style={{
        flex: 1, minHeight: 140,
        border: `2px dashed ${dragging ? "#E85D26" : "#D1D5DB"}`,
        borderRadius: 16,
        backgroundColor: file ? "#FFFFFF" : "#FAFAFA",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        cursor: file ? "default" : "pointer",
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
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
      {file ? (
        <>
          {/* Remove button */}
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
          {/* PDF preview */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 44, height: 54, backgroundColor: "#EF4444", borderRadius: 6,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontWeight: 800, fontSize: 11, flexShrink: 0,
            }}>
              <FileText size={20} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#1A1A1A", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</div>
              <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>{file.size} • {file.pages} Pages</div>
            </div>
          </div>
        </>
      ) : (
        <>
          <Upload size={24} color="#9CA3AF" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>
            Upload <span style={{ color: accent ? "#E85D26" : "#1A1A1A" }}>{label}</span>
          </div>
          <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>Max 10MB</div>
        </>
      )}
    </div>
  );
}

export default function UploadPage() {
  const router = useRouter();
  const [questionFile, setQuestionFile] = useState<UploadedFile | null>(null);
  const [answerFile, setAnswerFile] = useState<UploadedFile | null>(null);

  const formatFile = (f: File): UploadedFile => ({
    name: f.name,
    size: `${(f.size / (1024 * 1024)).toFixed(1)}MB`,
    pages: Math.ceil(Math.random() * 6) + 1, // placeholder until real parsing
    file: f,
  });

  const bothUploaded = questionFile && answerFile;

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
          {/* Heading */}
          <h1 style={{ fontSize: 38, fontWeight: 800, textAlign: "center", margin: 0, lineHeight: 1.2 }}>
            Upload{" "}
            <span style={{
              color: "#E85D26",
              backgroundColor: "#FDE8DF",
              borderRadius: 12, padding: "2px 12px",
            }}>
              Question Paper &amp; Answer Sheets
            </span>
          </h1>
          <p style={{ fontSize: 16, color: "#6B7280", marginTop: 12, marginBottom: 32 }}>
            Upload both files to get started
          </p>

          {/* Teacher avatar illustration */}
          <div style={{ position: "relative", width: 100, height: 100, marginBottom: 36 }}>
            <div style={{
              width: 100, height: 100, borderRadius: "50%",
              backgroundColor: "#FDE8DF",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "4px solid #FCC5AE",
            }}>
              <GraduationCap size={48} color="#E85D26" />
            </div>
            {/* Decorative dots */}
            {([{t:0,l:8,r:undefined,b:undefined},{t:20,r:-8,l:undefined,b:undefined},{b:5,l:2,t:undefined,r:undefined},{b:15,r:4,t:undefined,l:undefined}] as {t?:number;l?:number;r?:number;b?:number}[]).map((pos,i)=>(
              <div key={i} style={{
                position:"absolute", width: i%2===0?10:7, height: i%2===0?10:7,
                borderRadius:"50%", backgroundColor:"#E85D26",
                top: pos.t, left: pos.l,
                right: pos.r, bottom: pos.b,
                opacity: 0.85,
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
              onUpload={(f) => setQuestionFile(formatFile(f))}
              onRemove={() => setQuestionFile(null)}
            />
            <UploadCard
              label="Answer Sheet"
              accent={false}
              file={answerFile}
              onUpload={(f) => setAnswerFile(formatFile(f))}
              onRemove={() => setAnswerFile(null)}
            />
          </div>

          {/* CTA */}
          <button
            onClick={handleStartMapping}
            disabled={!bothUploaded}
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
            Start Mapping <ArrowRight size={18} />
          </button>
          <p style={{ fontSize: 13, color: "#9CA3AF", marginTop: 12 }}>
            Once both files are uploaded, you&apos;ll able to map answers with questions
          </p>
        </main>
      </div>
    </div>
  );
}
