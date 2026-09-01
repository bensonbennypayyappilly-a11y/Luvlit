/** Inline validation message, shown directly beneath the input it belongs to — never an alert
 * or a page-level error summary, so the owner can see which field needs fixing. */
export function FieldError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-xs text-destructive">
      {message}
    </p>
  );
}
