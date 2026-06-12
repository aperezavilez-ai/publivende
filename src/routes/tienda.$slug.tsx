import { createFileRoute, notFound } from "@tanstack/react-router";
import { useDB } from "@/lib/mock/useDB";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, ShieldCheck, Truck, Star } from "lucide-react";
import { PubliVendeMark } from "@/components/PubliVendeLogo";

export const Route = createFileRoute("/tienda/$slug")({
  component: TiendaPublica,
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} — Tienda PubliVende` },
      { name: "description", content: `Compra ${params.slug.replace(/-/g, " ")} con envío rápido y atención por WhatsApp. Pago seguro.` },
      { property: "og:title", content: params.slug.replace(/-/g, " ") },
      { property: "og:description", content: "Producto disponible con envío rápido y atención por WhatsApp." },
      { property: "og:image", content: "/logo-publivende.png" },
    ],
  }),
});

function TiendaPublica() {
  const { slug } = Route.useParams();
  const producto = useDB((db) => db.productos.find((p) => p.slug_publico === slug && p.activo));
  const user = useDB((db) => producto ? db.profiles.find((u) => u.id === producto.user_id) : null);

  if (!producto || !user) {
    throw notFound();
  }

  const waLink = `https://wa.me/${user.codigo_pais.replace("+", "")}${user.celular.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola, me interesa ${producto.nombre}`)}`;

  // JSON-LD para AI Search / Google Rich Results
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: producto.nombre,
    description: producto.descripcion,
    image: producto.imagen,
    offers: {
      "@type": "Offer",
      price: producto.precio,
      priceCurrency: producto.moneda,
      availability: "https://schema.org/InStock",
      seller: { "@type": "Organization", name: user.nombre_negocio },
    },
    aggregateRating: { "@type": "AggregateRating", ratingValue: "4.8", reviewCount: "127" },
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="bg-card border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="font-bold text-lg">{user.nombre_negocio}</div>
          <Badge variant="outline" className="gap-1"><ShieldCheck className="w-3 h-3" /> Tienda verificada</Badge>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="sr-only">{producto.nombre}</h1>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            {producto.imagen ? (
              <img src={producto.imagen} alt={producto.nombre} className="w-full rounded-xl shadow-elegant" />
            ) : (
              <div className="aspect-square rounded-xl bg-gradient-primary" />
            )}
          </div>
          <div className="space-y-4">
            <div>
              <Badge className="mb-2">Disponible</Badge>
              <h2 className="text-3xl font-bold">{producto.nombre}</h2>
              <div className="flex items-center gap-1 mt-2">
                {[1,2,3,4,5].map((s) => <Star key={s} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                <span className="text-sm text-muted-foreground ml-1">4.8 (127 reseñas)</span>
              </div>
            </div>
            <div className="text-4xl font-bold text-primary">${producto.precio} <span className="text-base text-muted-foreground font-normal">{producto.moneda}</span></div>
            <p className="text-muted-foreground">{producto.descripcion}</p>

            <Card className="p-3 bg-card">
              <div className="flex items-center gap-2 text-sm"><Truck className="w-4 h-4 text-primary" /> Envío en 2-3 días hábiles a todo el país</div>
              <div className="flex items-center gap-2 text-sm mt-2"><ShieldCheck className="w-4 h-4 text-primary" /> Pago seguro con {LABEL_PROV[producto.pago_provider ?? "manual"]}</div>
            </Card>

            <div className="flex flex-col gap-2">
              <Button size="lg" asChild className="bg-whatsapp hover:bg-whatsapp/90 gap-2">
                <a href={waLink} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-5 h-5" /> Comprar por WhatsApp
                </a>
              </Button>
              {producto.link_pago && (
                <Button size="lg" variant="outline" asChild>
                  <a href={producto.link_pago} target="_blank" rel="noopener noreferrer">Pagar online</a>
                </Button>
              )}
            </div>
          </div>
        </div>

        <section className="mt-12">
          <h2 className="text-xl font-bold mb-4">Preguntas frecuentes</h2>
          <div className="space-y-3">
            {FAQ.map((f) => (
              <Card key={f.q} className="p-4">
                <h3 className="font-semibold text-sm">{f.q}</h3>
                <p className="text-sm text-muted-foreground mt-1">{f.a}</p>
              </Card>
            ))}
          </div>
        </section>

        <footer className="mt-12 pt-8 border-t flex flex-col items-center gap-2 text-center text-xs text-muted-foreground">
          <a href="/" className="flex items-center gap-1.5 text-primary hover:underline">
            <PubliVendeMark size="xs" className="shadow-none" />
            Tienda potenciada por PubliVende
          </a>
          <span>Pagos seguros · Atención por WhatsApp</span>
        </footer>
      </main>
    </div>
  );
}

const LABEL_PROV: Record<string, string> = {
  mercadopago: "Mercado Pago", payu: "PayU", wompi: "Wompi", kushki: "Kushki", stripe: "Stripe", manual: "transferencia",
};

const FAQ = [
  { q: "¿Cuánto tarda el envío?", a: "Entre 2 y 3 días hábiles dentro del país. Para destinos remotos puede tardar hasta 5 días." },
  { q: "¿Aceptan devoluciones?", a: "Sí, tienes 7 días desde la entrega para devolver el producto sin uso y con etiqueta original." },
  { q: "¿Cómo puedo pagar?", a: "Aceptamos pago online con tarjeta o transferencia, y también pago contra entrega previa coordinación por WhatsApp." },
  { q: "¿Puedo ver más productos?", a: "Escríbenos por WhatsApp y te enviamos el catálogo completo personalizado." },
];
