import Link from "next/link";
import { Eye, Map, GraduationCap, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { Logo } from "@/components/Logo";

export default function Home() {
  return (
    <div className="min-h-screen bg-background paper-grid text-foreground">
      {/* Top Navigation */}
      <header className="border-b border-border bg-card/60 backdrop-blur px-8 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <Logo className="text-xl" />
        <div className="flex items-center gap-4">
          <Link
            href="/workflows/demo/teach"
            className="text-xs font-mono px-3 py-1.5 rounded border border-border hover:bg-muted transition"
          >
            Live Demo · Teach Simulator
          </Link>
          <Link
            href="/workflows"
            className="text-xs font-medium px-4 py-1.5 rounded bg-primary text-white hover:bg-primary/90 transition shadow-sm"
          >
            Launch App
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-6 pt-16 pb-20 space-y-16">
        <div className="space-y-6 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card text-xs font-mono text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> ElevenLabs × Hack-Nation Challenge
          </div>
          <h1 className="text-4xl sm:text-6xl font-serif font-bold tracking-tight text-foreground leading-[1.15]">
            The apprentice that captures what experts never wrote down.
          </h1>
          <p className="text-lg text-muted-foreground font-serif leading-relaxed max-w-2xl mx-auto">
            Protégé listens while people work, stays silent while they type, asks <em>why</em> at natural pauses, maps the unwritten guardrails, and teaches the next generation.
          </p>
          <div className="flex justify-center gap-4 pt-2">
            <Link
              href="/workflows/demo/teach"
              className="inline-flex items-center gap-2 px-6 py-3 rounded bg-primary text-white font-medium text-sm hover:bg-primary/90 transition shadow"
            >
              Test the Voice Tutor Simulator <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* 3 Modules Blueprint Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          <div className="sketch-border bg-card p-6 rounded-lg space-y-3">
            <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center text-primary">
              <Eye className="h-5 w-5" />
            </div>
            <div className="text-xs font-mono text-muted-foreground">MODULE 01</div>
            <h2 className="font-serif font-bold text-lg">Capture at Pauses</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Watches the screen, detects natural work pauses, and asks why instead of copying keystrokes.
            </p>
          </div>

          <div className="sketch-border bg-card p-6 rounded-lg space-y-3">
            <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center text-primary">
              <Map className="h-5 w-5" />
            </div>
            <div className="text-xs font-mono text-muted-foreground">MODULE 02</div>
            <h2 className="font-serif font-bold text-lg">Debrief & Work Map</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Synthesizes tacit decisions and verbatim expert quotes into a verifiable, clickable Work Map timeline.
            </p>
          </div>

          <div className="sketch-border bg-card p-6 rounded-lg space-y-3 border-primary/40">
            <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center text-primary">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="text-xs font-mono text-primary font-bold">MODULE 03 · CORE</div>
            <h2 className="font-serif font-bold text-lg">Teach & Intercept</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Voice tutor guides a new hire through fresh cases, catching mistakes before they hit the database.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
