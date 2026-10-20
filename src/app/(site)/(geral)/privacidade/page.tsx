import type { Metadata } from "next";
import { LegalPage } from "@/components/info/legal-page";
import { legalEntity, privacyContact, privacyEmail } from "@/lib/site";
import { getSiteSettings } from "@/server/queries/site";
import { HEALTH_RETENTION_DAYS } from "@/server/privacy";

export const metadata: Metadata = { title: "Política de privacidade", description: "Como a ConexãoSport recolhe, usa e protege os seus dados pessoais." };

export default async function PrivacidadePage() {
  const s = await getSiteSettings();
  return (
    <LegalPage
      contactEmail={privacyEmail(s)}
      title="Política de privacidade"
      description="Como recolhemos, usamos e protegemos os seus dados pessoais, de acordo com a Lei n.º 22/11 de Protecção de Dados Pessoais de Angola."
      updated="20 de Outubro de 2026"
      summary={[
        "Só pedimos os dados necessários para a sua inscrição e para a sua segurança na prova.",
        "Nunca vendemos os seus dados.",
        "O seu nome, clube e tempos aparecem nos resultados públicos.",
        "Pode pedir para ver, corrigir ou apagar os seus dados a qualquer momento.",
      ]}
      sections={[
        {
          id: "responsavel",
          title: "Quem é o responsável pelos dados",
          body: [
            `O responsável pelo tratamento dos dados é a ${legalEntity(s)}, com sede em ${s.address || "Luanda, Angola"}. Tratamos os seus dados de acordo com a Lei n.º 22/11, de 17 de Junho, Lei da Protecção de Dados Pessoais, e com as orientações da Agência de Protecção de Dados (APD).`,
            `Para qualquer questão sobre privacidade, fale connosco ${privacyContact(s)}.`,
          ],
        },
        {
          id: "dados",
          title: "Que dados recolhemos",
          body: [
            [
              "Dados de identificação: nome, data de nascimento, sexo, número do BI ou Passaporte.",
              "Contactos: e-mail, telemóvel, província e cidade.",
              "Dados da prova: distância, dorsal, clube, tamanho de t-shirt, tempos e classificações.",
              "Dados de saúde e emergência (opcionais): grupo sanguíneo e contacto de emergência.",
              "Dados de pagamento: método, montante e referência. Não guardamos dados de cartões bancários.",
            ],
          ],
        },
        {
          id: "finalidades",
          title: "Para que usamos os dados",
          body: [
            [
              "Fazer e confirmar a sua inscrição e emitir o seu bilhete e dorsal.",
              "Cronometrar a prova e publicar os resultados.",
              "Enviar avisos importantes (pagamento, levantamento do kit, alterações à prova).",
              "Garantir a sua segurança e a assistência médica durante a prova.",
              "Enviar novidades e promoções, apenas se tiver dado autorização.",
            ],
          ],
        },
        {
          id: "partilha",
          title: "Com quem partilhamos",
          body: [
            "Partilhamos apenas o necessário com o organizador de cada prova em que se inscrever, com a equipa médica do evento (dados de saúde, só em caso de necessidade) e com os prestadores de pagamento (EMIS / Multicaixa e bancos).",
            "Os resultados (nome, dorsal, clube, escalão, nacionalidade e tempos) são públicos, como é habitual nas competições desportivas.",
            "Nunca vendemos nem alugamos os seus dados a terceiros.",
          ],
        },
        {
          id: "conservacao",
          title: "Durante quanto tempo guardamos",
          body: [
            "Guardamos os dados da conta enquanto a mantiver activa.",
            [
              `Dados de saúde (grupo sanguíneo, observações médicas) e contacto de emergência: só servem para o dia da prova e são apagados automaticamente ${HEALTH_RETENTION_DAYS} dias depois do evento.`,
              "Dados de inscrição e pagamento (valores, datas, código da inscrição): guardados pelo prazo exigido pela lei fiscal.",
              "Resultados desportivos (nome, dorsal, clube, escalão e tempos): mantidos como registo histórico das provas.",
            ],
            "Se apagar a conta, cancelamos as inscrições em provas futuras e apagamos o documento de identificação, os contactos, a data de nascimento exacta, o contacto de emergência e os dados de saúde de todas as suas inscrições. Ficam apenas o nome e os resultados na classificação das provas em que participou.",
          ],
        },
        {
          id: "direitos",
          title: "Os seus direitos",
          body: [
            "Nos termos da Lei n.º 22/11, tem direito a:",
            [
              "Saber que dados temos sobre si e recebê-los num ficheiro (direito de acesso e portabilidade) — em «O meu perfil» → «Segurança» → «Descarregar os meus dados».",
              "Corrigir dados errados ou desactualizados (direito de rectificação).",
              "Pedir que apaguemos os seus dados (direito de eliminação) — em «O meu perfil» → «Segurança» → «Apagar a minha conta».",
              "Opor-se ao uso dos dados para marketing, a qualquer momento.",
              "Apresentar queixa à Agência de Protecção de Dados (APD).",
            ],
            `Pode exercer a maioria destes direitos na sua área pessoal, em «O meu perfil», ou ${privacyContact(s)}. Respondemos no prazo máximo de 30 dias.`,
          ],
        },
        {
          id: "seguranca",
          title: "Segurança",
          body: [
            "Usamos ligações cifradas (HTTPS), acesso restrito aos dados e cópias de segurança regulares. Em caso de incidente que afecte os seus dados, informamos a APD e os titulares afectados, conforme a lei.",
          ],
        },
        {
          id: "cookies",
          title: "Cookies",
          body: [
            "Usamos cookies e armazenamento local do navegador apenas para manter a sua sessão iniciada e lembrar as suas preferências. Não usamos cookies de publicidade de terceiros.",
          ],
        },
      ]}
    />
  );
}
