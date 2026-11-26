"use client";

import { useToast } from "@/contexts/toast-context";

export function CopyButton({
  text,
  label = "Copy UPI ID",
  className = "",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const { toast } = useToast();
  return (
    <button
      type="button"
      className={`min-h-11 rounded-full border-2 border-plum bg-white px-4 py-2 font-bold text-plum ${className}`}
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(
          () => toast("UPI ID copied"),
          () => toast("Copy is blocked in this browser"),
        );
      }}
    >
      {label}
    </button>
  );
}