import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// House style: no em dashes in displayed text. Agent/LLM output loves them,
// so sanitize at render time.
export function noEmDash(text) {
  return (text || "").replace(/\s*\u2014\s*/g, ", ");
}

// ms since session start -> "mm:ss" (the screen-moment label format)
export function fmtAt(ms = 0) {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export async function api(url, { method = "GET", body } = {}) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // status and data ride along, e.g. { needsTopic: true } for the demo.
    throw Object.assign(new Error(data.error || `Request failed: ${res.status}`), { status: res.status, data });
  }
  return data;
}

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
