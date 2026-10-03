// New workflow as one sentence you fill in: who the expert is and which job
// Protégé should learn. The inputs sit inside the sentence.
import { useState } from "react";
import { useRouter } from "next/router";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/utils";
import { listScenarios } from "@/config/scenarios";

export async function getStaticProps() {
  return { props: { scenarios: listScenarios().map(({ id, label }) => ({ id, label })) } };
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

export default function NewWorkflow({ scenarios }) {
  const router = useRouter();
  const [form, setForm] = useState({ title: "Process supplier invoices", expertName: "Sabine", scenario: scenarios[0]?.id });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { workflow } = await api("/api/workflows", { method: "POST", body: form });
      router.push(`/workflows/${workflow._id}/capture`);
    } catch (err) {
      toast.error(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center px-6 py-10">
      <form onSubmit={submit} className="flex flex-col gap-10">
        <p className="m-0 text-[clamp(30px,4.4vw,48px)] font-semibold leading-[1.25] tracking-tight">
          Teach Protégé how <Blank id="expert" label="the expert" value={form.expertName} onChange={set("expertName")} /> handles{" "}
          <Blank id="task" label="a task" value={form.title} onChange={set("title")} required />.
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <label htmlFor="scenario" className="text-sm text-muted-foreground">Use case</label>
          <select
            id="scenario"
            value={form.scenario}
            onChange={set("scenario")}
            className="min-h-[40px] rounded-xl border border-border bg-card px-3 text-sm focus:border-foreground focus:outline-none focus:ring-0"
          >
            {scenarios.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <button type="submit" disabled={saving} className="btn btn-primary ml-auto gap-2 px-6 text-base disabled:opacity-50">
            {saving ? "Creating…" : "Start capture"} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        <p className="m-0 text-sm text-muted-foreground">
          Next, {form.expertName || "the expert"} shares their screen and works as usual. Protégé stays quiet and asks why at natural pauses.
        </p>
      </form>
    </div>
  );
}
