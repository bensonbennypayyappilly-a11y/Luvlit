/** Abstract monogram mark for LuvLit — a stylised "L" lockup, inherits currentColor. */
export function LuvLitLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="1" y="1" width="30" height="30" rx="9" stroke="currentColor" strokeWidth="1.4" opacity="0.25" />
      <path
        d="M11 8.5V19.5C11 21.433 12.567 23 14.5 23H22"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="21.5" cy="10.5" r="2" fill="currentColor" />
    </svg>
  );
}
