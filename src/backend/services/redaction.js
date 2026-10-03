// Trust: redact personal data from transcripts before they are stored.
// TODO(trust): swap for Microsoft Presidio (github.com/microsoft/presidio) for
// names/addresses. Regexes cover the obvious structured cases for now.

const PATTERNS = [
  [/\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){3,7}\b/g, "[IBAN]"],
  [/\b[\w.+-]+@[\w-]+\.[\w.]+\b/g, "[EMAIL]"],
  [/\+?\d[\d\s/-]{8,}\d/g, "[PHONE]"],
];

export function redact(text = "") {
  return PATTERNS.reduce((t, [re, label]) => t.replace(re, label), text);
}
