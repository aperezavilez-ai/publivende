import { createFileRoute } from '@tanstack/react-router';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { WhatsAppDashboard } from '@/components/whatsapp/WhatsAppDashboard';

export const Route = createFileRoute('/whatsapp')({
  component: WhatsAppPage,
});

function WhatsAppPage() {
  return (
    <DashboardLayout>
      <WhatsAppDashboard />
    </DashboardLayout>
  );
}
