import { Check } from "lucide-react";

/** 9-step progress: filled forest-green dot for the current step, a small check for completed
 * ones, muted outline for what's ahead. The connecting line behind each dot fills in with the
 * same green as steps are completed, so progress reads at a glance without needing the "Step N
 * of 9" text at all — that text stays too, for screen readers and at-a-glance clarity. */
export function StepProgress({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={total}>
      {Array.from({ length: total }, (_, i) => {
        const done = i < step;
        const current = i === step;
        return (
          <div key={i} className="flex items-center">
            <div
              className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[0.625rem] font-medium transition-colors duration-300 sm:size-6 sm:text-[0.6875rem] ${
                done
                  ? "bg-primary text-primary-foreground"
                  : current
                    ? "bg-primary/15 text-primary ring-2 ring-primary"
                    : "bg-secondary text-muted-foreground"
              }`}
            >
              {done ? <Check className="size-3 sm:size-3.5" strokeWidth={2.5} aria-hidden="true" /> : i + 1}
            </div>
            {i < total - 1 && (
              <div
                className="h-px w-3 rounded-full transition-colors duration-500 sm:w-6"
                style={{ backgroundColor: done ? "var(--color-primary)" : "var(--color-border)" }}
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
