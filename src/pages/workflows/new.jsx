// New workflow as one sentence you fill in: who the expert is, which job
// Protégé should learn, and the kind of work it is. The inputs sit inside the
// sentence. The use case is free text; the backend turns it into a domain
// profile for the agents. The invoices demo additionally brings the sandbox ERP.
import { useState } from "react";
import { useRouter } from "next/router";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/utils";
import { listScenarios } from "@/config/scenarios";

const EXAMPLES = [
  "insurance claims triage at a car insurer",
  "purchase order approvals in procurement",
  "support escalations for a SaaS product",
  "KYC checks when onboarding business customers",
];

export async function getStaticProps() {
  return { props: { presets: listScenarios().map(({ id, label }) => ({ id, label })) } };
}

// An input that grows with its text, drawn as an underlined blank. The hidden
// span sizes it; size={1} drops the input's default width of about 20 characters.
function Blank({ id, label, value, onChange, required }) {
  return (
    <span className="relative inline-grid align-baseline">
      <span aria-hidden="true" className="invisible col-start-1 row-start-1 whitespace-pre px-1">{value || label}</span>
      <input
        id={id}
        aria-label={label}
        value={value}
        onChange={onChange}
        placeholder={label}
        required={required}
        size={1}
        style={{ font: "inherit", letterSpacing: "inherit", lineHeight: "inherit" }}
        className="col-start-1 row-start-1 w-full min-w-0 border-0 border-b-2 border-primary-400 bg-transparent px-1 py-0 text-primary placeholder:text-muted-foreground/50 focus:border-foreground focus:outline-none focus:ring-0"
      />
    </span>
  );
}

export default function NewWorkflow({ presets }) {
  const router = useRouter();
  const [form, setForm] = useState({ title: "", expertName: "", useCase: "", scenario: "custom" });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value, ...(k === "useCase" && { scenario: "custom" }) }));

  const usePreset = (p) =>
    setForm({ title: "processing supplier invoices", expertName: "Sabine", useCase: p.label, scenario: p.id });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { workflow } = await api("/api/workflows", { method: "POST", body: form });
      router.push(`/workflows/${workflow._id}/learn`);
    } catch (err) {
      toast.error(err.message);
      setSaving(false);
    }
  };

  const chip = "rounded-xl border border-border bg-card px-3 py-1.5 text-xs hover:border-foreground";
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center px-6 py-10">
      <form onSubmit={submit} className="flex flex-col gap-10">
        <p className="m-0 text-[clamp(30px,4.4vw,48px)] font-semibold leading-[1.25] tracking-tight">
          Teach Protégé how <Blank id="expert" label="the expert" value={form.expertName} onChange={set("expertName")} /> handles{" "}
          <Blank id="task" label="a task" value={form.title} onChange={set("title")} required /> in{" "}
          <Blank id="usecase" label="their kind of work" value={form.useCase} onChange={set("useCase")} required />.
        </p>

        <div className="flex flex-col gap-3">
          <span className="text-sm text-muted-foreground">Any desk work fits. For example:</span>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((x) => (
              <button key={x} type="button" className={chip} onClick={() => setForm((f) => ({ ...f, useCase: x, scenario: "custom" }))}>
                {x}
              </button>
            ))}
            {presets.map((p) => (
              <button key={p.id} type="button" className={`${chip} border-primary/40`} onClick={() => usePreset(p)}>
                Demo: {p.label}, with a sandbox
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <p className="m-0 max-w-md text-sm text-muted-foreground">
            Next, {form.expertName || "the expert"} shares their screen and works as usual. Protégé stays quiet and asks why at natural pauses.
          </p>
          <button type="submit" disabled={saving} className="btn btn-primary ml-auto gap-2 px-6 text-base disabled:opacity-50">
            {saving ? "Preparing Protégé…" : "Start learning"} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
