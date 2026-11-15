/** A small Google Docs style page icon: blue sheet, folded corner, text lines. */
export function GoogleDocIcon({ size = 14, title }: { size?: number; title?: string }) {
  return (
    <svg
      width={size * 0.75}
      height={size}
      viewBox="0 0 18 24"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path d="M2 0h10l6 6v16a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2z" fill="#4285F4" />
      <path d="M12 0l6 6h-4a2 2 0 0 1-2-2z" fill="#A1C2FA" />
      <path d="M4 11h10v1.6H4zm0 3.4h10V16H4zm0 3.4h7v1.6H4z" fill="#fff" />
    </svg>
  );
}
