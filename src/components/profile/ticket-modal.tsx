"use client";

import { QRCodeSVG } from "qrcode.react";
import { CalendarDays, Clock, MapPin, Package, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { formatDate, formatDateShort } from "@/lib/format";
import type { RegistrationWithEvent } from "./profile-data";

export function TicketModal({ reg, open, onClose }: { reg: RegistrationWithEvent; open: boolean; onClose: () => void }) {
  const { event } = reg;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="O seu bilhete"
      description="Mostre este código no levantamento do kit."
      footer={
        <>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer /> Imprimir
          </Button>
          <Button onClick={onClose}>Fechar</Button>
        </>
      }
    >
      <div className="p-5 sm:p-6">
        <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
          <div className="bg-ink-900 px-5 py-4 text-white">
            <p className="text-xs font-bold tracking-wide text-brand-400 uppercase">{reg.distance?.name ?? "Inscrição"}</p>
            <p className="mt-0.5 text-lg leading-snug font-bold">{event.title}</p>
            <p className="mt-1 text-sm text-ink-300">
              {formatDate(event.date)} · {reg.distance?.startTime ?? event.startTime}
            </p>
          </div>
          <div className="flex flex-col items-center gap-4 px-5 py-6 sm:flex-row sm:items-center sm:gap-6">
            <div className="rounded-xl bg-white p-3 ring-1 ring-ink-200">
              <QRCodeSVG value={reg.code} size={168} level="M" marginSize={0} />
            </div>
            <dl className="grid w-full grid-cols-2 gap-x-4 gap-y-3 text-center sm:text-left">
              <div className="col-span-2">
                <dt className="text-xs font-semibold text-ink-500 uppercase">Atleta</dt>
                <dd className="font-bold text-ink-900">{reg.userName}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-ink-500 uppercase">Dorsal</dt>
                <dd className="font-display text-4xl leading-none font-extrabold text-brand-600 tabular">{reg.bib}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-ink-500 uppercase">T-shirt</dt>
                <dd className="font-display text-4xl leading-none font-extrabold text-ink-900">{reg.tshirt}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs font-semibold text-ink-500 uppercase">Código</dt>
                <dd className="font-mono font-bold text-ink-900">{reg.code}</dd>
              </div>
            </dl>
          </div>
          {reg.kitStatus === "levantado" && (
            <div className="border-t border-dashed border-ink-200 px-5 py-3 text-center">
              <Badge tone="green" dot>Kit já levantado</Badge>
            </div>
          )}
        </div>

        <div className="mt-5 rounded-2xl bg-ink-50 p-5">
          <h3 className="flex items-center gap-2 font-bold text-ink-900">
            <Package className="size-5 text-brand-600" /> Levantamento do kit
          </h3>
          <ul className="mt-3 space-y-2 text-[15px] text-ink-700">
            <li className="flex gap-2.5">
              <MapPin className="mt-0.5 size-4.5 shrink-0 text-ink-500" />
              <span>
                <strong>{event.kit.location}</strong>
                <span className="block text-ink-500">{event.kit.address}</span>
              </span>
            </li>
            {event.kit.pickup.map((p) => (
              <li key={p.date} className="flex gap-2.5">
                <CalendarDays className="mt-0.5 size-4.5 shrink-0 text-ink-500" />
                <span>
                  {formatDateShort(p.date)} <Clock className="mx-1 inline size-3.5 text-ink-400" />
                  {p.from}–{p.to}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm font-semibold text-ink-800">Leve consigo:</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink-600">
            <li>Este bilhete (no telemóvel ou impresso)</li>
            <li>O seu BI ou Passaporte</li>
            {event.kit.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          {event.kit.items.length > 0 && (
            <p className="mt-3 text-sm text-ink-600">
              <strong className="text-ink-800">No kit:</strong> {event.kit.items.join(", ")}.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
