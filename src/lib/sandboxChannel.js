// The sandbox ERP (/sandbox/erp) runs in its own tab so it can be screen
// shared. It talks to the capture / teach page in the other tab over a
// same-origin BroadcastChannel. Messages:
//   { type: "event",   event: { type, summary, invoice } }   every user action
//   { type: "verdict", event, verdict }                      teach: guardrail check result
//   { type: "done" }                                         all cases processed
export const SANDBOX_CHANNEL = "protege-sandbox";

export function openSandboxChannel(onMessage) {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) return { post: () => {}, close: () => {} };
  const ch = new BroadcastChannel(SANDBOX_CHANNEL);
  if (onMessage) ch.onmessage = (e) => onMessage(e.data);
  return { post: (msg) => ch.postMessage(msg), close: () => ch.close() };
}
