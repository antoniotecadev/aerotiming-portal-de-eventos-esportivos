// Assuntos do formulário de contacto (o id fica gravado em contact_messages.subject).
export const CONTACT_SUBJECTS = [
  { id: "inscricao", label: "Dúvida sobre uma inscrição" },
  { id: "pagamento", label: "Problema com um pagamento" },
  { id: "resultados", label: "Correcção de resultados" },
  { id: "organizar", label: "Quero organizar um evento" },
  { id: "patrocinio", label: "Patrocínios e publicidade" },
  { id: "outro", label: "Outro assunto" },
] as const;

export const contactSubjectLabel = (id: string) => CONTACT_SUBJECTS.find((s) => s.id === id)?.label ?? id;
