import invoices from "./invoices";

const SCENARIOS = { [invoices.id]: invoices };

export const listScenarios = () => Object.values(SCENARIOS);

export default function getScenario(id) {
  return SCENARIOS[id] || null;
}
