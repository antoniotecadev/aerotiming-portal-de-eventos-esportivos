"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Camera, CameraOff, CheckCircle2, PackageCheck, Search, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { findForCheckIn, markKitPickedUp, type CheckInRecord } from "@/server/actions/checkin";

interface DeskEvent {
  id: string;
  title: string;
  date: string;
  kitLocation: string;
}

// BarcodeDetector existe no Chrome para Android e no Safari recente; noutros browsers usa-se o campo de texto.
type Detector = { detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]> };
declare global {
  interface Window {
    BarcodeDetector?: new (opts: { formats: string[] }) => Detector;
  }
}

export function CheckInDesk({ events }: { events: DeskEvent[] }) {
  const toast = useToast();
  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [record, setRecord] = useState<CheckInRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [scanning, setScanning] = useState(false);
  const [canScan, setCanScan] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setCanScan(typeof window !== "undefined" && !!window.BarcodeDetector && !!navigator.mediaDevices), []);

  const search = (q: string) => {
    setError(null);
    setRecord(null);
    startTransition(async () => {
      const res = await findForCheckIn({ eventId, query: q });
      if (!res.ok) return setError(res.error);
      setRecord(res.record);
    });
  };

  // Leitura do QR pela câmara
  useEffect(() => {
    if (!scanning || !window.BarcodeDetector) return;
    let stream: MediaStream | null = null;
    let stop = false;
    const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        while (!stop) {
          const codes = await detector.detect(videoRef.current).catch(() => []);
          if (codes[0]?.rawValue) {
            setQuery(codes[0].rawValue);
            setScanning(false);
            search(codes[0].rawValue);
            break;
          }
          await new Promise((r) => setTimeout(r, 300));
        }
      } catch {
        setError("Não foi possível abrir a câmara. Escreva o código à mão.");
        setScanning(false);
      }
    })();
    return () => {
      stop = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  const deliver = () => {
    if (!record) return;
    startTransition(async () => {
      const res = await markKitPickedUp({ registrationId: record.id });
      if (!res.ok) return setError(res.error);
      toast({ title: "Kit entregue", description: `${record.athleteName} · dorsal ${record.bib ?? "—"}` });
      setRecord({ ...record, kitStatus: "levantado", kitPickedUpAt: new Date().toISOString() });
      setQuery("");
      inputRef.current?.focus();
    });
  };

  const ready = record?.status === "confirmada" && record.kitStatus === "por_levantar";

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="event" className="mb-1.5 block text-sm font-semibold text-ink-800">Evento</label>
        <Select id="event" value={eventId} onChange={(e) => { setEventId(e.target.value); setRecord(null); setError(null); }}>
          {events.map((e) => (
            <option key={e.id} value={e.id}>{e.title} — {formatDate(e.date, false)}</option>
          ))}
        </Select>
        <p className="mt-1.5 text-sm text-ink-500">Local de levantamento: {events.find((e) => e.id === eventId)?.kitLocation}</p>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          search(query);
        }}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Código (CS-2026-…) ou dorsal"
          autoCapitalize="characters"
          className="h-14 min-w-0 flex-1 rounded-xl border border-ink-200 bg-white px-4 text-lg font-semibold tracking-wide uppercase focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 focus:outline-none"
          aria-label="Código da inscrição ou dorsal"
        />
        <Button type="submit" size="lg" className="h-14" disabled={pending}><Search /> <span className="hidden sm:inline">Procurar</span></Button>
      </form>

      {canScan && (
        <Button variant={scanning ? "outline" : "dark"} size="lg" className="w-full" onClick={() => setScanning((v) => !v)}>
          {scanning ? <><CameraOff /> Fechar câmara</> : <><Camera /> Ler QR do bilhete</>}
        </Button>
      )}
      {scanning && <video ref={videoRef} className="aspect-square w-full rounded-2xl bg-ink-900 object-cover" muted playsInline />}

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-[15px] text-red-800">
          <TriangleAlert className="mt-0.5 size-5 shrink-0" /> {error}
        </div>
      )}

      {record && (
        <div className={cn("rounded-3xl border-2 bg-white p-5 shadow-card", ready ? "border-emerald-400" : record.kitStatus === "levantado" ? "border-ink-200" : "border-amber-400")}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-ink-500">{record.code}</p>
              <p className="text-2xl font-extrabold text-ink-900">{record.athleteName}</p>
              <p className="text-ink-600">{record.distanceName}</p>
            </div>
            <div className="shrink-0 rounded-2xl bg-ink-900 px-4 py-2 text-center text-white">
              <p className="text-xs text-ink-300">Dorsal</p>
              <p className="font-display text-3xl leading-none font-extrabold">{record.bib ?? "—"}</p>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-[15px]">
            <div className="rounded-xl bg-ink-50 p-3"><dt className="text-sm text-ink-500">{record.documentType} (confirme)</dt><dd className="font-bold tabular">{record.documentNumber}</dd></div>
            <div className="rounded-xl bg-ink-50 p-3"><dt className="text-sm text-ink-500">T-shirt</dt><dd className="text-xl font-extrabold">{record.tshirt}</dd></div>
          </dl>

          {record.kitStatus === "levantado" ? (
            <p className="mt-4 flex items-center gap-2 rounded-xl bg-ink-100 p-4 font-semibold text-ink-700">
              <CheckCircle2 className="size-5 text-emerald-600" /> Kit já entregue{record.kitPickedUpAt && ` a ${formatDateTime(record.kitPickedUpAt)}`}.
            </p>
          ) : record.status !== "confirmada" ? (
            <div className="mt-4 rounded-xl bg-amber-50 p-4 text-amber-900">
              <p className="font-bold">Não entregue o kit</p>
              <p className="text-[15px]">
                {record.status === "pagamento_pendente"
                  ? record.paymentStatus === "em_analise"
                    ? "O comprovativo está à espera de confirmação. Peça a um organizador para o confirmar."
                    : "O pagamento ainda não foi feito ou confirmado."
                  : "Esta inscrição foi cancelada ou expirou."}
              </p>
              <Badge tone="amber" className="mt-2">{record.status === "pagamento_pendente" ? "Pagamento por confirmar" : "Inscrição inactiva"}</Badge>
            </div>
          ) : (
            <Button size="lg" className="mt-4 h-14 w-full bg-emerald-600 text-lg hover:bg-emerald-700" disabled={pending} onClick={deliver}>
              <PackageCheck /> Entregar kit
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
