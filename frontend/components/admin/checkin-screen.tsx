"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { api, ApiError } from "@/lib/admin/api";
import { useAdmin } from "./admin-gate";
import { fieldClass, Notice, Panel, primaryButtonClass, quietButtonClass } from "./ui";

type TicketView = {
  ticketNumber: string;
  attendeeName: string;
  status: string;
  session: { sessionName: string | null; event: { title: string } };
  booking: { bookingReference: string };
  bookingSeat: { eventSeat: { seat: { seatLabel: string } } } | null;
};

type Preview = { valid: boolean; reason: string | null; ticket: TicketView };

export function CheckinScreen() {
  const { token } = useAdmin();
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScan = useRef<(value: string) => void>(() => {});
  const [scanning, setScanning] = useState(true);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [tokenValue, setTokenValue] = useState("");
  const [manualInput, setManualInput] = useState("");
  const [error, setError] = useState("");
  const [checkedIn, setCheckedIn] = useState(false);
  const [busy, setBusy] = useState(false);

  onScan.current = (value) => {
    setScanning(false);
    setError("");
    setCheckedIn(false);
    setTokenValue(value);
    void lookup(value);
  };

  useEffect(() => {
    if (!scanning) return;
    const video = videoRef.current;
    if (!video) return;
    let stop = false;
    let frame = 0;
    let stream: MediaStream | null = null;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });

    async function run() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        });
        if (stop || !video) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const videoEl = video;
        videoEl.srcObject = stream;
        await videoEl.play();
        const detect = () => {
          if (stop) return;
          if (context && videoEl.readyState >= 2 && videoEl.videoWidth > 0) {
            canvas.width = videoEl.videoWidth;
            canvas.height = videoEl.videoHeight;
            context.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
            const image = context.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" });
            if (code?.data) {
              onScan.current(code.data.trim());
              return;
            }
          }
          frame = window.requestAnimationFrame(detect);
        };
        frame = window.requestAnimationFrame(detect);
      } catch {
        if (!stop) setError("Camera is blocked. Allow camera access, then try again.");
      }
    }

    void run();
    return () => {
      stop = true;
      window.cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    };
  }, [scanning]);

  async function lookup(value: string) {
    setBusy(true);
    try {
      const result = await api<{ data: Preview }>("/tickets/validate", {
        method: "POST",
        token,
        body: { qrToken: value },
      });
      setPreview(result.data);
      setTokenValue(result.data.ticket.ticketNumber);
    } catch (caught) {
      setPreview(null);
      setError(caught instanceof ApiError ? caught.message : "Ticket not found");
    } finally {
      setBusy(false);
    }
  }

  async function checkIn() {
    if (!tokenValue) return;
    setBusy(true);
    setError("");
    try {
      await api("/checkins", {
        method: "POST",
        token,
        body: { qrToken: tokenValue },
      });
      setCheckedIn(true);
      setPreview((current) =>
        current ? { ...current, valid: false, reason: "Checked in", ticket: { ...current.ticket, status: "USED" } } : current,
      );
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Check-in failed");
    } finally {
      setBusy(false);
    }
  }

  function scanAgain() {
    setPreview(null);
    setTokenValue("");
    setManualInput("");
    setError("");
    setCheckedIn(false);
    setScanning(true);
  }

  function handleManualLookup(event: FormEvent) {
    event.preventDefault();
    const cleaned = manualInput.trim();
    if (!cleaned) return;
    setScanning(false);
    setError("");
    setCheckedIn(false);
    setTokenValue(cleaned);
    void lookup(cleaned);
  }

  return (
    <>
      <div>
        <h1 className="font-display text-3xl text-plum">Check-in</h1>
        <p className="mt-1 text-sm text-muted">
          Scan the ticket QR with the camera, or enter the ticket number / QR code below.
        </p>
      </div>
      <Panel title="Ticket number or QR lookup">
        <form onSubmit={handleManualLookup} className="flex flex-wrap items-center gap-2">
          <input
            className={`${fieldClass} min-w-[240px] flex-1`}
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Ticket number (e.g. RASAA2644C160F-01) or QR code"
          />
          <button type="submit" className={primaryButtonClass} disabled={busy || !manualInput.trim()}>
            {busy ? "Looking up…" : "Look up"}
          </button>
          {!scanning ? (
            <button type="button" className={quietButtonClass} onClick={scanAgain}>
              Open camera
            </button>
          ) : null}
        </form>
      </Panel>
      {scanning ? (
        <Panel title="Camera">
          <video ref={videoRef} className="aspect-[3/4] w-full max-h-[70vh] rounded-rasa bg-black object-cover" playsInline muted />
          <p className="mt-2 text-sm text-muted">The scan looks the ticket up. It does not use it until you press Check in.</p>
        </Panel>
      ) : null}
      {error ? <Notice>{error}</Notice> : null}
      {preview ? (
        <article className="rounded-rasa border border-line bg-white p-4">
          <p className="font-display text-2xl text-plum">{preview.ticket.attendeeName}</p>
          <p className="text-sm">
            {preview.ticket.ticketNumber} · {preview.ticket.session.event.title}
          </p>
          <p className="text-sm text-muted">
            {preview.ticket.bookingSeat?.eventSeat.seat.seatLabel ?? "Open entry"}
            {preview.ticket.session.sessionName ? ` · ${preview.ticket.session.sessionName}` : ""}
          </p>
          <p className="text-sm text-muted">{preview.ticket.booking.bookingReference}</p>
          <p className="mt-2 text-sm font-medium text-plum">
            {checkedIn ? "Checked in. This ticket is used and cannot be scanned again." : preview.valid ? "Ready to enter." : preview.reason}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {preview.valid && !checkedIn ? (
              <button type="button" className={primaryButtonClass} onClick={checkIn} disabled={busy}>
                {busy ? "Checking in…" : "Check in"}
              </button>
            ) : null}
            <button type="button" className={quietButtonClass} onClick={scanAgain}>
              Scan next
            </button>
          </div>
        </article>
      ) : null}
      {!scanning && !preview && !busy ? (
        <button type="button" className={quietButtonClass} onClick={scanAgain}>
          Scan again
        </button>
      ) : null}
    </>
  );
}
