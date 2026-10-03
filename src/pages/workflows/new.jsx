// New workflow: any task, any use case, in the user's own words. The backend
// turns the use case into a domain profile for the agents. The invoices
// preset additionally brings the sandbox ERP and demo cases.
import { useState } from "react";
import { useRouter } from "next/router";
import { toast } from "sonner";
import { api } from "@/lib/utils";
import { listScenarios } from "@/config/scenarios";

const EXAMPLES = [
  "Insurance claims triage at a car insurer",
  "Purchase order approvals in procurement",
  "Support escalations for a SaaS product",
  "KYC checks when onboarding business customers",
];

export async function getStaticProps() {
  return { props: { presets: listScenarios().map(({ id, label }) => ({ id, label })) } };
}

export default function NewWorkflow({ presets }) {
  const router = useRouter();
  const [form, setForm] = useState({ title: "", expertName: "", useCase: "", scenario: "custom" });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value, ...(k === "useCase" && { scenario: "custom" }) }));

  const usePreset = (p) =>
    setForm({ title: "Process supplier invoices", expertName: "Sabine", useCase: p.label, scenario: p.id });

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

  const field = "mt-1 w-full border border-input bg-background px-3 py-2 text-sm";
  const chip = "rounded border border-border bg-card px-2 py-1 text-xs hover:bg-muted";
  return (
    <div className="mx-auto max-w-xl px-6 py-6">
      <h1 className="font-display text-2xl font-bold">New workflow</h1>
      <form onSubmit={submit} className="card mt-6 space-y-4 p-5">
        <label className="block text-sm">
          Task
          <input value={form.title} onChange={set("title")} placeholder="e.g. Triage new car damage claims" className={field} required />
        </label>
        <label className="block text-sm">
          Expert
          <input value={form.expertName} onChange={set("expertName")} placeholder="Who does this best today?" className={field} />
        </label>
        <label className="block text-sm">
          Use case
          <textarea
            value={form.useCase}
            onChange={set("useCase")}
            rows={2}
            placeholder="What kind of work is this, and where? Any desk work fits."
            className={field}
            required
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((x) => (
            <button key={x} type="button" className={chip} onClick={() => setForm((f) => ({ ...f, useCase: x, scenario: "custom" }))}>{x}</button>
          ))}
          {presets.map((p) => (
            <button key={p.id} type="button" className={`${chip} border-primary/40`} onClick={() => usePreset(p)}>
              Demo: {p.label} (with sandbox)
            </button>
          ))}
        </div>
        <button type="submit" disabled={saving} className="btn btn-primary disabled:opacity-50">
          {saving ? "Preparing Protégé for this use case…" : "Create and start learning"}
        </button>
      </form>
    </div>
  );
}
