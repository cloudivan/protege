import Link from "next/link";
import {
  Compass,
  FileCode2,
  GitBranch,
  Shield,
  Layers,
  ArrowRight,
  Eye,
  BrainCircuit,
  GraduationCap,
  Clock,
  Sparkles,
  Lock,
  SlidersHorizontal,
  CheckCircle,
  FileText,
  AlertTriangle,
  Play
} from "lucide-react";
import { Logo } from "@/components/Logo";

export default function Home() {
  return (
    <div className="min-h-screen bg-background paper-grid text-foreground antialiased selection:bg-primary/10 selection:text-primary">
      {/* Top Editorial Bar */}
      <div className="border-b border-border bg-muted/40 px-6 py-2 text-xs font-mono text-muted-foreground flex justify-between items-center max-w-7xl mx-auto">
        <span>7TH GLOBAL AI HACKATHON · CHALLENGE 01</span>
        <div className="flex items-center gap-6">
          <span>POWERED BY ELEVENLABS</span>
          <span className="hidden sm:inline">VERSION 0.1.0-MVP</span>
        </div>
      </div>

      {/* Main Header */}
      <header className="border-b border-border bg-card/70 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Logo className="text-xl" />
            <nav className="hidden md:flex items-center gap-6 text-xs font-mono text-muted-foreground">
              <a href="#challenge" className="hover:text-foreground transition-colors">THE CHALLENGE</a>
              <a href="#architecture" className="hover:text-foreground transition-colors">ARCHITECTURE</a>
              <a href="#apprentice-test" className="hover:text-foreground transition-colors">THE 5 TESTS</a>
              <a href="#moonshot" className="hover:text-foreground transition-colors">MOONSHOT</a>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/sandbox/erp"
              className="text-xs font-mono px-3.5 py-1.5 rounded border border-border hover:bg-muted transition-colors inline-flex items-center gap-2"
            >
              <FileText className="h-3.5 w-3.5 text-muted-foreground" /> Sandbox ERP
            </Link>
            <Link
              href="/workflows/demo/teach"
              className="text-xs font-medium px-4 py-1.5 rounded bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm inline-flex items-center gap-2"
            >
              Launch Tutor Simulator <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-20 pb-28 space-y-28">
        <section className="max-w-4xl space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-border bg-card text-xs font-mono text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-primary" />
            KNOWLEDGE CAPTURE & TUTORING SYSTEM
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-serif font-bold tracking-tight text-foreground leading-[1.08] [text-wrap:balance]">
            Tacit knowledge leaves when people retire. Protégé learns it before they walk out the door.
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground font-serif leading-relaxed max-w-3xl [text-wrap:pretty]">
            Over 11,200 Americans turn 65 every day. In Germany, 12.9 million workers retire by 2036. They take decades of unwritten judgment with them. Protégé watches expert screen work, asks <em>why</em> during natural pauses, maps guardrails, and coaches new hires in real time.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href="/workflows/demo/teach"
              className="inline-flex items-center gap-2 px-6 py-3 rounded bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Play className="h-4 w-4 fill-current" /> Run Teach Simulator Demo
            </Link>
            <a
              href="#architecture"
              className="inline-flex items-center gap-2 px-6 py-3 rounded border border-border bg-card text-foreground font-medium text-sm hover:bg-muted transition-colors"
            >
              Explore 3-Stage System <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </a>
          </div>
        </section>

        {/* The Concrete Scenario: Sabine's Dilemma */}
        <section id="challenge" className="space-y-6 pt-8 border-t border-border">
          <div className="flex justify-between items-baseline flex-wrap gap-2">
            <div className="space-y-1">
              <span className="text-xs font-mono uppercase tracking-widest text-primary font-bold">THE RUNNING CASE</span>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold">The Sabine Dilemma: 4:10 PM, 60 Invoices Open</h2>
            </div>
            <span className="text-xs font-mono text-muted-foreground">Accounts Payable · Machine Builder, Stuttgart</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="sketch-border bg-card p-6 rounded space-y-3">
              <div className="text-xs font-mono text-muted-foreground border-b border-border pb-2 flex items-center justify-between">
                <span>01 · SCREEN RECORDINGS</span>
                <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <h3 className="font-serif font-bold text-base">Show What, Not Why</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Task-mining logs and click recordings capture mouse coordinates. They cannot tell a deliberate judgment call from an involuntary habit or a mistake.
              </p>
            </div>

            <div className="sketch-border bg-card p-6 rounded space-y-3">
              <div className="text-xs font-mono text-muted-foreground border-b border-border pb-2 flex items-center justify-between">
                <span>02 · PROCESS MANUALS</span>
                <FileCode2 className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <h3 className="font-serif font-bold text-base">Outdated and Shallow</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The 2019 PDF documentation lists happy paths. It ignores edge cases, supplier quirks, and the limits that people learn only after making expensive mistakes.
              </p>
            </div>

            <div className="sketch-border bg-card p-6 rounded space-y-3 border-primary/40 bg-primary/[0.02]">
              <div className="text-xs font-mono text-primary font-bold border-b border-border pb-2 flex items-center justify-between">
                <span>03 · PROTÉGÉ APPROACH</span>
                <CheckCircle className="h-3.5 w-3.5 text-primary" />
              </div>
              <h3 className="font-serif font-bold text-base">Conversational Extraction</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Listens quietly, detects natural task boundaries, asks three focused questions, and creates a verified Work Map with linked screen moments and verbatim reasoning.
              </p>
            </div>
          </div>
        </section>

        {/* 3 Core Modules */}
        <section id="architecture" className="space-y-8 pt-8 border-t border-border">
          <div className="space-y-1">
            <span className="text-xs font-mono uppercase tracking-widest text-primary font-bold">SYSTEM ARCHITECTURE</span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold">Three Operational Modules</h2>
            <p className="text-sm text-muted-foreground font-serif max-w-2xl">
              From an expert working live on screen, to an authoritative Work Map, to an active voice tutor coaching the next generation.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Module 1 */}
            <div className="sketch-border bg-card p-7 rounded space-y-5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">MODULE 01</span>
                <Eye className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-xl font-serif font-bold">Capture at Natural Pauses</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Screen frames are sampled every 1.5s and diffed by a vision model into structured events. ElevenLabs voice agent stays quiet while the expert types or reads, intervening only when a real pause occurs.
              </p>
              <div className="space-y-2 text-xs font-mono bg-muted/50 p-3 rounded border border-border">
                <div className="text-muted-foreground">CRITICAL METRIC</div>
                <div className="text-foreground">3 to 5 live questions per 10 minutes</div>
                <div className="text-primary">At least 1 question on a guardrail</div>
              </div>
            </div>

            {/* Module 2 */}
            <div className="sketch-border bg-card p-7 rounded space-y-5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">MODULE 02</span>
                <Layers className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-xl font-serif font-bold">Debrief & Work Map</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                When the task concludes, Protégé asks follow-up questions to resolve ambiguities, then explains the workflow back in under 60 seconds. Confirmed rules are saved as a clickable Work Map.
              </p>
              <div className="space-y-2 text-xs font-mono bg-muted/50 p-3 rounded border border-border">
                <div className="text-muted-foreground">DATA CONTRACT</div>
                <div className="text-foreground">Every step links to a screen moment</div>
                <div className="text-primary">Verbatim expert quotes, not paraphrases</div>
              </div>
            </div>

            {/* Module 3 */}
            <div className="sketch-border bg-card p-7 rounded space-y-5 border-primary/50 bg-primary/[0.02]">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">MODULE 03 · THE TEST</span>
                <GraduationCap className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-xl font-serif font-bold">The Socratic Tutor</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The new hire handles an unseen case. The voice tutor observes their screen, prompts them to predict steps, and intercepts wrong actions before they are committed to production.
              </p>
              <div className="space-y-2 text-xs font-mono bg-muted/50 p-3 rounded border border-border">
                <div className="text-muted-foreground">THE BENCHMARK</div>
                <div className="text-foreground">Intercepts mistake before save</div>
                <div className="text-primary">Replays Sabine's exact reasoning</div>
              </div>
            </div>
          </div>
        </section>

        {/* The 5 Apprentice Tests */}
        <section id="apprentice-test" className="space-y-8 pt-8 border-t border-border">
          <div className="space-y-1">
            <span className="text-xs font-mono uppercase tracking-widest text-primary font-bold">EVALUATION CRITERIA</span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold">The Five Apprentice Tests</h2>
            <p className="text-sm text-muted-foreground font-serif max-w-2xl">
              Timing is where voice agents fail. Protégé is evaluated against five core design criteria from the hackathon brief.
            </p>
          </div>

          <div className="border border-border rounded divide-y divide-border bg-card">
            <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-baseline">
              <div className="md:col-span-3 text-xs font-mono text-primary font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4" /> 01 · WHEN TO ASK
              </div>
              <div className="md:col-span-9 text-sm text-muted-foreground leading-relaxed">
                Apprentice measures speech pauses and vision frame inactivity (2.5s silence threshold). Never interrupts typing, scrolling, or phone calls.
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-baseline">
              <div className="md:col-span-3 text-xs font-mono text-primary font-semibold flex items-center gap-2">
                <Compass className="h-4 w-4" /> 02 · WHAT TO ASK
              </div>
              <div className="md:col-span-9 text-sm text-muted-foreground leading-relaxed">
                Disregards values visible directly on screen. Inquires only about reasons, limits, exceptions, and the conditions under which an expert would escalate.
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-baseline">
              <div className="md:col-span-3 text-xs font-mono text-primary font-semibold flex items-center gap-2">
                <BrainCircuit className="h-4 w-4" /> 03 · UNDERSTANDING
              </div>
              <div className="md:col-span-9 text-sm text-muted-foreground leading-relaxed">
                Debrief algorithm identifies gaps in the decision tree. Closes them through targeted queries and delivers a tight teach-back that the expert approves.
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-baseline">
              <div className="md:col-span-3 text-xs font-mono text-primary font-semibold flex items-center gap-2">
                <GraduationCap className="h-4 w-4" /> 04 · LEARNING PROOF
              </div>
              <div className="md:col-span-9 text-sm text-muted-foreground leading-relaxed">
                Evaluated by running a fresh, unseen invoice with a new hire. Tutor catches boundary mistakes and proves self-correction without hardcoded guidance.
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-baseline">
              <div className="md:col-span-3 text-xs font-mono text-primary font-semibold flex items-center gap-2">
                <Lock className="h-4 w-4" /> 05 · TRUST & PRIVACY
              </div>
              <div className="md:col-span-9 text-sm text-muted-foreground leading-relaxed">
                Tactile &quot;Off the Record&quot; switch halts frame ingestion and audio recording. Structured PII (IBANs, personal tax numbers, names) is redacted prior to storage.
              </div>
            </div>
          </div>
        </section>

        {/* The Moonshot Slide */}
        <section id="moonshot" className="sketch-border bg-card p-8 sm:p-12 rounded space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase tracking-widest text-primary font-bold">FUTURE TRAJECTORY</span>
            <h2 className="text-2xl sm:text-4xl font-serif font-bold">The Moonshot: The World&apos;s Operations Manual</h2>
          </div>
          <p className="text-muted-foreground font-serif leading-relaxed max-w-3xl text-base sm:text-lg">
            The US Department of Labor&apos;s O*NET database lists 18,838 tasks across 1,016 occupations. Gartner expects over 40% of agentic AI initiatives to be canceled by 2027 due to inadequate risk controls and missing human judgment.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 text-sm">
            <div className="border border-border p-5 rounded space-y-2">
              <h4 className="font-serif font-bold text-foreground">Living Company Memory</h4>
              <p className="text-muted-foreground leading-relaxed">
                Instead of static SOPs that decay, every expert session updates a centralized living graph. When an ERP changes, the apprentice asks only about the delta.
              </p>
            </div>
            <div className="border border-border p-5 rounded space-y-2">
              <h4 className="font-serif font-bold text-foreground">People First, Then Autonomous Agents</h4>
              <p className="text-muted-foreground leading-relaxed">
                The identical guardrails that protect new hires allow autonomous software agents to process standard invoices safely, automatically escalating non-standard items back to humans.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Editorial Footer */}
      <footer className="border-t border-border bg-card/40 py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-mono text-muted-foreground">
          <div className="flex items-center gap-2">
            <Logo className="text-base" />
            <span>— PROTÉGÉ AI APPRENTICE</span>
          </div>
          <div>BUILT FOR HACK-NATION × ELEVENLABS 2026</div>
        </div>
      </footer>
    </div>
  );
}
