import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { PubliVendeLogo } from "@/components/PubliVendeLogo";
import { Button } from "@/components/ui/button";

interface LegalLayoutProps {
  title: string;
  children: ReactNode;
}

export function LegalLayout({ title, children }: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <PubliVendeLogo to="/" size="sm" />
          <Link to="/">
            <Button variant="ghost" size="sm">Inicio</Button>
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-10 prose prose-neutral dark:prose-invert">
        <h1 className="text-3xl font-bold not-prose mb-2">{title}</h1>
        <p className="text-sm text-muted-foreground not-prose mb-8">Última actualización: 10 de junio de 2026</p>
        {children}
      </main>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        <Link to="/terminos" className="hover:underline mx-2">Términos</Link>
        ·
        <Link to="/privacidad" className="hover:underline mx-2">Privacidad</Link>
        ·
        <a href="mailto:soporte@publivende.com" className="hover:underline mx-2">soporte@publivende.com</a>
      </footer>
    </div>
  );
}
