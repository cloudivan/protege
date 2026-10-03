// Sandbox ERP: the screen the expert (capture) or new hire (teach) works in.
// Open in its own tab and screen-share that tab. Fake data only.
//
//   /sandbox/erp?set=capture                     Sabine's three invoices
//   /sandbox/erp?set=teach&session=<sessionId>   the new hire's unseen case
//
// Every action is broadcast to the Protégé tab (src/lib/sandboxChannel.js).
// In a teach session every commit (post / hold / send) is checked against the
// Work Map FIRST; a violation blocks the save so the tutor can step in.

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import getScenario from "@/config/scenarios";
import { api } from "@/lib/utils";
import { openSandboxChannel } from "@/lib/sandboxChannel";

const ACTIONS = {
  posted: { label: "Post", verb: "posted" },
  held: { label: "Hold", verb: "held" },
  sent_for_approval: { label: "Send for 2nd approval", verb: "sent for second approval" },
};

const STATUS_STYLE = {
  open: "bg-blue-100 text-blue-800",
  posted: "bg-green-100 text-green-800",
  held: "bg-amber-100 text-amber-800",
  sent_for_approval: "bg-purple-100 text-purple-800",
};

const eur = (n, currency = "EUR") => new Intl.NumberFormat("de-DE", { style: "currency", currency }).format(n);

export default function SandboxErp() {
  const { query, isReady } = useRouter();
  const scenario = getScenario(query.scenario || "invoices");
  const set = query.set === "teach" ? "teach" : "capture";
  const sessionId = query.session;
  const checkSaves = set === "teach" && Boolean(sessionId);

  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [checking, setChecking] = useState(false);
  const [blocked, setBlocked] = useState(null);
  const channel = useRef(null);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    if (!isReady || !scenario) return;
    setRows(scenario.cases[set].map((c) => ({ ...c, costCenter: "", assetNumber: "", note: "", status: "open" })));
  }, [isReady, scenario, set]);

  useEffect(() => {
    channel.current = openSandboxChannel();
    return () => channel.current.close();
  }, []);

  const selected = useMemo(() => rows.find((r) => r.id === selectedId), [rows, selectedId]);

  const emit = (event) => channel.current?.post({ type: "event", event });
  const snapshot = (r) => ({
    id: r.id,
    date: r.date,
    supplier: r.supplier,
    amount: r.amount,
    currency: r.currency,
    item: r.item,
    costCenter: r.costCenter || null,
    assetNumber: r.assetNumber || null,
    note: r.note || null,
  });

  const open = (r) => {
    setSelectedId(r.id);
    setBlocked(null);
    emit({ type: "opened_record", summary: `invoice ${r.id} opened (${r.supplier}, ${eur(r.amount, r.currency)}, ${r.item})`, invoice: snapshot(r) });
  };

  const change = (field, value, label) => {
    const next = { ...selected, [field]: value };
    setRows((rs) => rs.map((r) => (r.id === selected.id ? next : r)));
    setBlocked(null);
    emit({ type: "field_changed", summary: `${label} set to ${value || "(empty)"} on invoice ${selected.id}`, invoice: snapshot(next) });
  };

  const commit = async (type) => {
    const r = selected;
    const summary = `invoice ${r.id} ${ACTIONS[type].verb}${r.costCenter ? ` with cost center ${r.costCenter}` : ""}${r.assetNumber ? `, asset ${r.assetNumber}` : ", no asset number"}`;
    const event = { type, summary, invoice: snapshot(r) };

    if (checkSaves) {
      setChecking(true);
      try {
        const { verdict } = await api(`/api/sessions/${sessionId}/guardrail-check`, {
          method: "POST",
          body: { at: Date.now() - startedAt.current, action: event },
        });
        channel.current?.post({ type: "verdict", event, verdict });
        if (verdict.violation) {
          setBlocked(verdict);
          return;
        }
      } catch (e) {
        // A failed check must not freeze the demo: let the save through.
        console.warn("guardrail check failed", e);
      } finally {
        setChecking(false);
      }
    } else {
      emit(event);
    }

    const nextRows = rows.map((x) => (x.id === r.id ? { ...x, status: type } : x));
    setRows(nextRows);
    setSelectedId(null);
    if (nextRows.every((x) => x.status !== "open")) channel.current?.post({ type: "done" });
  };

  if (!scenario) return <p className="p-6">Unknown scenario.</p>;

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-[13px] text-slate-900">
      <header className="flex items-center gap-4 bg-slate-800 px-4 py-2 text-white">
        <span className="font-semibold">{scenario.sandbox.title}</span>
        <span className="text-slate-300">Invoice inbox</span>
        <span className="ml-auto rounded bg-amber-400 px-2 py-0.5 text-[11px] font-semibold text-slate-900">SANDBOX · fake data</span>
      </header>

      <div className="grid gap-4 p-4 lg:grid-cols-[1fr_1.2fr]">
        <section className="border border-slate-300 bg-white">
          <div className="border-b border-slate-300 bg-slate-50 px-3 py-2 font-semibold">Open items ({rows.filter((r) => r.status === "open").length})</div>
          <table className="w-full">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="px-3 py-1.5 font-medium">Invoice</th>
                <th className="px-3 py-1.5 font-medium">Date</th>
                <th className="px-3 py-1.5 font-medium">Supplier</th>
                <th className="px-3 py-1.5 text-right font-medium">Amount</th>
                <th className="px-3 py-1.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => r.status === "open" && open(r)}
                  className={`border-t border-slate-200 ${r.status === "open" ? "cursor-pointer hover:bg-blue-50" : "text-slate-400"} ${r.id === selectedId ? "bg-blue-100" : ""}`}
                >
                  <td className="px-3 py-1.5 font-mono">{r.id}</td>
                  <td className="px-3 py-1.5">{r.date}</td>
                  <td className="px-3 py-1.5">{r.supplier}</td>
                  <td className="px-3 py-1.5 text-right">{eur(r.amount, r.currency)}</td>
                  <td className="px-3 py-1.5">
                    <span className={`rounded px-1.5 py-0.5 text-[11px] ${STATUS_STYLE[r.status]}`}>{r.status.replace(/_/g, " ")}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="border border-slate-300 bg-white">
          <div className="border-b border-slate-300 bg-slate-50 px-3 py-2 font-semibold">
            {selected ? `Invoice ${selected.id}` : "No invoice selected"}
          </div>
          {selected ? (
            <div className="space-y-3 p-4">
              <dl className="grid grid-cols-[120px_1fr] gap-y-1">
                <dt className="text-slate-500">Supplier</dt><dd>{selected.supplier}</dd>
                <dt className="text-slate-500">Invoice date</dt><dd>{selected.date}</dd>
                <dt className="text-slate-500">Item</dt><dd>{selected.item}</dd>
                <dt className="text-slate-500">Amount (net)</dt><dd className="font-semibold">{eur(selected.amount, selected.currency)}</dd>
              </dl>

              <label className="block">
                <span className="text-slate-500">Cost center</span>
                <select
                  value={selected.costCenter}
                  onChange={(e) => change("costCenter", e.target.value, "cost center")}
                  className="mt-1 block w-full border border-slate-300 px-2 py-1.5"
                >
                  <option value="">Choose…</option>
                  {scenario.sandbox.costCenters.map((c) => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-slate-500">Asset number (capex only)</span>
                <input
                  value={selected.assetNumber}
                  onChange={(e) => setRows((rs) => rs.map((r) => (r.id === selected.id ? { ...r, assetNumber: e.target.value } : r)))}
                  onBlur={(e) => change("assetNumber", e.target.value, "asset number")}
                  placeholder="e.g. AN-2026-0113"
                  className="mt-1 block w-full border border-slate-300 px-2 py-1.5"
                />
              </label>

              <label className="block">
                <span className="text-slate-500">Note</span>
                <input
                  value={selected.note}
                  onChange={(e) => setRows((rs) => rs.map((r) => (r.id === selected.id ? { ...r, note: e.target.value } : r)))}
                  onBlur={(e) => e.target.value && change("note", e.target.value, "note")}
                  className="mt-1 block w-full border border-slate-300 px-2 py-1.5"
                />
              </label>

              {blocked && (
                <div className="border border-red-300 bg-red-50 p-3 text-red-900">
                  <p className="font-semibold">Save stopped. Protégé wants a word first.</p>
                  {blocked.explanation && <p className="mt-1">{blocked.explanation}</p>}
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                {Object.entries(ACTIONS).map(([type, a]) => (
                  <button
                    key={type}
                    type="button"
                    disabled={checking}
                    onClick={() => commit(type)}
                    className={`border px-3 py-1.5 font-medium disabled:opacity-50 ${type === "posted" ? "border-blue-700 bg-blue-600 text-white hover:bg-blue-700" : "border-slate-300 bg-white hover:bg-slate-50"}`}
                  >
                    {a.label}
                  </button>
                ))}
                {checking && <span className="self-center text-slate-500">Checking…</span>}
              </div>
            </div>
          ) : (
            <p className="p-4 text-slate-500">Pick an invoice from the list.</p>
          )}
        </section>
      </div>
    </div>
  );
}
