"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  FileText,
  X,
  Sparkles,
  FolderKanban,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";
import AppLayout from "@/components/AppLayout";
import { meetingsApi } from "@/lib/api";

const ALLOWED = [".txt", ".vtt"];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function UploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [projectName, setProjectName] = useState("General");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback((accepted: File[], rejected: any[]) => {
    if (rejected.length > 0) {
      toast.error("Only .txt and .vtt files are allowed");
    }
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name));
      const newFiles = accepted.filter((f) => !existing.has(f.name));
      return [...prev, ...newFiles];
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/plain": [".txt"], "text/vtt": [".vtt"] },
    maxSize: 10 * 1024 * 1024,
  });

  const removeFile = (name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error("Please add at least one file");
      return;
    }
    setUploading(true);
    setProgress(10);

    try {
      const interval = setInterval(() => {
        setProgress((p) => Math.min(p + 5, 85));
      }, 200);

      await meetingsApi.upload(files, projectName);

      clearInterval(interval);
      setProgress(100);
      toast.success(`${files.length} transcript${files.length > 1 ? "s" : ""} uploaded!`);
      setTimeout(() => router.push("/dashboard"), 600);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Upload failed");
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-8">
        {/* Header */}
        <div className="animate-fade-in-up">
          <h1 className="section-title text-3xl">Upload Transcripts</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Drag &amp; drop meeting transcripts for AI-powered analysis
          </p>
        </div>

        {/* Drop Zone */}
        <div
          {...getRootProps()}
          className={`upload-zone cursor-pointer animate-fade-in-up ${isDragActive ? "active" : ""}`}
          style={{ animationDelay: "0.1s" }}
        >
          <input {...getInputProps()} />
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl mb-4" style={{ background: "var(--brand-glow)" }}>
            <Upload className="h-8 w-8 text-[var(--brand-hover)]" />
          </div>
          <p className="text-base font-semibold text-[var(--text-primary)]">
            {isDragActive ? "Drop files here" : "Drag & drop your transcripts"}
          </p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            or click to browse — .txt, .vtt up to 10 MB
          </p>
        </div>

        {/* Project Name */}
        <div className="glass-card p-5 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
          <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] mb-2">
            <FolderKanban className="h-4 w-4" /> Project Name
          </label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="input-field"
            placeholder="e.g. Q4 Planning, Product Sync..."
          />
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="glass-card divide-y divide-[var(--border-subtle)] animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <div className="flex items-center justify-between px-5 py-3">
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                {files.length} file{files.length > 1 ? "s" : ""} selected
              </span>
              <button className="btn-ghost text-xs" onClick={() => setFiles([])}>
                Clear all
              </button>
            </div>
            {files.map((f) => (
              <div key={f.name} className="flex items-center gap-3 px-5 py-3">
                <FileText className="h-4 w-4 flex-shrink-0 text-[var(--brand-hover)]" />
                <span className="flex-1 truncate text-sm text-[var(--text-primary)]">{f.name}</span>
                <span className="text-xs text-[var(--text-muted)]">{formatBytes(f.size)}</span>
                <button onClick={() => removeFile(f.name)} className="text-[var(--text-muted)] hover:text-[var(--accent-red)] transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload Progress */}
        {uploading && (
          <div className="glass-card p-5 animate-fade-in">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--brand-primary)] border-t-transparent" />
              <span className="text-sm font-medium text-[var(--text-primary)]">Uploading...</span>
              <span className="ml-auto text-sm text-[var(--text-muted)]">{progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-secondary)]">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progress}%`,
                  background: "var(--gradient-brand)",
                }}
              />
            </div>
          </div>
        )}

        {/* Upload Button */}
        <div className="flex justify-end animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
          <button
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
            className="btn-primary px-8"
          >
            {uploading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Upload & Analyze
              </>
            )}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
