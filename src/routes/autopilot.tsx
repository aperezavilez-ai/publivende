import { createFileRoute } from '@tanstack/react-router';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AutopilotDashboard } from '@/components/autopilot/AutopilotDashboard';

export const Route = createFileRoute('/autopilot')({
  component: AutopilotPage,
});

function AutopilotPage() {
  return (
    <DashboardLayout>
      <AutopilotDashboard />
    </DashboardLayout>
  );
}
