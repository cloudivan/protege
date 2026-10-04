// New workflow as one sentence you fill in: which senior doctor, which
// workflow, and the kind of clinical work. Everything is free text; the
// backend turns the use case into a domain profile for the agents. The
// examples only fill the blank, they are not presets.
import { useState } from "react";
import { useRouter } from "next/router";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/utils";

const EXAMPLES = [
  "discharge letters on an internal medicine ward",
  "anticoagulation before elective surgery",
  "triage of chest pain in the emergency department",
  "ordering and reviewing imaging for suspected PE",
];

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

export default function NewWorkflow() {
  const router = useRouter();
  const [form, setForm] = useState({ title: "", expertName: "", useCase: "" });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

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
          Teach Protégé how <Blank id="expert" label="the senior doctor" value={form.expertName} onChange={set("expertName")} /> handles{" "}
          <Blank id="task" label="a workflow" value={form.title} onChange={set("title")} required /> in{" "}
          <Blank id="usecase" label="their clinical work" value={form.useCase} onChange={set("useCase")} required />.
        </p>

        <div className="flex flex-col gap-3">
          <span className="text-sm text-muted-foreground">Any clinical desk workflow fits. For example:</span>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((x) => (
              <button key={x} type="button" className={chip} onClick={() => setForm((f) => ({ ...f, useCase: x }))}>
                {x}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <p className="m-0 max-w-md text-sm text-muted-foreground">
            Next, {form.expertName || "the senior doctor"} shares their screen and works as usual, with test or fictional patients. Protégé stays quiet and asks why at natural pauses.
          </p>
          <button type="submit" disabled={saving} className="btn btn-primary ml-auto gap-2 px-6 text-base disabled:opacity-50">
            {saving ? "Preparing Protégé…" : "Start learning"} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
