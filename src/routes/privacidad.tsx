import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/LegalLayout";

export const Route = createFileRoute("/privacidad")({
  head: () => ({
    meta: [
      { title: "Política de privacidad — PubliVende" },
      { name: "description", content: "Cómo PubliVende recopila, usa y protege tus datos personales." },
    ],
  }),
  component: PrivacidadPage,
});

function PrivacidadPage() {
  return (
    <LegalLayout title="Política de privacidad">
      <p>
        PubliVende (&quot;nosotros&quot;) respeta tu privacidad. Esta política describe qué datos recopilamos
        cuando usas nuestra plataforma web y cómo los utilizamos.
      </p>
      <h2>1. Datos que recopilamos</h2>
      <ul>
        <li>Datos de registro: nombre, email, teléfono, nombre del negocio.</li>
        <li>Datos de uso: publicaciones, productos, reglas de WhatsApp y configuración de tu cuenta.</li>
        <li>Tokens OAuth: cuando conectas Meta, Google o TikTok, almacenamos tokens de acceso para publicar en tu nombre.</li>
      </ul>
      <h2>2. Cómo usamos tus datos</h2>
      <ul>
        <li>Operar la plataforma: publicar contenido, CRM de WhatsApp, analíticas y automatizaciones.</li>
        <li>Mejorar el servicio y soporte técnico.</li>
        <li>Cumplir obligaciones legales cuando aplique.</li>
      </ul>
      <h2>2.1. Datos de TikTok</h2>
      <p>
        Si conectas TikTok, accedemos únicamente a la información autorizada por ti (perfil básico y
        publicación de videos). No vendemos ni compartimos tus datos de TikTok con terceros con fines
        publicitarios.
      </p>
      <h2>3. Almacenamiento</h2>
      <p>
        En la versión actual de desarrollo, los datos se guardan localmente en tu navegador. En producción
        se almacenarán en servidores seguros con cifrado en tránsito (HTTPS).
      </p>
      <h2>4. Tus derechos</h2>
      <p>
        Puedes acceder, corregir o eliminar tu cuenta desde Configuración → Zona de peligro. Para solicitudes
        de privacidad escribe a <a href="mailto:soporte@publivende.com">soporte@publivende.com</a>.
      </p>
      <h2>5. Cookies y tecnologías similares</h2>
      <p>
        Usamos almacenamiento local para mantener tu sesión y preferencias. No usamos cookies de rastreo
        publicitario de terceros.
      </p>
      <h2>6. Cambios</h2>
      <p>
        Podemos actualizar esta política. Publicaremos la fecha de revisión en esta página.
      </p>
      <h2>7. Contacto</h2>
      <p>
        Responsable: PubliVende · Email: <a href="mailto:soporte@publivende.com">soporte@publivende.com</a>
      </p>
    </LegalLayout>
  );
}
