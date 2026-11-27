"use client";

import Link from "next/link";
import { useState } from "react";
import { DAYS, EV, dayOf, ARTISTS } from "@/lib/rasa/catalog";
import { fmtMinutes } from "@/lib/rasa/time";
import { card, gridAnimItem, lnk } from "@/lib/rasa/ui";
import { RasaImage } from "./RasaImage";
import { usePlan } from "@/contexts/plan-context";
import { ScrollStagger } from "@/components/rasa/motion/ScrollStagger";

export function WorkshopsGrid() {
  const [wsday, setWsday] = useState("all");
  const { plan, togglePlan } = usePlan();
  const list = EV.filter((e) => e.ws && (wsday === "all" || e.d === wsday));
  const dayOpts: [string, string][] = [
    ["all", "All days"],
    ...DAYS.filter((d) => EV.some((e) => e.ws && e.d === d.id)).map((d) => [d.id, d.long] as [string, string]),
  ];

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Day">
        {dayOpts.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={
              wsday === id
                ? "min-h-11 rounded-full border-2 border-burg bg-burg px-4 py-2 font-bold text-white"
                : "min-h-11 rounded-full border-2 border-line bg-white px-4 py-2 font-medium"
            }
            aria-pressed={wsday === id}
            onClick={() => setWsday(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <ScrollStagger className="grid grid-cols-3 items-stretch gap-[18px] max-md:grid-cols-1">
        {list.map((e) => {
          const on = plan.includes(e.id);
          return (
            <div key={e.id} data-scroll-item className={gridAnimItem}>
            <div className={`${card} flex h-full min-h-0 flex-col gap-1.5`}>
              {e.pic ? (
                <RasaImage
                  img={e.pic}
                  alt={e.palt || e.t}
                  className="h-auto aspect-[16/9]!"
                  style={{ aspectRatio: "16 / 9", objectPosition: e.pp || "50% 40%" }}
                  width={800}
                  height={450}
                />
              ) : null}
              <div className="font-lab text-sm font-semibold uppercase tracking-wider text-burg">
                {dayOf(e.d).short} {dayOf(e.d).num}, {fmtMinutes(e.s)} to {fmtMinutes(e.e)}
              </div>
              <h3 className="font-display text-xl font-semibold text-plum">{e.t}</h3>
              {e.w ? <p className="text-muted">{e.w}</p> : null}
              <p className="text-muted">{e.v}</p>
              {e.x ? <p className="text-[0.95rem] text-muted">{e.x.replace(/<[^>]+>/g, "")}</p> : null}
              <div className="font-display text-[1.4rem] font-bold text-burg">{e.price || "Price to come"}</div>
              {!e.price ? <p className="text-[0.9rem] text-muted">Each workshop is priced separately.</p> : null}
              {e.seats ? <p className="text-[0.9rem] text-muted">{e.seats}</p> : null}
              {e.a?.length ? (
                <p className="mt-1">
                  {e.a.map((id) => {
                    const a = ARTISTS.find((x) => x.id === id);
                    return a ? (
                      <Link key={id} href={`/artists/${id}`} className={lnk}>
                        About {a.n}
                      </Link>
                    ) : null;
                  })}
                </p>
              ) : null}
              <div className="mt-auto flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  className="min-h-11 rounded-full border-2 border-plum bg-white px-4 py-2 font-bold text-plum"
                  aria-pressed={on}
                  onClick={() => togglePlan(e.id)}
                >
                  {on ? "In your plan" : "Add to plan"}
                </button>
                <Link
                  href={`/events/${e.d}?focus=${e.id}`}
                  className="inline-flex min-h-11 items-center rounded-full border-2 border-plum bg-white px-4 py-2 font-bold text-plum no-underline"
                >
                  See in programme
                </Link>
              </div>
            </div>
            </div>
          );
        })}
      </ScrollStagger>
    </>
  );
}