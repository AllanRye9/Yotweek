export function VerifiedBadge({ label = "Verified organizer" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
        <path
          fillRule="evenodd"
          d="M10 1l2.39 2.39L16 3l.61 3.61L20 8l-1.39 2.39L20 12l-3.39.39L16 16l-3.61-.61L10 18l-2.39-2.39L4 16l-.61-3.61L0 12l1.39-2.39L0 8l3.39-.39L4 3l3.61.61L10 1z"
          clipRule="evenodd"
          opacity="0"
        />
      </svg>
      ✓ {label}
    </span>
  );
}
