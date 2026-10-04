import Link from "next/link";
import { twMerge } from "tailwind-merge";

// The mark is three voice bars: Protégé listens and speaks.
export function LogoMark({ className = "" }) {
  return (
    <span aria-hidden="true" className={twMerge("inline-flex h-[1em] items-center gap-[0.14em]", className)}>
      <span className="h-[40%] w-[0.18em] rounded-full bg-primary-400" />
      <span className="h-full w-[0.18em] rounded-full bg-primary-400" />
      <span className="h-[62%] w-[0.18em] rounded-full bg-primary-400" />
    </span>
  );
}

export function Logo({ className = "" }) {
  return (
    <Link
      href="/"
      className={twMerge("group flex min-w-0 items-center gap-2 text-xl font-semibold tracking-tight", className)}
      aria-label="Protégé home"
    >
      <LogoMark />
      <span className="truncate">Protégé</span>
    </Link>
  );
}
