import Link from "next/link";
import { twMerge } from "tailwind-merge";

// Placeholder mark (an ear: the apprentice listens). Swap when we have a logo.
export function Logo({ className = "" }) {
  return (
    <Link
      href="/"
      className={twMerge(
        "focus-ring group flex min-w-0 items-center gap-2 font-jakarta text-xl font-black tracking-tight",
        className,
      )}
      aria-label="Protégé home"
    >
      <svg aria-hidden="true" viewBox="0 0 64 64" className="h-[1.2em] w-[1.2em] flex-shrink-0">
        <rect width="64" height="64" rx="14" className="fill-primary-400" />
        <path d="M22 26a10 10 0 1 1 20 0c0 8-8 9-8 17a6 6 0 0 1-12 0" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
      </svg>
      <span className="truncate">Protégé</span>
    </Link>
  );
}
