"use client";

import { forwardRef } from "react";
import { DAYS, EV } from "@/lib/rasa/catalog";
import { fmtMinutes } from "@/lib/rasa/time";
import { usePlan } from "@/contexts/plan-context";
import { useToast } from "@/contexts/toast-context";

type Props = {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

function planText(planIds: string[]) {
  const events = planIds.map((id) => EV.find((e) => e.id === id)).filter(Boolean);
  if (!events.length) return "";
  return (
    "My RASA plan\n" +
    DAYS.map((d) => {
      const x = events.filter((e) => e!.d === d.id).sort((a, b) => a!.s - b!.s);
      if (!x.length) return "";
      return (
        d.long +
        "\n" +
        x
          .map((e) => {
            const time = e!.tl
              ? e!.tl + (e!.ts ? ` ${e!.ts}` : "")
              : `${fmtMinutes(e!.s)} to ${fmtMinutes(e!.e)}`;
            return `  ${time}  ${e!.t}${e!.w ? ` (${e!.w})` : ""}${e!.v ? `, ${e!.v}` : ""}`;
          })
          .join("\n")
      );
    })
      .filter(Boolean)
      .join("\n\n")
  );
}

function clashes(planIds: string[]) {
  const p = planIds.map((id) => EV.find((e) => e.id === id)).filter(Boolean);
  const out: [typeof p[0], typeof p[0]][] = [];
  for (let i = 0; i < p.length; i++) {
    for (let j = i + 1; j < p.length; j++) {
      const a = p[i]!;
      const b = p[j]!;
      if (a.d === b.d && !a.nt && !b.nt && a.s < b.e && b.s < a.e) {
        out.push([a, b]);
      }
    }
  }
  return out;
}

export const PlanSidebar = forwardRef<HTMLElement, Props>(function PlanSidebar(
  { mobileOpen, onMobileClose },
  ref,
) {
  const { plan, clearPlan } = usePlan();
  const { toast } = useToast();
  const events = plan.map((id) => EV.find((e) => e.id === id)).filter(Boolean);
  const cl = clashes(plan);

  return (
    <aside
      ref={ref}
      className={`sticky top-[132px] rounded-2xl bg-tint p-5 max-md:static max-md:mt-5 ${
        mobileOpen ? "max-md:!block" : "max-md:hidden"
      }`}
      aria-label="Your plan"
    >
      <h3 className="mb-1 font-display text-xl font-semibold text-plum">Your plan</h3>
      <p className="m-0 text-[0.9rem] text-muted">
        {events.length
          ? `${events.length} session${events.length > 1 ? "s" : ""} saved on this device.`
          : "Tick any session to build your own plan."}
      </p>
      {events.length ? (
        <>
          <ul className="my-3 grid list-none gap-2">
            {events
              .sort(
                (a, b) =>
                  DAYS.findIndex((d) => d.id === a!.d) -
                    DAYS.findIndex((d) => d.id === b!.d) || a!.s - b!.s,
              )
              .map((e) => (
                <li key={e!.id} className="rounded-[10px] bg-white px-3 py-2 text-[0.95rem]">
                  <b className="font-lab tracking-wide text-plum">
                    {DAYS.find((d) => d.id === e!.d)?.short}{" "}
                    {e!.tl || fmtMinutes(e!.s)}
                  </b>{" "}
                  {e!.t}
                </li>
              ))}
          </ul>
          {cl.map(([a, b]) => (
            <div
              key={`${a!.id}-${b!.id}`}
              className="my-2 rounded-[10px] bg-[#fbe7ea] px-3 py-2 text-[0.92rem] font-medium text-burg-d"
            >
              Overlap on {DAYS.find((d) => d.id === a!.d)?.short}: {a!.t} and {b!.t} run at the same
              time.
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="min-h-11 rounded-full border-2 border-plum bg-white px-4 py-2 font-bold text-plum"
              onClick={() => {
                const txt = planText(plan);
                void navigator.clipboard?.writeText(txt).then(
                  () => toast("Plan copied"),
                  () => toast("Copy is blocked in this browser"),
                );
              }}
            >
              Copy plan
            </button>
            <button
              type="button"
              className="min-h-11 rounded-full border-2 border-plum bg-white px-4 py-2 font-bold text-plum"
              onClick={() => {
                clearPlan();
                onMobileClose?.();
              }}
            >
              Clear
            </button>
          </div>
        </>
      ) : null}
    </aside>
  );
});