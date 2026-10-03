import { useState } from "react";
import { useRouter } from "next/router";
import { toast } from "sonner";
import { api } from "@/lib/utils";
import { listScenarios } from "@/config/scenarios";

export async function getStaticProps() {
  return { props: { scenarios: listScenarios().map(({ id, label }) => ({ id, label })) } };
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

  const field = "mt-1 w-full border border-input bg-background px-3 py-2 text-sm";
  return (
    <div className="mx-auto max-w-xl px-6 py-6">
      <h1 className="font-display text-2xl font-bold">New workflow</h1>
      <form onSubmit={submit} className="card mt-6 space-y-4 p-5">
        <label className="block text-sm">Task<input value={form.title} onChange={set("title")} className={field} required /></label>
        <label className="block text-sm">Expert<input value={form.expertName} onChange={set("expertName")} className={field} /></label>
        <label className="block text-sm">
          Use case
          <select value={form.scenario} onChange={set("scenario")} className={field}>
            {scenarios.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
        <button type="submit" disabled={saving} className="btn btn-primary disabled:opacity-50">{saving ? "Creating…" : "Start capture"}</button>
      </form>
    </div>
  );
}
