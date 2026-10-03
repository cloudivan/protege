// Module 1: screen frame -> events. The vision model returns events, not
// video. We pass the last few events so it only reports what CHANGED.

import { extractStructured } from "@/backend/services/llm";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    changed: { type: "boolean", description: "False if nothing meaningful changed since the previous events." },
    activity: {
      type: "string",
      enum: ["typing", "reading", "navigating", "idle"],
      description: "What the user seems to be doing. Used for pause detection.",
    },
    events: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          type: {
            type: "string",
            description: "opened_record | field_changed | moved_item | approved | held | sent_for_approval | navigated | other",
          },
          summary: { type: "string", description: "Short, concrete: 'cost center 4711 -> 0400 on invoice 4471'" },
        },
        required: ["type", "summary"],
      },
    },
  },
  required: ["changed", "activity", "events"],
};

export async function describeFrame({ frameBase64, recentEvents = [] }) {
  const prompt = `You watch a screen share of someone doing desk work. Report only what CHANGED compared to these recent events:
${JSON.stringify(recentEvents.slice(-5).map((e) => e.summary))}
Name concrete record ids, field names and values. Never describe personal data (names of private persons, IBANs, emails); write [redacted] instead.`;
  return extractStructured({ prompt, schema: SCHEMA, fileBase64: frameBase64, mediaType: "image/jpeg" });
}
