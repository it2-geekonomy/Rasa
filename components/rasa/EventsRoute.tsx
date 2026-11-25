"use client";

import { useSearchParams } from "next/navigation";
import type { DayId } from "@/lib/rasa/types";
import { EventsProgram } from "./EventsProgram";

export function EventsRoute({ initialDay }: { initialDay: DayId }) {
  const searchParams = useSearchParams();
  const focus = searchParams.get("focus") ?? undefined;
  return <EventsProgram day={initialDay} focusId={focus} />;
}