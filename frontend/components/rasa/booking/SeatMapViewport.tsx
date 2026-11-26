"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  variant?: "default" | "sheet";
};

const MOBILE_MQ = "(max-width: 1023px)";
const MIN_USER = 1;
const MAX_USER = 2.25;
const USER_STEP = 0.18;

function touchDistance(touches: TouchList) {
  if (touches.length < 2) return 0;
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

function clampScroll(container: HTMLDivElement) {
  const maxX = Math.max(0, container.scrollWidth - container.clientWidth);
  const maxY = Math.max(0, container.scrollHeight - container.clientHeight);
  if (container.scrollLeft > maxX) container.scrollLeft = maxX;
  if (container.scrollLeft < 0) container.scrollLeft = 0;
  if (container.scrollTop > maxY) container.scrollTop = maxY;
  if (container.scrollTop < 0) container.scrollTop = 0;
}

/** Full venue diagram + CSS zoom (scroll-friendly) and optional pinch / + − controls. */
export function SeatMapViewport({ children, variant = "default" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const fitRef = useRef(1);
  const userRef = useRef(1);
  const pinchRef = useRef<{ startDist: number; startUser: number } | null>(null);
  const supportsZoomRef = useRef(true);
  const [zoomPct, setZoomPct] = useState(100);

  const applyZoom = useCallback(() => {
    const inner = innerRef.current;
    if (!inner) return;
    if (!window.matchMedia(MOBILE_MQ).matches) {
      inner.style.zoom = "";
      setZoomPct(100);
      requestAnimationFrame(() => {
        const c = containerRef.current;
        if (c) clampScroll(c);
      });
      return;
    }
    const total = Math.min(2, fitRef.current * userRef.current);
    if (supportsZoomRef.current) inner.style.zoom = String(total);
    else inner.style.zoom = "";
    setZoomPct(Math.round(total * 100));
    requestAnimationFrame(() => {
      const c = containerRef.current;
      if (c) clampScroll(c);
    });
  }, []);

  const measureFit = useCallback(() => {
    const container = containerRef.current;
    const inner = innerRef.current;
    if (!container || !inner) return;

    if (!window.matchMedia(MOBILE_MQ).matches) {
      fitRef.current = 1;
      userRef.current = 1;
      applyZoom();
      return;
    }

    inner.style.zoom = "1";
    const viewW = container.clientWidth;
    const contentW = inner.scrollWidth;
    if (viewW < 16 || contentW < 16) return;

    fitRef.current = Math.min(1, Math.max(0.45, (viewW - 28) / contentW));
    applyZoom();
    requestAnimationFrame(() => {
      const c = containerRef.current;
      if (!c) return;
      c.scrollLeft = 0;
      clampScroll(c);
    });
  }, [applyZoom]);

  useLayoutEffect(() => {
    supportsZoomRef.current =
      typeof CSS !== "undefined" &&
      (CSS.supports("zoom", "1") || CSS.supports("(zoom: 1)"));

    measureFit();
    const container = containerRef.current;
    const inner = innerRef.current;
    if (!container || !inner) return;

    const schedule = () => requestAnimationFrame(measureFit);
    const ro = new ResizeObserver(schedule);
    ro.observe(container);
    ro.observe(inner);
    const mq = window.matchMedia(MOBILE_MQ);
    const onMq = () => {
      userRef.current = 1;
      schedule();
    };
    mq.addEventListener("change", onMq);
    window.addEventListener("orientationchange", onMq);
    document.fonts?.ready.then(schedule);

    return () => {
      ro.disconnect();
      mq.removeEventListener("change", onMq);
      window.removeEventListener("orientationchange", onMq);
    };
  }, [measureFit]);

  const nudgeUser = useCallback(
    (delta: number) => {
      userRef.current = Math.min(
        MAX_USER,
        Math.max(MIN_USER, +(userRef.current + delta).toFixed(2)),
      );
      applyZoom();
    },
    [applyZoom],
  );

  const resetUser = useCallback(() => {
    userRef.current = 1;
    applyZoom();
    const c = containerRef.current;
    if (c) c.scrollTo({ left: 0, top: 0, behavior: "smooth" });
  }, [applyZoom]);

  useEffect(() => {
    const c = containerRef.current;
    if (c) c.scrollLeft = 0;
  }, [variant]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinchRef.current = {
          startDist: touchDistance(e.touches),
          startUser: userRef.current,
        };
      }
    };
    const onMove = (e: TouchEvent) => {
      const p = pinchRef.current;
      if (!p || e.touches.length !== 2 || p.startDist < 8) return;
      e.preventDefault();
      const dist = touchDistance(e.touches);
      userRef.current = Math.min(
        MAX_USER,
        Math.max(MIN_USER, p.startUser * (dist / p.startDist)),
      );
      applyZoom();
    };
    const onEnd = () => {
      pinchRef.current = null;
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [applyZoom]);

  const viewportTailwind =
    variant === "sheet"
      ? "max-lg:h-0 max-lg:min-h-[10rem] max-lg:flex-1 max-lg:max-h-full"
      : "max-lg:min-h-[min(44dvh,400px)] max-lg:max-h-[min(58dvh,520px)]";

  return (
    <div
      className={`flex min-h-0 w-full min-w-0 flex-col rounded-rasa border border-line bg-white shadow-sm ${
        variant === "sheet" ? "min-h-0 flex-1" : "flex-1"
      }`}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line bg-tint/30 px-2 py-1 lg:hidden">
        <p className="text-[0.65rem] text-muted">Drag map to scroll</p>
        <div className="flex items-center gap-1" role="group" aria-label="Map zoom">
          <ZoomBtn label="Zoom out" onClick={() => nudgeUser(-USER_STEP)}>
            −
          </ZoomBtn>
          <button
            type="button"
            className="min-w-[2.75rem] rounded-md border border-line bg-white px-1.5 py-1 text-[0.65rem] font-bold tabular-nums text-plum"
            onClick={resetUser}
            title="Reset zoom"
          >
            {zoomPct}%
          </button>
          <ZoomBtn label="Zoom in" onClick={() => nudgeUser(USER_STEP)}>
            +
          </ZoomBtn>
        </div>
      </div>

      <div
        ref={containerRef}
        data-rasa-seat-viewport
        className={`box-border w-full min-w-0 min-h-0 flex-1 touch-pan-x touch-pan-y overflow-auto overscroll-contain bg-[#faf8fa] scroll-ps-3 scroll-pe-2 [scrollbar-color:var(--color-plum)_var(--color-tint2)] [scrollbar-gutter:stable] [scrollbar-width:thin] [&::-webkit-scrollbar]:block [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-plum [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-tint2/90 lg:max-h-[min(58vh,560px)] lg:min-h-[280px] ${viewportTailwind}`}
      >
        <div
          ref={innerRef}
          className={`box-border inline-block w-max max-w-none origin-top-left align-top py-1.5 pb-2.5 pl-3 pr-2.5 antialiased max-lg:[&_button]:antialiased lg:pl-1 lg:pr-1 ${
            variant === "sheet"
              ? "lg:inline-block lg:w-max"
              : "lg:block lg:w-full lg:min-w-0"
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function ZoomBtn({
  children,
  label,
  onClick,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="flex size-8 items-center justify-center rounded-md border border-line bg-white text-lg font-bold leading-none text-plum shadow-sm active:scale-95"
      onClick={onClick}
      aria-label={label}
    >
      {children}
    </button>
  );
}