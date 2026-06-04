"use client";

import type { ReceiptDraft } from "@/lib/ocr/types";
import { useRef, useState } from "react";

type Props = {
  onDraft: (draft: ReceiptDraft) => void;
  onError: (message: string) => void;
};

export default function ReceiptCaptureButton({ onDraft, onError }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit size client-side before upload
    if (file.size > 5 * 1024 * 1024) {
      onError("Image trop grande (max 5 Mo)");
      return;
    }

    setLoading(true);
    try {
      const body = new FormData();
      body.append("image", file);
      const res = await fetch("/api/ocr", { method: "POST", body });
      if (!res.ok) {
        onError("Erreur OCR — saisissez manuellement");
        return;
      }
      const draft = (await res.json()) as ReceiptDraft;
      onDraft(draft);
    } catch {
      onError("Erreur réseau — saisissez manuellement");
    } finally {
      setLoading(false);
      // Reset input so the same file can be re-selected
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <label className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-gray-100 text-gray-500 shadow-none transition-colors active:bg-gray-200">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={handleFile}
        disabled={loading}
      />
      {loading ? (
        <svg
          className="h-5 w-5 animate-spin text-kasb-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-6 w-6"
          role="img"
          aria-label="Scan receipt"
        >
          <path d="M4 4h3l2-2h6l2 2h3a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm8 3a5 5 0 100 10A5 5 0 0012 7zm0 2a3 3 0 110 6 3 3 0 010-6z" />
        </svg>
      )}
    </label>
  );
}
