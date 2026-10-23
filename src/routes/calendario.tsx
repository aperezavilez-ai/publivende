import { createFileRoute } from '@tanstack/react-router';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CalendarioView } from '@/components/calendar/CalendarioView';

export const Route = createFileRoute('/calendario')({
  component: CalendarioPage,
});

function CalendarioPage() {
  return (
    <DashboardLayout>
      <CalendarioView />
    </DashboardLayout>
  );
}
