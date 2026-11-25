"use client";

export function SponsorsActions() {
  return (
    <div className="mt-3.5 flex flex-wrap gap-2.5">
      <button
        type="button"
        className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-burg px-6 py-3 font-bold text-white"
        onClick={() => window.open("/pdf/RASA-Sponsorship-Proposal.pdf", "_blank")}
      >
        Sponsorship proposal (PDF)
      </button>
    </div>
  );
}