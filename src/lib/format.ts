import type { EventStatus, PaymentMethod, PaymentState, PaymentStatus, RegistrationStatus, ResultStatus } from "./types";

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Faz o parse de "YYYY-MM-DD" sem problemas de fuso horário. */
export function parseDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export const monthName = (m: number) => MONTHS[m];
export const monthShort = (m: number) => MONTHS_SHORT[m];

/** 22 de Novembro de 2026 */
export function formatDate(iso: string, withYear = true) {
  const d = parseDate(iso);
  return `${d.getDate()} de ${MONTHS[d.getMonth()]}${withYear ? ` de ${d.getFullYear()}` : ""}`;
}

/** Domingo, 22 Nov */
export function formatDateShort(iso: string) {
  const d = parseDate(iso);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

export function weekday(iso: string) {
  return WEEKDAYS[parseDate(iso).getDay()];
}

export function dateParts(iso: string) {
  const d = parseDate(iso);
  return { day: String(d.getDate()).padStart(2, "0"), month: MONTHS_SHORT[d.getMonth()], year: d.getFullYear() };
}

export function formatDateTime(iso: string) {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`;
}

/** 15.000 Kz */
export function formatKz(value: number) {
  return `${String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ".")} Kz`;
}

export function formatKm(km: number) {
  return `${Number.isInteger(km) ? km : km.toFixed(km < 30 ? 1 : 0).replace(".", ",")} km`;
}

export function daysUntil(iso: string, today: string) {
  return Math.round((parseDate(iso).getTime() - parseDate(today).getTime()) / 86_400_000);
}

export const EVENT_STATUS: Record<EventStatus, { label: string; tone: "green" | "amber" | "red" | "blue" | "gray" | "violet" }> = {
  brevemente: { label: "Brevemente", tone: "blue" },
  "inscricoes-abertas": { label: "Inscrições abertas", tone: "green" },
  "ultimas-vagas": { label: "Últimas vagas", tone: "amber" },
  esgotado: { label: "Esgotado", tone: "red" },
  "inscricoes-encerradas": { label: "Inscrições encerradas", tone: "gray" },
  "a-decorrer": { label: "A decorrer", tone: "violet" },
  terminado: { label: "Terminado", tone: "gray" },
  cancelado: { label: "Cancelado", tone: "red" },
};

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: "green" | "amber" | "red" }> = {
  confirmado: { label: "Pago", tone: "green" },
  pendente: { label: "Por pagar", tone: "amber" },
  cancelado: { label: "Cancelado", tone: "red" },
};

export const REGISTRATION_STATUS: Record<RegistrationStatus, { label: string; tone: "green" | "amber" | "red" | "gray" }> = {
  confirmada: { label: "Confirmada", tone: "green" },
  "pagamento-pendente": { label: "Aguarda pagamento", tone: "amber" },
  cancelada: { label: "Cancelada", tone: "red" },
  expirada: { label: "Expirada", tone: "gray" },
};

export const PAYMENT_STATE: Record<PaymentState, { label: string; tone: "green" | "amber" | "red" | "blue" | "gray" }> = {
  pendente: { label: "Por pagar", tone: "amber" },
  "em-analise": { label: "Comprovativo em análise", tone: "blue" },
  confirmado: { label: "Pago", tone: "green" },
  rejeitado: { label: "Comprovativo rejeitado", tone: "red" },
  expirado: { label: "Prazo expirado", tone: "gray" },
  cancelado: { label: "Cancelado", tone: "gray" },
  reembolsado: { label: "Reembolsado", tone: "gray" },
};

export const RESULT_STATUS: Record<ResultStatus, string> = {
  terminou: "Terminou",
  desistiu: "Desistiu",
  desclassificado: "Desclassificado",
  "nao-partiu": "Não partiu",
};

export const PAYMENT_METHOD: Record<PaymentMethod, string> = {
  "multicaixa-express": "Multicaixa Express",
  transferencia: "Transferência bancária (IBAN)",
  deposito: "Depósito bancário",
  kwik: "KWiK",
};

export const GENDER_LABEL = { M: "Masculino", F: "Feminino" } as const;
