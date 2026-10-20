import type { EventRoute, RegulationSection, RoutePoint } from "./types";

/** Gerador pseudo-aleatório determinístico (mesmo resultado no servidor e no cliente). */
export function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Desenha um percurso estilizado em coordenadas 0–100. */
export function makePath(seed: number, loop = true, steps = 28): [number, number][] {
  const rnd = seeded(seed);
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * (loop ? 2 : 1.2);
    const r = 32 + rnd() * 10;
    const x = 50 + Math.cos(t) * r * (0.9 + rnd() * 0.2) + (loop ? 0 : i * 0.6 - 10);
    const y = 50 + Math.sin(t) * r * 0.62 * (0.9 + rnd() * 0.2);
    pts.push([Math.round(Math.min(95, Math.max(5, x)) * 10) / 10, Math.round(Math.min(92, Math.max(8, y)) * 10) / 10]);
  }
  if (loop) pts[pts.length - 1] = pts[0];
  return pts;
}

/** Perfil altimétrico com `samples` pontos. */
export function makeElevation(seed: number, base: number, amplitude: number, samples = 40): number[] {
  const rnd = seeded(seed);
  const out: number[] = [];
  let drift = 0;
  for (let i = 0; i < samples; i++) {
    drift += (rnd() - 0.5) * amplitude * 0.25;
    const wave = Math.sin((i / samples) * Math.PI * 2) * amplitude * 0.5;
    out.push(Math.max(0, Math.round(base + wave + drift)));
  }
  return out;
}

export function route(
  distanceId: string,
  km: number,
  opts: { seed: number; base: number; amplitude: number; surface: string; description: string; loop?: boolean; stationsEvery?: number },
): EventRoute {
  const every = opts.stationsEvery ?? (km <= 10 ? 2.5 : 5);
  const points: RoutePoint[] = [{ km: 0, name: "Partida", type: "partida" }];
  for (let k = every; k < km - 0.5; k += every) {
    const n = Math.round(k * 10) / 10;
    points.push({
      km: n,
      name: n % 10 === 0 ? `Abastecimento km ${n}` : `Água km ${n}`,
      type: n % 10 === 0 ? "abastecimento" : "agua",
    });
  }
  if (km >= 10) points.push({ km: Math.round(km * 0.5 * 10) / 10, name: "Posto médico", type: "medico" });
  points.push({ km, name: "Chegada", type: "chegada" });
  points.sort((a, b) => a.km - b.km);
  return {
    distanceId,
    description: opts.description,
    surface: opts.surface,
    path: makePath(opts.seed, opts.loop ?? true),
    elevation: makeElevation(opts.seed, opts.base, opts.amplitude),
    points,
  };
}

/** Regulamento-base partilhado pelas provas; cada evento acrescenta as suas regras. */
export function regulation(opts: {
  title: string;
  organizer: string;
  minAge: number;
  timeLimit: string;
  extra?: RegulationSection[];
}): RegulationSection[] {
  return [
    {
      title: "1. Organização",
      items: [
        `A prova "${opts.title}" é organizada por ${opts.organizer}, com cronometragem electrónica da AeroTiming.`,
        "A organização reserva-se o direito de alterar o percurso ou horários por motivos de segurança, informando os atletas por SMS e e-mail.",
      ],
    },
    {
      title: "2. Participação",
      items: [
        `Idade mínima: ${opts.minAge} anos no dia da prova. Menores de 18 anos precisam de autorização assinada pelo encarregado de educação.`,
        "Cada atleta deve estar em condições físicas adequadas. Recomenda-se exame médico prévio.",
        "A inscrição é pessoal e intransmissível.",
      ],
    },
    {
      title: "3. Inscrições e pagamento",
      items: [
        "A inscrição só fica confirmada depois de a organização confirmar o pagamento (Multicaixa Express, transferência, depósito ou KWiK), a partir do comprovativo enviado pelo WhatsApp.",
        "O pagamento deve ser feito dentro do prazo indicado na inscrição (normalmente 72 horas). Depois desse prazo a vaga é libertada.",
        "Não há devolução do valor pago, excepto em caso de cancelamento da prova pela organização.",
      ],
    },
    {
      title: "4. Dorsal e chip",
      items: [
        "O dorsal deve ser usado na parte da frente, visível e sem dobras.",
        "O chip de cronometragem está no dorsal. Sem dorsal não há tempo registado.",
      ],
    },
    {
      title: "5. Tempo limite e classificações",
      items: [
        `Tempo limite: ${opts.timeLimit}. Após este tempo o percurso é reaberto ao trânsito.`,
        "Classificação geral, por sexo e por escalão etário. Os prémios são entregues apenas aos atletas presentes na cerimónia.",
        "Reclamações sobre resultados podem ser feitas até 48 horas após a publicação, através do e-mail da organização.",
      ],
    },
    ...(opts.extra ?? []),
    {
      title: "Segurança e saúde",
      items: [
        "Haverá ambulâncias e postos médicos ao longo do percurso.",
        "Siga sempre as indicações da Polícia Nacional e dos voluntários.",
        "É proibido o acompanhamento por veículos não autorizados.",
      ],
    },
  ];
}

export const CREATED = (iso: string) => `${iso}T09:00:00+01:00`;
