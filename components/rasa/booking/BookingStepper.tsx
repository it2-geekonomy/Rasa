type Step = "event" | "seats" | "cart";

const STEPS: { id: Step; label: string }[] = [
  { id: "event", label: "Choose show" },
  { id: "seats", label: "Pick seats" },
  { id: "cart", label: "Your cart" },
];

export function BookingStepper({ step }: { step: Step }) {
  const idx = STEPS.findIndex((s) => s.id === step);
  return (
    <ol className="mb-8 flex flex-wrap items-center gap-2 font-lab text-sm font-semibold uppercase tracking-widest">
      {STEPS.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <li key={s.id} className="flex items-center gap-2">
            {i > 0 ? <span className="text-line" aria-hidden>›</span> : null}
            <span
              className={
                active
                  ? "rounded-full bg-plum px-3 py-1 text-white"
                  : done
                    ? "text-plum"
                    : "text-muted"
              }
            >
              <span className="mr-1.5 opacity-70">{i + 1}</span>
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}