import { WhatsAppIcon } from "./social-icons";
import { whatsappHref } from "@/lib/site";
import { getSiteSettings } from "@/server/queries/site";

export async function WhatsAppButton() {
  const { whatsapp, phone } = await getSiteSettings();
  const number = whatsapp || phone;
  if (!number) return null;
  return (
    <a
      href={whatsappHref(number, "Olá! Preciso de ajuda com uma inscrição.")}
      target="_blank"
      rel="noopener noreferrer"
      className="group fixed right-4 bottom-24 z-40 flex [body:has([data-sticky-cta])_&]:bottom-40 lg:[body:has([data-sticky-cta])_&]:bottom-6 items-center gap-2 rounded-full bg-[#25D366] p-3.5 text-white shadow-lift transition-transform hover:scale-105 lg:right-6 lg:bottom-6 lg:px-5"
      aria-label="Falar connosco pelo WhatsApp"
    >
      <WhatsAppIcon className="size-6" />
      <span className="hidden text-sm font-bold lg:inline">Precisa de ajuda?</span>
    </a>
  );
}
