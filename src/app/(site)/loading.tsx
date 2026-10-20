// Mostrado enquanto a página lê os dados da base de dados.
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="h-40 animate-pulse bg-ink-900 sm:h-48" />
      <div className="container-page py-10">
        <span className="sr-only">A carregar…</span>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-ink-200/70 bg-white">
              <div className="aspect-[1080/1300] animate-pulse bg-ink-100" />
              <div className="space-y-3 p-4">
                <div className="h-4 w-1/3 animate-pulse rounded bg-ink-100" />
                <div className="h-5 w-4/5 animate-pulse rounded bg-ink-100" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-ink-100" />
                <div className="h-11 animate-pulse rounded-xl bg-ink-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
