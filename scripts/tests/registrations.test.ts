// Testes da lógica de inscrições contra a BD de desenvolvimento.
// Uso: npm run test:registrations   (não deixa alterações, excepto o contador de códigos avançar)
import "dotenv/config";
import { prisma } from "@/lib/db";
import { assignBib, expireStaleRegistrations, nextRegistrationCode, takeSlot } from "@/server/registrations";

let failed = 0;
const check = (name: string, ok: boolean, info = "") => {
  console.log(`${ok ? "OK  " : "FAIL"} ${name}${info ? ` — ${info}` : ""}`);
  if (!ok) failed++;
};

async function main() {
  // 1) Vagas com pedidos em simultâneo
  const dist = await prisma.eventDistance.findFirstOrThrow({ where: { event: { slug: "corrida-da-independencia-2026" }, code: "5k" } });
  await prisma.eventDistance.update({ where: { id: dist.id }, data: { totalSlots: dist.slotsTaken + 3 } });
  try {
    const results = await Promise.all(Array.from({ length: 8 }, () => prisma.$transaction((tx) => takeSlot(tx, dist.id))));
    const after = await prisma.eventDistance.findUniqueOrThrow({ where: { id: dist.id } });
    check("8 pedidos em simultâneo para 3 vagas → só 3 conseguem", results.filter(Boolean).length === 3, `${results.filter(Boolean).length} conseguiram`);
    check("vagas ocupadas nunca passam do total", after.slotsTaken === after.totalSlots, `${after.slotsTaken}/${after.totalSlots}`);
  } finally {
    await prisma.eventDistance.update({ where: { id: dist.id }, data: { slotsTaken: dist.slotsTaken, totalSlots: dist.totalSlots } });
  }

  // 2) Códigos de inscrição únicos em simultâneo
  const codes = await Promise.all(Array.from({ length: 10 }, () => prisma.$transaction((tx) => nextRegistrationCode(tx, "2099"))));
  check("10 códigos pedidos em simultâneo são todos diferentes", new Set(codes).size === 10, `${codes[0]} … ${codes[9]}`);
  await prisma.counter.delete({ where: { key: "registration:2099" } });

  // 3) Dorsal: atribuído a uma inscrição sem dorsal (dentro de uma transacção desfeita no fim)
  const pending = await prisma.registration.findFirstOrThrow({ where: { bib: null, status: "pagamento_pendente" }, include: { distance: true } });
  const rollback = new Error("rollback");
  let bib = "";
  await prisma
    .$transaction(async (tx) => {
      bib = await assignBib(tx, pending.id);
      const again = await assignBib(tx, pending.id);
      check("dorsal atribuído e repetir a chamada devolve o mesmo", !!bib && again === bib, `dorsal ${bib}`);
      const dup = await tx.registration.count({ where: { eventId: pending.eventId, bib } });
      check("o dorsal não repete nenhum outro do evento", dup === 1);
      throw rollback;
    })
    .catch((e) => {
      if (e !== rollback) throw e;
    });
  const untouched = await prisma.registration.findUniqueOrThrow({ where: { id: pending.id } });
  check("transacção desfeita: a inscrição continua sem dorsal", untouched.bib === null);

  // 4) Expiração: não toca em pagamentos em análise
  const before = await prisma.payment.count({ where: { status: "em_analise" } });
  const n = await expireStaleRegistrations();
  const stillAnalysis = await prisma.payment.count({ where: { status: "em_analise" } });
  check("expiração corre e não toca nos comprovativos em análise", stillAnalysis === before, `${n} inscrições expiradas; ${stillAnalysis} em análise intactas`);
}

main()
  .catch((e) => {
    console.error(e);
    failed++;
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(failed ? 1 : 0);
  });
