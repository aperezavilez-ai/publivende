import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/LegalLayout";

export const Route = createFileRoute("/terminos")({
  head: () => ({
    meta: [
      { title: "Términos de servicio — PubliVende" },
      { name: "description", content: "Términos de uso de la plataforma PubliVende para creadores y pymes LATAM." },
    ],
  }),
  component: TerminosPage,
});

function TerminosPage() {
  return (
    <LegalLayout title="Términos de servicio">
      <p>
        Al usar PubliVende aceptas estos términos. PubliVende es una plataforma que permite a creadores y
        pequeños negocios publicar contenido en redes sociales (Instagram, TikTok, Facebook, YouTube) y
        gestionar conversaciones de WhatsApp.
      </p>
      <h2>1. Cuenta y elegibilidad</h2>
      <p>
        Debes ser mayor de edad y proporcionar información veraz al registrarte. Eres responsable de
        mantener la confidencialidad de tu contraseña y de toda actividad en tu cuenta.
      </p>
      <h2>2. Uso permitido</h2>
      <p>
        PubliVende debe usarse de forma lícita. No publiques contenido que infrinja derechos de autor,
        promueva actividades ilegales o viole las políticas de las redes conectadas (Meta, Google, TikTok).
      </p>
      <h2>3. Conexión con redes sociales</h2>
      <p>
        Al conectar tus cuentas autorizas a PubliVende a actuar en tu nombre según los permisos OAuth que
        apruebes. Puedes desconectar en cualquier momento desde Configuración.
      </p>
      <h2>4. Planes y pagos</h2>
      <p>
        Los planes Free, Pro y Business tienen límites de uso descritos en la página de precios. Los cargos
        de planes de pago se procesarán según el método indicado al contratar el servicio.
      </p>
      <h2>5. Propiedad intelectual</h2>
      <p>
        Conservas los derechos sobre el contenido que subes. PubliVende no reclama propiedad sobre tus
        publicaciones, imágenes ni textos.
      </p>
      <h2>6. Limitación de responsabilidad</h2>
      <p>
        PubliVende se ofrece &quot;tal cual&quot;. No garantizamos resultados de ventas, alcance orgánico ni
        disponibilidad ininterrumpida de APIs de terceros.
      </p>
      <h2>7. Contacto</h2>
      <p>
        Dudas sobre estos términos: <a href="mailto:soporte@publivende.com">soporte@publivende.com</a>
      </p>
    </LegalLayout>
  );
}
