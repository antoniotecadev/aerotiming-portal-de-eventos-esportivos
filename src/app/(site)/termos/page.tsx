import type { Metadata } from "next";
import { LegalPage } from "@/components/info/legal-page";

export const metadata: Metadata = { title: "Termos e condições", description: "Regras de utilização do site AeroTiming e das inscrições em eventos." };

export default function TermosPage() {
  return (
    <LegalPage
      title="Termos e condições"
      description="As regras para usar o site AeroTiming e para se inscrever nos eventos."
      updated="1 de Setembro de 2026"
      summary={[
        "Use dados verdadeiros quando criar conta ou se inscrever.",
        "A inscrição só fica confirmada depois do pagamento.",
        "Cada prova tem o seu regulamento — leia-o antes de se inscrever.",
        "O valor pago não é devolvido, excepto se a prova for cancelada pela organização.",
      ]}
      sections={[
        {
          id: "quem-somos",
          title: "Quem somos",
          body: [
            "O site aerotiming.ao é gerido pela AeroTiming, Lda., com sede em Luanda, Angola (NIF 5000000000 — texto provisório). Prestamos serviços de inscrição online, cronometragem electrónica e publicação de resultados de eventos desportivos.",
            "Em muitos eventos, a AeroTiming actua em nome do organizador da prova. O organizador é responsável pelo evento em si (percurso, segurança, prémios); a AeroTiming é responsável pela plataforma de inscrição e pela cronometragem.",
          ],
        },
        {
          id: "conta",
          title: "A sua conta",
          body: [
            "Para criar conta precisa de ter pelo menos 16 anos. Menores de 16 anos devem ser inscritos por um encarregado de educação.",
            [
              "Os dados que indicar devem ser verdadeiros e estar actualizados.",
              "A palavra-passe é pessoal. Não a partilhe com ninguém.",
              "Avise-nos de imediato se suspeitar que alguém usou a sua conta.",
            ],
          ],
        },
        {
          id: "inscricoes",
          title: "Inscrições e pagamentos",
          body: [
            "A inscrição só fica confirmada depois de recebermos o pagamento. Os preços são apresentados em Kwanzas (Kz) e incluem os impostos aplicáveis.",
            "As referências Multicaixa são válidas por 48 horas. Depois desse prazo, a inscrição é cancelada automaticamente e a vaga fica livre.",
            "A inscrição é pessoal e intransmissível. Mudanças de distância ou de titular dependem das regras de cada evento.",
          ],
        },
        {
          id: "cancelamentos",
          title: "Cancelamentos e devoluções",
          body: [
            "Se cancelar a sua inscrição, o valor pago não é devolvido, excepto quando o regulamento do evento disser o contrário.",
            "Se a prova for cancelada pela organização, devolvemos o valor pago no prazo de 30 dias, pelo mesmo meio de pagamento ou por transferência bancária.",
            "Se a prova for adiada, a inscrição mantém-se válida para a nova data. Se não puder participar, pode pedir a devolução até 7 dias depois do anúncio.",
          ],
        },
        {
          id: "participacao",
          title: "Participação nas provas",
          body: [
            "Ao inscrever-se declara que está em boas condições físicas para participar e que leu e aceita o regulamento da prova.",
            "Durante a prova devem ser seguidas as indicações da organização, dos voluntários e da Polícia Nacional.",
            "Podem ser recolhidas fotografias e vídeos dos participantes para divulgação do evento. Se não concordar, avise-nos por escrito.",
          ],
        },
        {
          id: "resultados",
          title: "Resultados",
          body: [
            "Os resultados são públicos e mostram nome, dorsal, clube, escalão e tempos. Os resultados provisórios podem ser corrigidos até 48 horas após a publicação.",
            "Reclamações sobre resultados devem ser feitas por escrito, com nome, dorsal e prova.",
          ],
        },
        {
          id: "responsabilidade",
          title: "Responsabilidade",
          body: [
            "Fazemos o possível para manter o site disponível e as informações correctas, mas não podemos garantir que o site funcione sempre sem interrupções.",
            "A AeroTiming não é responsável por danos causados por uso indevido da conta, por falhas de terceiros (bancos, operadoras) ou por informações fornecidas pelos organizadores.",
          ],
        },
        {
          id: "lei",
          title: "Lei aplicável",
          body: [
            "Estes termos regem-se pela lei da República de Angola. Em caso de litígio, é competente o Tribunal da Comarca de Luanda, sem prejuízo dos direitos do consumidor previstos na Lei n.º 15/03, de Defesa do Consumidor.",
          ],
        },
      ]}
    />
  );
}
