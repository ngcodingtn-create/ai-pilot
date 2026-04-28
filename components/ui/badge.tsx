import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "blue" | "emerald" | "amber" | "slate";

const toneClasses: Record<BadgeTone, string> = {
  blue: "border-sky-200 bg-sky-100 text-sky-800",
  emerald: "border-emerald-200 bg-emerald-100 text-emerald-800",
  amber: "border-amber-200 bg-amber-100 text-amber-800",
  slate: "border-slate-200 bg-slate-100 text-slate-700",
};

export function Badge({
  tone = "slate",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
