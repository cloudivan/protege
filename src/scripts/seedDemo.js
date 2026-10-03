// npm run seed: creates the brief's running example as a finished Work Map
// (Sabine, supplier invoices: 7 steps, 3 judgment calls, 4 guardrails), so
// Module 3 (Teach) can be built and demoed without running Modules 1 + 2.
// Prints the workflow id; open /workflows/<id>/teach.
//
// Plain node, no Next.js: writes through mongoose's raw collections in the
// same shape as src/backend/models/{workflow,workMap}.js.

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

function loadEnv() {
  const file = path.join(__dirname, "..", "..", ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([\w.]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

// at = ms since session start; label = the brief's "screen moment" format.
const moment = (min, sec, label) => ({ at: (min * 60 + sec) * 1000, label });
const quote = (text, min, sec) => ({ text, at: (min * 60 + sec) * 1000 });

const STEPS = [
  {
    index: 1,
    title: "Open the next invoice from the inbox",
    moment: moment(0, 20, "00:20, invoice inbox"),
    decision: "Works the oldest open invoice first",
    isJudgmentCall: false,
    reason: quote("Oldest first, otherwise the early ones slip past month-end.", 0, 24),
    guardrails: [],
  },
  {
    index: 2,
    title: "Check the supplier is known",
    moment: moment(0, 48, "00:48, invoice 4471, supplier field"),
    decision: "Checks the supplier against the vendor master before anything else",
    isJudgmentCall: false,
    reason: quote("If I don't know the supplier, I don't touch the invoice. That's how fake invoices get paid.", 0, 55),
    guardrails: [
      { kind: "stop_and_ask", rule: "Unknown supplier: stop and ask the controller.", quote: quote("Unknown supplier, I call the controller. Always.", 0, 58), moment: moment(0, 48, "00:48, invoice 4471, supplier field") },
    ],
  },
  {
    index: 3,
    title: "Check amount and item against the order",
    moment: moment(1, 40, "01:40, invoice 4471, amount and item"),
    decision: "Compares net amount and item with the purchase order",
    isJudgmentCall: false,
    reason: quote("The amount has to match the order. If it doesn't, it goes back to purchasing.", 1, 46),
    guardrails: [],
  },
  {
    index: 4,
    title: "Code the invoice to a cost center",
    moment: moment(3, 12, "03:12, invoice 4471, cost center field"),
    decision: "Re-coded from opex (4711) to capex (0400)",
    isJudgmentCall: true,
    reason: quote("Equipment over 5,000 euros is always capex.", 3, 15),
    guardrails: [
      { kind: "limit", rule: "Equipment over 5,000 EUR is capex (0400), never opex. No asset number, no capex booking.", quote: quote("And no asset number, no capex booking. I'd get it back from the auditors.", 3, 22), moment: moment(3, 12, "03:12, invoice 4471, cost center field") },
    ],
  },
  {
    index: 5,
    title: "Hold December invoices from Kessler Metall",
    moment: moment(4, 30, "04:30, invoice 4472, Kessler Metall"),
    decision: "Held invoice 4472 instead of posting it",
    isJudgmentCall: true,
    reason: quote("Kessler double-bills every December. I hold it until I've matched it against the delivery notes.", 4, 34),
    guardrails: [
      { kind: "exception", rule: "Kessler Metall invoices dated in December are held until matched against delivery notes. Only the AP lead releases them.", quote: quote("Only me or the AP lead releases those.", 4, 41), moment: moment(4, 30, "04:30, invoice 4472, Kessler Metall") },
    ],
  },
  {
    index: 6,
    title: "Send Czech subsidiary invoices for second approval",
    moment: moment(5, 50, "05:50, invoice 4473, Prague Subsidiary s.r.o."),
    decision: "Sent invoice 4473 for a second approval",
    isJudgmentCall: true,
    reason: quote("Anything from Prague is intercompany. The controller signs off as second approver.", 5, 55),
    guardrails: [
      { kind: "never", rule: "Never post an invoice from the Czech subsidiary with only one approval.", quote: quote("I would never post a Prague invoice on my own signature.", 6, 2), moment: moment(5, 50, "05:50, invoice 4473, Prague Subsidiary s.r.o.") },
    ],
  },
  {
    index: 7,
    title: "Post the invoice",
    moment: moment(6, 40, "06:40, invoice 4471 posted"),
    decision: "Posts once supplier, amount and coding are checked",
    isJudgmentCall: false,
    reason: quote("When everything's clean, I post it and move on.", 6, 44),
    guardrails: [],
  },
];

async function main() {
  loadEnv();
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not set (put it in .env.local)");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection;
  const now = new Date();

  const workflowId = new mongoose.Types.ObjectId();
  const workMapId = new mongoose.Types.ObjectId();
  await db.collection("workmaps").insertOne({
    _id: workMapId,
    workflowId,
    version: 1,
    steps: STEPS,
    openQuestions: [],
    teachBack: {
      text: "You work the oldest invoice first, check the supplier is known, and match amount and item to the order. Equipment over 5,000 euros goes to capex 0400, and only with an asset number. Kessler's December invoices are held until matched to delivery notes, and anything from Prague goes to the controller for a second approval.",
      confirmed: true,
      corrections: ["Only Sabine or the AP lead releases held Kessler invoices, not the controller."],
    },
    confirmedAt: now,
    createdAt: now,
    updatedAt: now,
  });
  await db.collection("workflows").insertOne({
    _id: workflowId,
    title: "Process supplier invoices",
    scenario: "invoices",
    expertName: "Sabine",
    status: "mapped",
    workMapId,
    createdAt: now,
    updatedAt: now,
  });

  console.log(`Seeded workflow ${workflowId} with a ${STEPS.length}-step Work Map.`);
  console.log(`Teach: http://localhost:3002/workflows/${workflowId}/teach`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
