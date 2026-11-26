"use client";

import { useRef, useState } from "react";
import { ApiError, uploadImage } from "@/lib/admin/api";
import { quietButtonClass } from "./ui";

const ACCEPT_IMAGES = "image/jpeg,image/png,image/webp,image/gif,image/avif";

export function ImageUploadField({
  label,
  value,
  onChange,
  token,
  folder,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  token: string;
  folder: "events" | "artists" | "general";
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  async function uploadFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const uploaded = await uploadImage(file, token, folder);
      onChange(uploaded.url);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not upload image");
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    void uploadFile(file);
  }

  function handleDrop(event: React.DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragging(false);
    if (uploading) return;
    const file = event.dataTransfer.files?.[0];
    void uploadFile(file);
  }

  return (
    <div className="grid gap-2 text-sm text-muted">
      <span>{label}</span>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_IMAGES}
        className="hidden"
        onChange={handleFileChange}
      />

      {value ? (
        <div className="grid gap-3 rounded-rasa border border-line bg-tint/40 p-3">
          <div className="overflow-hidden rounded-lg bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt={label} className="max-h-56 w-auto rounded-lg object-cover" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={quietButtonClass}
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? "Uploading…" : "Replace image"}
            </button>
            <button
              type="button"
              disabled={uploading}
              className="rounded-rasa border border-line bg-white px-3 py-2 text-sm text-burg hover:bg-tint disabled:opacity-60"
              onClick={() => onChange("")}
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center gap-1.5 rounded-rasa border-2 border-dashed px-4 py-6 text-center transition disabled:cursor-wait disabled:opacity-60 ${
            dragging ? "border-plum bg-tint2/50" : "border-line bg-tint/30 hover:border-plum"
          }`}
        >
          <UploadIcon />
          <span className="font-medium text-plum">
            {uploading ? "Uploading image…" : `Upload ${label.toLowerCase()}`}
          </span>
          <span className="text-xs text-muted">Drag &amp; drop or click to choose (JPEG, PNG, WebP, GIF, AVIF · max 10 MB)</span>
        </button>
      )}

      {error ? <p className="text-xs text-burg">{error}</p> : null}
    </div>
  );
}

export function GalleryUploadField({
  label,
  urls,
  onChange,
  token,
  folder,
}: {
  label: string;
  urls: string[];
  onChange: (next: string[]) => void;
  token: string;
  folder: "events" | "artists" | "general";
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    if (files.length === 0) return;
    setUploading(true);
    setError("");
    try {
      const results = await Promise.all(files.map((file) => uploadImage(file, token, folder)));
      onChange([...urls, ...results.map((r) => r.url)]);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not upload one or more photos");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-2 text-sm text-muted">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>{label}</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_IMAGES}
          className="hidden"
          onChange={handleFiles}
        />
        <button
          type="button"
          className={quietButtonClass}
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "Uploading…" : "Upload photos"}
        </button>
      </div>
      {error ? <p className="text-xs text-burg">{error}</p> : null}
      {urls.length > 0 ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
          {urls.map((url, index) => (
            <div key={`${url}-${index}`} className="group relative overflow-hidden rounded-rasa border border-line bg-tint">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Gallery ${index + 1}`} className="aspect-[4/5] w-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(urls.filter((_, i) => i !== index))}
                className="absolute top-1.5 right-1.5 rounded-full bg-white/95 px-2 py-0.5 text-xs font-medium text-burg shadow-xs hover:bg-white"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted">No gallery photos uploaded yet.</p>
      )}
    </div>
  );
}

function UploadIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-plum"
      aria-hidden
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
