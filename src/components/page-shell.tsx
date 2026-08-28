import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Reveal } from "@/components/reveal";

export function PageShell({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-20">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-4 text-4xl md:text-5xl">{title}</h1>
        {intro && <p className="mt-6 text-lg text-muted-foreground">{intro}</p>}
        <div className="prose-luvlit mt-12 space-y-8">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <Reveal className="hairline pt-8">
      <h2 className="text-2xl">{heading}</h2>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </Reveal>
  );
}
