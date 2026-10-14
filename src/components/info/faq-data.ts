export interface FaqItem {
  q: string;
  a: string[]; // parágrafos
  steps?: string[];
}

export interface FaqGroup {
  id: string;
  title: string;
  items: FaqItem[];
}

export const FAQ: FaqGroup[] = [
  {
    id: "inscricoes",
    title: "Inscrições",
    items: [
      {
        q: "Como me inscrevo numa prova?",
        a: ["Abra a página do evento, carregue em «Inscrever-me», escolha a distância, confirme os seus dados e escolha como quer pagar. No fim recebe um SMS e um e-mail com a confirmação."],
      },
      {
        q: "Preciso de criar conta para me inscrever?",
        a: [
          "Recomendamos que sim: com conta, os seus dados ficam guardados, vê os seus bilhetes e resultados num só lugar e a próxima inscrição demora menos de 1 minuto.",
          "Criar conta é grátis e só pede nome, e-mail, telemóvel e uma palavra-passe.",
        ],
      },
      {
        q: "Posso inscrever outra pessoa (filho, amigo, colega)?",
        a: ["Sim. Faça a inscrição com os dados dessa pessoa (nome, data de nascimento e BI). Cada atleta tem a sua própria inscrição e o seu próprio dorsal."],
      },
      {
        q: "Posso mudar de distância depois de me inscrever?",
        a: ["Sim, até 7 dias antes da prova e se houver vagas. Contacte-nos por WhatsApp com o código da inscrição. Se a nova distância for mais cara, paga apenas a diferença."],
      },
      {
        q: "Posso cancelar a inscrição?",
        a: [
          "Pode cancelar na sua área pessoal, em «As minhas inscrições». Segundo o regulamento das provas, o valor pago não é devolvido, excepto se a prova for cancelada pela organização.",
        ],
      },
    ],
  },
  {
    id: "pagamentos",
    title: "Pagamentos",
    items: [
      {
        q: "Que formas de pagamento existem?",
        a: ["Pode pagar com Multicaixa Express, com Referência Multicaixa (no ATM ou no Internet banking) ou por transferência bancária. Todos os valores são em Kwanzas (Kz)."],
      },
      {
        q: "Como pago com Multicaixa Express?",
        a: ["É a forma mais rápida: a inscrição fica confirmada no momento."],
        steps: [
          "No fim da inscrição escolha «Multicaixa Express».",
          "Escreva o número de telemóvel associado à app Multicaixa Express.",
          "Abra a app no telemóvel e aceite o pagamento (tem 5 minutos).",
          "Pronto! Recebe logo o SMS de confirmação.",
        ],
      },
      {
        q: "Como pago com Referência Multicaixa (ATM ou Internet banking)?",
        a: ["Depois da inscrição mostramos uma Entidade, uma Referência e o Montante. Também os enviamos por SMS e ficam guardados em «As minhas inscrições»."],
        steps: [
          "No ATM (ou no Internet banking do seu banco) escolha «Pagamentos» e depois «Pagamento por referência».",
          "Escreva a Entidade (5 números), a Referência (9 números) e o Montante exacto.",
          "Confirme e guarde o talão.",
          "A inscrição fica confirmada em poucos minutos e recebe um SMS.",
        ],
      },
      {
        q: "Como pago por transferência bancária?",
        a: [
          "Faça a transferência para o IBAN indicado no fim da inscrição, escrevendo o código da inscrição (ex.: AT-2026-01234) no descritivo.",
          "Depois envie o comprovativo por WhatsApp ou pela sua área pessoal. A confirmação pode demorar até 1 dia útil.",
        ],
      },
      {
        q: "Quanto tempo tenho para pagar?",
        a: ["A referência é válida por 48 horas. Se não pagar dentro desse prazo, a inscrição é cancelada e a vaga fica livre para outra pessoa. Pode inscrever-se de novo se ainda houver vagas."],
      },
      {
        q: "Paguei mas a inscrição ainda diz «Aguarda pagamento». E agora?",
        a: ["Os pagamentos por referência demoram normalmente até 15 minutos. Se passar mais de 2 horas, envie-nos o talão por WhatsApp e resolvemos rapidamente."],
      },
    ],
  },
  {
    id: "kit",
    title: "Levantamento de kit",
    items: [
      {
        q: "Onde e quando levanto o kit?",
        a: ["O local, os dias e as horas estão na página de cada evento e no seu bilhete, em «As minhas inscrições». Normalmente é nos 2 ou 3 dias antes da prova."],
      },
      {
        q: "O que tenho de levar?",
        a: ["Leve o bilhete com o código QR (no telemóvel ou impresso) e o seu BI ou Passaporte."],
      },
      {
        q: "Outra pessoa pode levantar o meu kit?",
        a: ["Sim. Essa pessoa deve mostrar o seu bilhete (código QR) e uma cópia do seu BI, junto com o documento dela."],
      },
      {
        q: "O que vem no kit?",
        a: ["Normalmente: dorsal com chip, t-shirt técnica, alfinetes e ofertas dos patrocinadores. Cada evento indica o conteúdo exacto na sua página."],
      },
    ],
  },
  {
    id: "dia-da-prova",
    title: "Dia da prova",
    items: [
      {
        q: "A que horas devo chegar?",
        a: ["Chegue pelo menos 45 minutos antes da partida para estacionar, ir à casa de banho, deixar os seus pertences no bengaleiro e aquecer com calma."],
      },
      {
        q: "Onde coloco o dorsal?",
        a: ["Na parte da frente da camisola, bem visível e sem dobrar. O chip está atrás do dorsal: não o retire, senão o seu tempo não é registado."],
      },
      {
        q: "Há água e assistência médica no percurso?",
        a: ["Sim. Há postos de água e abastecimento ao longo do percurso, ambulâncias e um posto médico. Os pontos estão marcados no mapa do percurso na página do evento."],
      },
      {
        q: "E se chover ou a prova for adiada?",
        a: ["Avisamos por SMS, e-mail e nas redes sociais. Se a prova for cancelada pela organização, o valor da inscrição é devolvido."],
      },
    ],
  },
  {
    id: "resultados",
    title: "Resultados",
    items: [
      {
        q: "Quando saem os resultados?",
        a: ["Os resultados provisórios aparecem no site minutos depois de cortar a meta. Os resultados oficiais são publicados até 48 horas depois da prova."],
      },
      {
        q: "Como encontro o meu tempo?",
        a: ["Vá a «Resultados», escolha a prova e escreva o seu nome ou o número do dorsal. Se tiver conta, os seus resultados aparecem também em «Os meus resultados»."],
      },
      {
        q: "Qual é a diferença entre «tempo de chip» e «tempo oficial»?",
        a: ["O tempo oficial conta desde o tiro de partida. O tempo de chip conta desde o momento em que você passa o tapete da partida, por isso é o seu tempo real."],
      },
      {
        q: "Acho que o meu tempo está errado. O que faço?",
        a: ["Envie-nos uma mensagem até 48 horas depois da publicação, com o seu nome, dorsal e a prova. A nossa equipa verifica os registos dos tapetes e responde-lhe."],
      },
    ],
  },
  {
    id: "conta",
    title: "Conta",
    items: [
      {
        q: "Esqueci-me da palavra-passe. Como entro?",
        a: ["Na página «Entrar» carregue em «Esqueci-me da palavra-passe». Enviamos um código por SMS ou e-mail para criar uma palavra-passe nova."],
      },
      {
        q: "Como mudo os meus dados (nome, telemóvel, t-shirt)?",
        a: ["Entre na sua conta e vá a «O meu perfil» → «Os meus dados». Altere o que precisar e carregue em «Guardar alterações»."],
      },
      {
        q: "Os meus dados estão seguros?",
        a: ["Sim. Tratamos os seus dados de acordo com a Lei n.º 22/11 de Protecção de Dados Pessoais de Angola e nunca os vendemos. Veja a nossa Política de privacidade."],
      },
      {
        q: "Como apago a minha conta?",
        a: ["Em «O meu perfil» → «Segurança», no fim da página, encontra a opção «Apagar a minha conta»."],
      },
    ],
  },
];
