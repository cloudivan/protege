// Landing page. One idea in the first seconds: the headline says what
// Protégé does, the tutor card next to it shows it doing that.
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Lock, Pause } from "lucide-react";
import TutorPlayback from "@/components/landing/TutorPlayback";

const ACCENT = "#FF5A1F";
const EXPLORE_HREF = "/workflows";

function Bars({ size = "lg" }) {
  const heights = size === "lg" ? [16, 40, 64, 36, 16] : [8, 18, 12];
  const width = size === "lg" ? "w-3" : "w-1";
  return (
    <span aria-hidden="true" className={`inline-flex items-center ${size === "lg" ? "h-16 gap-2" : "h-5 gap-[3px]"}`}>
      {heights.map((h, i) => (
        <span
          key={i}
          className={`${width} landing-bar rounded-full`}
          style={{ height: h, background: ACCENT, animationDelay: `${i * 140}ms` }}
        />
      ))}
    </span>
  );
}

const TRUST = [
  { icon: Pause, text: "Stays silent while the doctor works. Asks only at pauses." },
  { icon: Lock, text: "Off the record at any time. Patient data is redacted." },
  { icon: Check, text: "Nothing is taught until the senior doctor confirms the Work Map." },
];

export default function Home() {
  // The generated demo, if one exists, drives the playback card.
  const [demo, setDemo] = useState(null);
  useEffect(() => {
    fetch("/api/workflows/demo")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setDemo(d?.workflow || null))
      .catch(() => {});
  }, []);
  return (
    <div className={`min-h-screen bg-[#ECEFF2] text-[#0F172A] antialiased`}>
      <div className="mx-auto flex min-h-screen max-w-[1280px] flex-col px-6 sm:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4 py-7">
          <Link href="/" className="inline-flex items-center gap-2.5 text-xl font-semibold tracking-tight">
            <Bars size="sm" />
            Protégé
          </Link>
          <nav className="flex flex-wrap items-center gap-7 text-[15px] text-[#475569]">
            <Link href="/workflows" className="hover:text-[#0F172A]">Workflows</Link>
          </nav>
        </header>

        <main className="grid flex-grow items-center gap-16 py-10 lg:grid-cols-2">
          <section className="flex flex-col gap-6">
            <h1 className="m-0 text-[clamp(44px,5.6vw,76px)] font-semibold leading-[1.02] tracking-[-0.045em] [text-wrap:balance]">
              Learn the job from whoever does it best.
            </h1>
            <p className="m-0 max-w-[470px] text-xl leading-relaxed text-[#475569]">
              Protégé learns how your senior doctors think, not just what they click. Junior doctors get a tutor that
              speaks up before they make the mistake.
            </p>
            <div className="flex flex-wrap items-center gap-5">
              <Link
                href={EXPLORE_HREF}
                className="inline-flex min-h-[52px] items-center gap-2.5 rounded-xl bg-[#0F172A] px-6 text-[17px] font-medium text-white transition-colors hover:bg-[#1E293B]"
              >
                Explore workflows <ArrowRight className="h-[18px] w-[18px]" />
              </Link>
              <span className="font-mono text-[13px] text-[#64748B]">
                Taught by senior doctors, ready to learn
              </span>
            </div>
          </section>

          <TutorPlayback lines={demo?.playback || []} expertName={demo?.expertName} />
        </main>

        <section id="trust" aria-label="Trust" className="mb-12 grid gap-4 sm:grid-cols-3">
          {TRUST.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-start gap-3 text-[15px] leading-snug text-[#334155]">
              <Icon className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.8} />
              {text}
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
