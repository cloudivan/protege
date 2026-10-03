// Scenario = one use case (haggle's "vertical"). Adding a use case means adding
// one file here and registering it in index.js. No agent prompt, component or
// route may branch on a scenario id.
//
// This is the brief's running example: Sabine, accounts payable, three
// supplier invoices in a sandbox ERP.

const invoices = {
  id: "invoices",
  label: "Supplier invoices (accounts payable)",
  domain: "Accounts payable at a machine builder",
  expertPersona: "Sabine, 24 years in accounts payable",

  // What the interviewer should be curious about. Prompt-ready prose.
  curiosity: [
    "Why an invoice is coded to a specific cost center, especially opex vs capex.",
    "Why an invoice is held instead of approved.",
    "Why an invoice is sent for a second approval.",
    "Amount limits, supplier-specific exceptions, and when to stop and ask someone.",
  ],

  // Demo cases. The expert sees `capture`, the new hire gets `teach` (a case
  // the expert never showed, as the brief requires).
  cases: {
    capture: [
      { id: "INV-4471", date: "2025-11-27", supplier: "Bosch Rexroth", amount: 6400, currency: "EUR", item: "Hydraulic press unit", hint: "over 5,000 EUR capex line" },
      { id: "INV-4472", date: "2025-12-03", supplier: "Kessler Metall", amount: 1850, currency: "EUR", item: "Steel sheets", month: "December", hint: "supplier double-bills in December" },
      { id: "INV-4473", date: "2025-11-28", supplier: "Prague Subsidiary s.r.o.", amount: 2300, currency: "EUR", item: "Service fee", hint: "Czech subsidiary needs second approval" },
    ],
    teach: [
      { id: "INV-5120", date: "2026-01-14", supplier: "Trumpf GmbH", amount: 7200, currency: "EUR", item: "Laser cutting head", hint: "equipment over 5,000 EUR, learner will reach for opex" },
    ],
  },

  // Sandbox ERP form options (src/pages/sandbox/erp.jsx). Fake data only.
  sandbox: {
    title: "FiBu 7 · Accounts payable",
    costCenters: [
      { code: "4711", label: "4711 · Opex, materials and services" },
      { code: "4720", label: "4720 · Opex, external services" },
      { code: "0400", label: "0400 · Capex, machinery and equipment" },
    ],
  },
};

export default invoices;
