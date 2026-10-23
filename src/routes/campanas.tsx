import { createFileRoute } from '@tanstack/react-router';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CampanasDashboard } from '@/components/campaigns/CampanasDashboard';

export const Route = createFileRoute('/campanas')({
  component: CampanasPage,
});

function CampanasPage() {
  return (
    <DashboardLayout>
      <CampanasDashboard />
    </DashboardLayout>
  );
}
