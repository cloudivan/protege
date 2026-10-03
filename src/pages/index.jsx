// Landing page. One idea in the first seconds: the headline says what
// Protégé does, the tutor card next to it shows it doing that.
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { ArrowRight, Check, Lock, Pause } from "lucide-react";

const geist = Geist({ subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

const ACCENT = "#FF5A1F";
const DEMO_HREF = "/workflows/demo/teach";

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

function Bubble({ from, children }) {
  const tutor = from === "tutor";
  return (
    <p
      className={`m-0 rounded-2xl px-4 py-3 ${
        tutor ? "max-w-[85%] bg-[#F1F5F9]" : "max-w-[70%] self-end bg-[#0F172A] text-white"
      }`}
    >
      {children}
    </p>
  );
}

const TRUST = [
  { icon: Pause, text: "Stays silent while the expert types. Asks only at pauses." },
  { icon: Lock, text: "The expert can go off the record at any time." },
  { icon: Check, text: "Nothing is taught until the expert confirms the Work Map." },
];

export default function Home() {
  return (
    <div className={`${geist.className} ${geistMono.variable} min-h-screen bg-[#ECEFF2] text-[#0F172A] antialiased`}>
      <div className="mx-auto flex min-h-screen max-w-[1280px] flex-col px-6 sm:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4 py-7">
          <Link href="/" className="inline-flex items-center gap-2.5 text-xl font-semibold tracking-tight">
            <Bars size="sm" />
            Protégé
          </Link>
          <nav className="flex flex-wrap items-center gap-7 text-[15px] text-[#475569]">
            <a href="#trust" className="hover:text-[#0F172A]">Trust</a>
            <Link href="/workflows" className="hover:text-[#0F172A]">Workflows</Link>
          </nav>
        </header>

        <main className="grid flex-grow items-center gap-16 py-10 lg:grid-cols-2">
          <section className="flex flex-col gap-6">
            <h1 className="m-0 text-[clamp(44px,5.6vw,76px)] font-semibold leading-[1.02] tracking-[-0.045em] [text-wrap:balance]">
              Learn the job from whoever does it best.
            </h1>
            <p className="m-0 max-w-[470px] text-xl leading-relaxed text-[#475569]">
              Protégé records how your expert thinks, not just what they click. New hires get a tutor that speaks up
              before they make the mistake.
            </p>
            <div className="flex flex-wrap items-center gap-5">
              <Link
                href={DEMO_HREF}
                className="inline-flex min-h-[52px] items-center gap-2.5 rounded-xl bg-[#0F172A] px-6 text-[17px] font-medium text-white transition-colors hover:bg-[#1E293B]"
              >
                Talk to the tutor <ArrowRight className="h-[18px] w-[18px]" />
              </Link>
              <span className="font-[family-name:var(--font-geist-mono)] text-[13px] text-[#64748B]">
                Live voice, right in your browser
              </span>
            </div>
          </section>

          <section
            aria-label="The tutor coaching a new hire"
            className="flex flex-col gap-5 rounded-3xl bg-white p-7 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_24px_48px_-16px_rgba(15,23,42,0.18)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-col">
                <strong className="text-[17px] font-semibold">Protégé Voice Tutor</strong>
                <span className="text-sm text-[#64748B]">Coaching in Sabine&apos;s words</span>
              </div>
              <span className="inline-flex items-center gap-2 font-[family-name:var(--font-geist-mono)] text-xs text-[#64748B]">
                <span className="h-2 w-2 rounded-full" style={{ background: ACCENT }} />
                Live
              </span>
            </div>

            <div className="flex justify-center">
              <Bars />
            </div>

            <div className="flex flex-col gap-2.5 text-[15px] leading-snug">
              <Bubble from="tutor">Before you post it: this is 7,200 euros. Where does it go?</Bubble>
              <Bubble from="you">Opex, like the others?</Bubble>
              <Bubble from="tutor">
                Sabine would stop you here. Equipment over 5,000 euros is capex 0400, and only with an asset number.
              </Bubble>
            </div>

            <div
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-[1.5px] border-dashed px-4 py-3.5"
              style={{ borderColor: ACCENT }}
            >
              <span className="text-sm font-medium">Guardrail caught before saving</span>
              <Link href={DEMO_HREF} className="text-sm font-medium text-[#C2410C] hover:underline">
                Try it yourself
              </Link>
            </div>
          </section>
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
