export function OrielMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={className}
      fill="none"
    >
      <path
        d="M6 26V8.5c0-1.4 1-2.5 2.4-2.5H16c6 0 10 3.8 10 9.2 0 5.5-4 9.3-10 9.3H8.4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M11 12.5h5.2c2.8 0 4.6 1.6 4.6 4.1s-1.8 4.1-4.6 4.1H11"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="23.5" cy="8" r="1.4" fill="currentColor" />
    </svg>
  );
}
