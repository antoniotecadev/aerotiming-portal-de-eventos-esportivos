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
        a: ["Abra a página do evento, carregue em «Inscrever-me», escolha a distância, confirme os seus dados e escolha como quer pagar. No fim aparecem as instruções de pagamento; quando a organização confirmar o pagamento, o bilhete e o dorsal ficam na sua conta, em «As minhas inscrições»."],
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
        a: ["Pode pagar por Multicaixa Express, transferência bancária (IBAN), depósito ao balcão do banco ou KWiK. Todos os valores são em Kwanzas (Kz)."],
      },
      {
        q: "Como funciona o pagamento?",
        a: ["O pagamento é feito fora do site e confirmado pela organização do evento. A sua vaga fica reservada enquanto paga."],
        steps: [
          "No fim da inscrição escolha como quer pagar.",
          "Pague o valor indicado para o número ou IBAN que aparece no ecrã, escrevendo o código da inscrição (ex.: CS-2026-01234) no descritivo.",
          "Toque em «Enviar comprovativo pelo WhatsApp» e envie a foto do comprovativo à organização.",
          "Quando a organização confirmar, a inscrição fica «Confirmada» e recebe o seu dorsal em «As minhas inscrições».",
        ],
      },
      {
        q: "Onde vejo outra vez os dados para pagar?",
        a: ["Em «As minhas inscrições», toque em «Como pagar». Lá está o valor, o código, a conta e o botão do WhatsApp."],
      },
      {
        q: "Quanto tempo tenho para pagar?",
        a: ["Normalmente 72 horas (cada evento pode definir outro prazo, que aparece no ecrã). Se não pagar e enviar o comprovativo dentro do prazo, a inscrição expira e a vaga fica livre para outra pessoa. Pode inscrever-se de novo se ainda houver vagas."],
      },
      {
        q: "Já paguei e enviei o comprovativo, mas ainda diz «Aguarda pagamento». E agora?",
        a: ["A organização confirma os pagamentos manualmente, por isso pode demorar algumas horas. Quando receberem o comprovativo, a inscrição passa a «Comprovativo recebido» e deixa de expirar. Se demorar mais de 1 dia útil, fale com a organização pelo mesmo WhatsApp."],
      },
      {
        q: "O meu pagamento foi rejeitado. O que faço?",
        a: ["Em «As minhas inscrições» aparece o motivo (por exemplo, valor errado). Corrija, pague a diferença ou volte a pagar e envie o novo comprovativo pelo WhatsApp dentro do novo prazo."],
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
        a: ["Avisamos na página do evento e nas nossas redes sociais. Se a prova for cancelada pela organização, o valor da inscrição é devolvido."],
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
        a: ["Na página «Entrar» carregue em «Esqueci-me da palavra-passe». Enviamos um link para o seu e-mail para criar uma palavra-passe nova."],
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
