import { HomeContent } from "@/components/rasa/home/HomeContent";
import { HomeHero } from "@/components/rasa/home/HomeHero";
import { EV } from "@/lib/rasa/catalog";
import { rasaTitle } from "@/lib/rasa/metadata";

export const metadata = rasaTitle("Home");

export default function HomePage() {
  const real = EV.filter((e) => e.ty !== "brk");
  const stats = [
    [real.length, "scheduled slots across three days"],
    [real.filter((e) => e.ws).length, "workshops and hands-on sessions"],
    [real.filter((e) => e.ty === "perf").length, "performances and talks"],
    [2, "causes supported"],
  ] as const;

  return (
    <>
      <HomeHero />
      <HomeContent stats={stats} />
    </>
  );
}