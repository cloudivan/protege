import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, AlertCircle, CheckCircle2, Play, Volume2, ShieldCheck, HelpCircle } from "lucide-react";
import { Logo } from "@/components/Logo";

export default function TeachSimulator() {
  const [costCenter, setCostCenter] = useState("");
  const [interception, setInterception] = useState(false);
  const [showReplay, setShowReplay] = useState(false);
  const [mastered, setMastered] = useState(false);
  const [tutorSpeech, setTutorSpeech] = useState(
    "Hi Lena. I am watching your screen. We have a new invoice from Trumpf GmbH for €7,200. How would you code this?"
  );

  const handleSave = (e) => {
    e.preventDefault();
    if (costCenter === "4711") {
      // Wrong decision! Intercept before saving
      setInterception(true);
      setTutorSpeech("Sabine would stop here. Why do you think?");
    } else if (costCenter === "0400") {
      setInterception(false);
      setMastered(true);
      setTutorSpeech("Spot on! Equipment over €5,000 is always capex. You mastered Sabine's rule.");
    }
  };

  const applyCorrection = () => {
    setCostCenter("0400");
    setInterception(false);
    setMastered(true);
    setTutorSpeech("Spot on! Equipment over €5,000 is always capex. You mastered Sabine's rule.");
  };

  return (
    <div className="min-h-screen bg-background paper-grid text-foreground">
      {/* Editorial Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/workflows" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Logo className="text-lg" />
          <span className="text-xs uppercase tracking-widest px-2 py-0.5 rounded bg-primary/10 text-primary font-mono">
            Module 3 · Voice Tutor
          </span>
        </div>
        <div className="text-xs font-mono text-muted-foreground">
          Learner: <span className="text-foreground font-semibold">Lena (New Hire)</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: The Sandbox ERP Workspace */}
        <section className="lg:col-span-7 space-y-6">
          <div className="sketch-border bg-card p-6 rounded-lg space-y-5">
            <div className="flex justify-between items-start border-b border-border pb-4">
              <div>
                <span className="text-xs font-mono text-muted-foreground">SANDBOX ERP · INVOICE ENTRY</span>
                <h1 className="text-xl font-serif font-bold text-foreground mt-1">Invoice #INV-5120</h1>
              </div>
              <span className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 font-mono px-2 py-1 rounded">
                Unprocessed
              </span>
            </div>

            {/* Invoice Details */}
            <div className="grid grid-cols-2 gap-4 text-sm bg-muted/40 p-4 rounded border border-border">
              <div>
                <div className="text-xs text-muted-foreground">Vendor</div>
                <div className="font-medium">Trumpf GmbH & Co. KG</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Amount</div>
                <div className="font-mono text-base font-bold text-primary">€7,200.00 EUR</div>
              </div>
              <div className="col-span-2">
                <div className="text-xs text-muted-foreground">Description</div>
                <div className="font-medium">CNC Laser Cutting Head (Model TX-400) · Replacement Unit</div>
              </div>
            </div>

            {/* Interactive Form */}
            <form onSubmit={handleSave} className="space-y-5 pt-2">
              <div className={`p-4 rounded transition-all ${interception ? "sketch-border-alert bg-primary/5" : ""}`}>
                <label className="block text-sm font-medium mb-1">
                  Cost Center Allocation <span className="text-destructive">*</span>
                </label>
                <select
                  value={costCenter}
                  onChange={(e) => setCostCenter(e.target.value)}
                  className="w-full border border-input bg-background p-2.5 rounded text-sm focus:ring-2 focus:ring-primary outline-none"
                  required
                >
                  <option value="">Select cost center...</option>
                  <option value="4711">4711 · Standard Operational Expense (Opex)</option>
                  <option value="0400">0400 · Capital Expenditure (Capex / Fixed Asset)</option>
                  <option value="8800">8800 · Facility & Maintenance</option>
                </select>

                {interception && (
                  <div className="mt-3 flex items-start gap-2 text-xs text-primary font-medium animate-fadeIn">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>Tutor intercepted before save: Sabine's guardrail applies here!</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={mastered}
                  className="px-5 py-2.5 rounded bg-primary text-white text-sm font-medium hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
                >
                  {mastered ? "Invoice Booked & Confirmed" : "Approve & Book Invoice"}
                </button>
                {interception && (
                  <button
                    type="button"
                    onClick={applyCorrection}
                    className="px-4 py-2.5 rounded border border-primary text-primary text-sm font-medium hover:bg-primary/10 transition"
                  >
                    Change to Capex (0400)
                  </button>
                )}
              </div>
            </form>
          </div>
        </section>

        {/* Right: The Claude-style Tutor Companion */}
        <section className="lg:col-span-5 space-y-6">
          <div className="sketch-border bg-card p-6 rounded-lg space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-serif font-bold text-sm">Protégé Voice Tutor</span>
              </div>
              <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                <Volume2 className="h-3.5 w-3.5" /> ElevenAgents Active
              </span>
            </div>

            {/* Tutor Speech Bubble */}
            <div className="p-4 rounded-md bg-muted/60 border border-border space-y-2">
              <div className="text-xs uppercase font-mono tracking-wider text-muted-foreground">Tutor Coaching</div>
              <p className="text-sm font-serif italic text-foreground leading-relaxed">&ldquo;{tutorSpeech}&rdquo;</p>
            </div>

            {/* Interception Card with Sabine's Replay */}
            {interception && (
              <div className="border border-primary/30 bg-primary/5 p-4 rounded-md space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-primary flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" /> GUARDRAIL TRIGGERED
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground">Step 4 of Work Map</span>
                </div>
                <p className="text-xs text-foreground">
                  The learner attempted to book an item over €5,000 to operational expense (Opex).
                </p>
                <button
                  type="button"
                  onClick={() => setShowReplay(!showReplay)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded bg-card border border-border text-xs font-medium hover:bg-muted transition"
                >
                  <Play className="h-3 w-3 fill-current text-primary" />
                  {showReplay ? "Hide Sabine's Screen Moment" : "Replay Sabine's Screen Moment (03:12)"}
                </button>

                {showReplay && (
                  <div className="p-3 bg-card border border-border rounded text-xs space-y-2 animate-fadeIn">
                    <div className="text-muted-foreground font-mono">Timestamp: 03:12 · Invoice 4471</div>
                    <div className="border-l-2 border-primary pl-2 italic font-serif text-foreground">
                      &ldquo;Equipment over €5,000 is always capex. Unknown supplier or no asset number, stop and ask the controller.&rdquo;
                    </div>
                    <div className="text-[10px] text-muted-foreground">— Sabine (Senior AP Specialist)</div>
                  </div>
                )}
              </div>
            )}

            {/* Mastery Card */}
            {mastered && (
              <div className="border border-emerald-500/30 bg-emerald-500/5 p-4 rounded-md space-y-2 animate-fadeIn">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-medium text-xs">
                  <CheckCircle2 className="h-4 w-4" /> Guardrail Mastered
                </div>
                <p className="text-xs text-muted-foreground">
                  Lena successfully identified and corrected the €5,000 Capex threshold independently. Ready for production ledger.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
