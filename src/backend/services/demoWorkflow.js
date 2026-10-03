// The "demo" workflow behind the homepage's "Try the demo" links
// (/workflows/demo/teach): Sabine's supplier-invoice Work Map from the brief.
//
// With a database, "demo" resolves to a REAL workflow (created on first use),
// so sessions, the guardrail check and the tutor all work. Without one
// (no MONGODB_URI), the static objects below keep the page browsable.

import Workflow from "@/backend/models/workflow";
import WorkMap from "@/backend/models/workMap";

export const DEMO_ID = "demo";
// Fixed Mongo ids, so every server instance finds the same demo records.
const DEMO_WORKFLOW_OID = "000000000000000000000de0";
const DEMO_WORK_MAP_OID = "000000000000000000000de1";

// Pre-seeded demo object for instant testing without local Mongo configuration
export const DEMO_WORKFLOW = {
  _id: "demo",
  title: "Process supplier invoices",
  scenario: "invoices",
  expertName: "Sabine",
  status: "mapped",
  workMapId: "demo-map",
};

export const DEMO_WORK_MAP = {
  _id: "demo-map",
  workflowId: "demo",
  version: 1,
  steps: [
    {
      index: 1,
      title: "Open the next invoice from the inbox",
      moment: { at: 20000, label: "00:20, invoice inbox" },
      decision: "Works the oldest open invoice first",
      isJudgmentCall: false,
      reason: { text: "Oldest first, otherwise the early ones slip past month-end.", at: 24000 },
      guardrails: [],
    },
    {
      index: 2,
      title: "Check the supplier is known",
      moment: { at: 48000, label: "00:48, invoice 4471, supplier field" },
      decision: "Checks the supplier against the vendor master before anything else",
      isJudgmentCall: false,
      reason: { text: "If I don't know the supplier, I don't touch the invoice. That's how fake invoices get paid.", at: 55000 },
      guardrails: [
        {
          kind: "stop_and_ask",
          rule: "Unknown supplier: stop and ask the controller.",
          quote: { text: "Unknown supplier, I call the controller. Always.", at: 58000 },
          moment: { at: 48000, label: "00:48, invoice 4471, supplier field" },
        },
      ],
    },
    {
      index: 3,
      title: "Check amount and item against the order",
      moment: { at: 100000, label: "01:40, invoice 4471, amount and item" },
      decision: "Compares net amount and item with the purchase order",
      isJudgmentCall: false,
      reason: { text: "The amount has to match the order. If it doesn't, it goes back to purchasing.", at: 106000 },
      guardrails: [],
    },
    {
      index: 4,
      title: "Code the invoice to a cost center",
      moment: { at: 192000, label: "03:12, invoice 4471, cost center field" },
      decision: "Re-coded from opex (4711) to capex (0400)",
      isJudgmentCall: true,
      reason: { text: "Equipment over 5,000 euros is always capex.", at: 195000 },
      guardrails: [
        {
          kind: "limit",
          rule: "Equipment over 5,000 EUR is capex (0400), never opex. No asset number, no capex booking.",
          quote: { text: "And no asset number, no capex booking. I'd get it back from the auditors.", at: 202000 },
          moment: { at: 192000, label: "03:12, invoice 4471, cost center field" },
        },
      ],
    },
    {
      index: 5,
      title: "Hold December invoices from Kessler Metall",
      moment: { at: 270000, label: "04:30, invoice 4472, Kessler Metall" },
      decision: "Held invoice 4472 instead of posting it",
      isJudgmentCall: true,
      reason: { text: "Kessler double-bills every December. I hold it until I've matched it against the delivery notes.", at: 274000 },
      guardrails: [
        {
          kind: "exception",
          rule: "Kessler Metall invoices dated in December are held until matched against delivery notes. Only the AP lead releases them.",
          quote: { text: "Only me or the AP lead releases those.", at: 281000 },
          moment: { at: 270000, label: "04:30, invoice 4472, Kessler Metall" },
        },
      ],
    },
    {
      index: 6,
      title: "Send Czech subsidiary invoices for second approval",
      moment: { at: 350000, label: "05:50, invoice 4473, Prague Subsidiary s.r.o." },
      decision: "Sent invoice 4473 for a second approval",
      isJudgmentCall: true,
      reason: { text: "Anything from Prague is intercompany. The controller signs off as second approver.", at: 355000 },
      guardrails: [
        {
          kind: "never",
          rule: "Never post an invoice from the Czech subsidiary with only one approval.",
          quote: { text: "I would never post a Prague invoice on my own signature.", at: 362000 },
          moment: { at: 350000, label: "05:50, invoice 4473, Prague Subsidiary s.r.o." },
        },
      ],
    },
    {
      index: 7,
      title: "Post the invoice",
      moment: { at: 400000, label: "06:40, invoice 4471 posted" },
      decision: "Posts once supplier, amount and coding are checked",
      isJudgmentCall: false,
      reason: { text: "When everything's clean, I post it and move on.", at: 404000 },
      guardrails: [],
    },
  ],
  openQuestions: [],
  teachBack: {
    text: "You work the oldest invoice first, check the supplier is known, and match amount and item to the order. Equipment over 5,000 euros goes to capex 0400, and only with an asset number. Kessler's December invoices are held until matched to delivery notes, and anything from Prague goes to the controller for a second approval.",
    confirmed: true,
    corrections: ["Only Sabine or the AP lead releases held Kessler invoices, not the controller."],
  },
};

// Finds the demo workflow in Mongo, creating it (and its Work Map) on first
// use. Call after dbConnect().
export async function ensureDemoWorkflow() {
  const existing = await Workflow.findById(DEMO_WORKFLOW_OID);
  if (existing) return existing;
  const { _id: _w, workMapId: _m, ...workflowFields } = DEMO_WORKFLOW;
  const { _id: _m2, workflowId: _w2, ...mapFields } = DEMO_WORK_MAP;
  await WorkMap.create({ ...mapFields, _id: DEMO_WORK_MAP_OID, workflowId: DEMO_WORKFLOW_OID, confirmedAt: new Date() });
  return Workflow.create({ ...workflowFields, _id: DEMO_WORKFLOW_OID, workMapId: DEMO_WORK_MAP_OID });
}
