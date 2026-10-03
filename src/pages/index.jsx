import Link from "next/link";
import {
  ArrowRight,
  Shield,
  Layers,
  Eye,
  BrainCircuit,
  GraduationCap,
  Lock,
  CheckCircle,
  FileText,
  Play,
  Activity,
  Workflow,
  Sparkles
} from "lucide-react";
import { Logo } from "@/components/Logo";

export default function Home() {
  return (
    <div className="min-h-screen bg-background paper-grid text-foreground antialiased selection:bg-primary/10 selection:text-primary">
      {/* Top Enterprise Banner */}
      <div className="border-b border-border bg-muted/30 px-6 py-2 text-xs font-mono text-muted-foreground flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>PROTÉGÉ ENTERPRISE PLATFORM</span>
        </div>
        <div className="flex items-center gap-6">
          <span>SOC-2 TYPE II READY</span>
          <span className="hidden sm:inline">ZERO-PII INGESTION</span>
        </div>
      </div>

      {/* Main Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Logo className="text-xl" />
            <nav className="hidden md:flex items-center gap-8 text-xs font-mono text-muted-foreground">
              <a href="#platform" className="hover:text-foreground transition-colors">PLATFORM</a>
              <a href="#solutions" className="hover:text-foreground transition-colors">SOLUTIONS</a>
              <a href="#security" className="hover:text-foreground transition-colors">SECURITY & COMPLIANCE</a>
              <a href="#network" className="hover:text-foreground transition-colors">ENTERPRISE MEMORY</a>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/sandbox/erp"
              className="text-xs font-mono px-3.5 py-1.5 rounded border border-border hover:bg-muted transition-colors inline-flex items-center gap-2"
            >
              <FileText className="h-3.5 w-3.5 text-muted-foreground" /> Interactive Sandbox
            </Link>
            <Link
              href="/workflows/demo/teach"
              className="text-xs font-medium px-4 py-1.5 rounded bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm inline-flex items-center gap-2"
            >
              Interactive Demo <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-24 pb-32 space-y-32">
        <section className="max-w-4xl space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-border bg-card text-xs font-mono text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-primary" />
            TACIT KNOWLEDGE CAPTURE &amp; LIVE OPERATIONAL COACHING
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-serif font-bold tracking-tight text-foreground leading-[1.06] [text-wrap:balance]">
            Capture tacit operational knowledge before it walks out the door.
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground font-serif leading-relaxed max-w-3xl [text-wrap:pretty]">
            Over 30% of skilled enterprise operations depend on unwritten judgment calls that exist only in senior operators&apos; heads. Protégé passively observes screen workflows, identifies tacit decision rules during natural pauses, generates verified Work Maps, and coaches incoming operators in real time.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href="/workflows/demo/teach"
              className="inline-flex items-center gap-2 px-6 py-3 rounded bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Play className="h-4 w-4 fill-current" /> Experience Live Coaching Session
            </Link>
            <Link
              href="/sandbox/erp"
              className="inline-flex items-center gap-2 px-6 py-3 rounded border border-border bg-card text-foreground font-medium text-sm hover:bg-muted transition-colors"
            >
              Open Sandbox Environment <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        </section>

        {/* The Enterprise Problem: Tacit Knowledge Decay */}
        <section id="solutions" className="space-y-8 pt-8 border-t border-border">
          <div className="flex justify-between items-baseline flex-wrap gap-2">
            <div className="space-y-1">
              <span className="text-xs font-mono uppercase tracking-widest text-primary font-bold">THE WORKFORCE TRANSITION</span>
              <h2 className="text-3xl font-serif font-bold">Standard Operating Procedures Fail at the Margins</h2>
            </div>
            <span className="text-xs font-mono text-muted-foreground">Enterprise Operations Analysis</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="sketch-border bg-card p-6 rounded space-y-3">
              <div className="text-xs font-mono text-muted-foreground border-b border-border pb-2">
                01 · PASSIVE SCREEN RECORDINGS
              </div>
              <h3 className="font-serif font-bold text-lg">Recordings Capture Clicks, Not Intent</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Task mining and session replays record pixel coordinates and mouse actions. They cannot differentiate between an established regulatory limit, a personal habit, or an unrecorded exception.
              </p>
            </div>

            <div className="sketch-border bg-card p-6 rounded space-y-3">
              <div className="text-xs font-mono text-muted-foreground border-b border-border pb-2">
                02 · STATIC DOCUMENTATION
              </div>
              <h3 className="font-serif font-bold text-lg">Static SOPs Decay Instantly</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Written process documentation documents standard paths only. Critical organizational knowledge—such as high-risk suppliers, audit limits, and escalation triggers—is learned through trial and error.
              </p>
            </div>

            <div className="sketch-border bg-card p-6 rounded space-y-3 border-primary/40 bg-primary/[0.02]">
              <div className="text-xs font-mono text-primary font-bold border-b border-border pb-2">
                03 · THE PROTÉGÉ PLATFORM
              </div>
              <h3 className="font-serif font-bold text-lg">Continuous Knowledge Mapping</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Observes expert operators live, initiates low-frequency spoken inquiries during confirmed pauses, and extracts binding business rules with exact video timestamps and verbatim quotes.
              </p>
            </div>
          </div>
        </section>

        {/* 3 Core Architecture Pillars */}
        <section id="platform" className="space-y-10 pt-8 border-t border-border">
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase tracking-widest text-primary font-bold">CORE CAPABILITIES</span>
            <h2 className="text-3xl font-serif font-bold">The Three-Pillar Lifecycle</h2>
            <p className="text-sm text-muted-foreground font-serif max-w-2xl">
              An end-to-end framework transforming undocumented desk expertise into real-time operational safety and institutional memory.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Stage 1 */}
            <div className="sketch-border bg-card p-7 rounded space-y-5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">STAGE 01</span>
                <Eye className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-xl font-serif font-bold">Non-Intrusive Capture</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                High-efficiency differential frame sampling detects visual state transitions. Voice activity detection and UI cadence listeners ensure the system remains completely quiet while operators read or type.
              </p>
              <div className="space-y-2 text-xs font-mono bg-muted/50 p-3 rounded border border-border">
                <div className="text-muted-foreground">CADENCE PROTOCOL</div>
                <div className="text-foreground">2.5s minimum sustained pause detection</div>
                <div className="text-primary">Targeted solely at boundary conditions</div>
              </div>
            </div>

            {/* Stage 2 */}
            <div className="sketch-border bg-card p-7 rounded space-y-5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">STAGE 02</span>
                <Layers className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-xl font-serif font-bold">Work Map Synthesis</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Post-session debriefing clarifies ambiguous steps. The synthesis engine anchors every decision and guardrail to an exact screen moment and the operator&apos;s literal words, generating a deterministic Work Map.
              </p>
              <div className="space-y-2 text-xs font-mono bg-muted/50 p-3 rounded border border-border">
                <div className="text-muted-foreground">DETERMINISTIC LINKAGE</div>
                <div className="text-foreground">Exact video moment + verbatim audio cite</div>
                <div className="text-primary">Exportable to autonomous AI agents</div>
              </div>
            </div>

            {/* Stage 3 */}
            <div className="sketch-border bg-card p-7 rounded space-y-5 border-primary/50 bg-primary/[0.02]">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">STAGE 03</span>
                <GraduationCap className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-xl font-serif font-bold">Real-Time Voice Coaching</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                During onboarding, the voice tutor guides new hires through production workflows. When an operator approaches a known failure mode, the system intercepts the transaction before database commit.
              </p>
              <div className="space-y-2 text-xs font-mono bg-muted/50 p-3 rounded border border-border">
                <div className="text-muted-foreground">PRE-COMMIT INTERCEPTION</div>
                <div className="text-foreground">Catches rule violations in-flight</div>
                <div className="text-primary">Instant replay of senior operator precedent</div>
              </div>
            </div>
          </div>
        </section>

        {/* Security & Trust */}
        <section id="security" className="space-y-8 pt-8 border-t border-border">
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase tracking-widest text-primary font-bold">ENTERPRISE GOVERNANCE</span>
            <h2 className="text-3xl font-serif font-bold">Engineered for Regulated Operations</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-border bg-card p-6 rounded space-y-3">
              <Lock className="h-5 w-5 text-primary" />
              <h4 className="font-serif font-bold text-base">Off-the-Record Protocol</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Operators can trigger an instant privacy freeze at any time. Screen ingestion and transcript generation halt immediately, leaving zero artifacts in permanent storage.
              </p>
            </div>

            <div className="border border-border bg-card p-6 rounded space-y-3">
              <Shield className="h-5 w-5 text-primary" />
              <h4 className="font-serif font-bold text-base">Automatic PII Redaction</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Structured recognition strips financial identifiers, IBANs, taxpayer IDs, and private customer information before any transcript is indexed into the company Work Map.
              </p>
            </div>

            <div className="border border-border bg-card p-6 rounded space-y-3">
              <BrainCircuit className="h-5 w-5 text-primary" />
              <h4 className="font-serif font-bold text-base">Agent-Ready Guardrails</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The identical rules and limits extracted from human experts export directly as safety bounds for autonomous agent execution, preventing rogue decisions.
              </p>
            </div>
          </div>
        </section>

        {/* Long-Term Enterprise Memory */}
        <section id="network" className="sketch-border bg-card p-8 sm:p-12 rounded space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase tracking-widest text-primary font-bold">STRATEGIC HORIZON</span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold">The Living Enterprise Memory</h2>
          </div>
          <p className="text-muted-foreground font-serif leading-relaxed max-w-3xl text-base sm:text-lg">
            Instead of fractured wikis and static knowledge bases that decay, Protégé continuously refreshes operational workflows. When software versions or enterprise policies update, the platform queries operators exclusively on the delta.
          </p>
          <div className="pt-2">
            <Link
              href="/workflows/demo/teach"
              className="inline-flex items-center gap-2 text-sm font-mono text-primary font-semibold hover:underline"
            >
              Explore the Accounts Payable Workflow Demo <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      {/* Enterprise Footer */}
      <footer className="border-t border-border bg-card/40 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-mono text-muted-foreground">
          <div className="flex items-center gap-2">
            <Logo className="text-base" />
            <span>· ENTERPRISE OPERATIONAL KNOWLEDGE PLATFORM</span>
          </div>
          <div>CONFIDENTIAL &amp; PROPRIETARY · ALL RIGHTS RESERVED</div>
        </div>
      </footer>
    </div>
  );
}
