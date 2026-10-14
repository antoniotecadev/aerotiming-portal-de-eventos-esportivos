import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
  invert,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  invert?: boolean;
}) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="max-w-2xl">
        {eyebrow && <p className={cn("text-sm font-bold tracking-wide uppercase", invert ? "text-sun-400" : "text-brand-600")}>{eyebrow}</p>}
        <h2 className={cn("mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl", invert ? "text-white" : "text-ink-900")}>{title}</h2>
        {description && <p className={cn("mt-2 text-base", invert ? "text-ink-300" : "text-ink-600")}>{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description?: string; children?: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-ink-900 text-white">
      <div className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-brand-600/25 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-32 left-10 size-80 rounded-full bg-sun-400/10 blur-3xl" aria-hidden />
      <div className="container-page relative py-10 sm:py-14">
        {eyebrow && <p className="text-sm font-bold tracking-wide text-sun-400 uppercase">{eyebrow}</p>}
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-base text-ink-300 sm:text-lg">{description}</p>}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </section>
  );
}
