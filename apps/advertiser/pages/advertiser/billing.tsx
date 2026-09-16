import { CreditCard } from 'lucide-react';
import type { GetServerSideProps } from 'next';
import { AdvertiserLayout } from '@/components/layout/AdvertiserLayout';
import { BillingPortal } from '@/components/bi/BillingPortal';

export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });

export default function BillingPage() {
  return (
    <AdvertiserLayout title="Facturación & Pagos" subtitle="Administración de Cuenta">
      <div className="flex items-center gap-3 mb-10">
        <CreditCard className="text-[#FFD700] w-8 h-8" />
        <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">
          Facturación <span className="text-[#FFD700]">& Pagos</span>
        </h1>
      </div>

      <div className="space-y-8">
        <BillingPortal />
      </div>
    </AdvertiserLayout>
  );
}
