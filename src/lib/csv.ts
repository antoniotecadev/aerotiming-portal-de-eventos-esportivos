/**
 * Uma célula de CSV segura: entre aspas e, se começar por = + - @ (ou tabulação/CR), com um apóstrofo
 * à frente — senão o Excel executa-a como fórmula (ex.: um atleta chamado "=HYPERLINK(…)") (12.4, B3).
 * Números ficam como estão (ex.: tempos negativos não existem; "-" sozinho também é seguro).
 */
export function csvCell(value: unknown) {
  let s = String(value ?? "");
  if (typeof value !== "number" && /^[=+\-@\t\r]/.test(s) && s !== "-") s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export const csvRow = (cells: unknown[]) => cells.map(csvCell).join(";");
