import { fmtAt } from "@/lib/utils";

export default function EventFeed({ events }) {
  return (
    <section className="card p-5">
      <h2 className="font-semibold">Screen events</h2>
      {events.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Nothing yet. Events appear as the screen changes.</p>
      ) : (
        <ol className="mt-3 max-h-72 space-y-1 overflow-y-auto text-sm scrollbar-subtle">
          {events.map((e, i) => (
            <li key={i} className="flex gap-3">
              <span className="font-mono text-xs text-muted-foreground">{fmtAt(e.at)}</span>
              <span>{e.summary}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
