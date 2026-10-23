import { createFileRoute } from '@tanstack/react-router';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProductosDashboard } from '@/components/products/ProductosDashboard';

export const Route = createFileRoute('/productos')({
  component: ProductosPage,
});

function ProductosPage() {
  return (
    <DashboardLayout>
      <ProductosDashboard />
    </DashboardLayout>
  );
}
