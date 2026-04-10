import React, { useState, useEffect } from 'react';
import { AdvertiserLayout } from '../../components/layout/AdvertiserLayout';
import { BillingPortal } from '../../components/bi/BillingPortal';

export default function BillingPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <AdvertiserLayout title="Facturación" subtitle="Gestión Financiera">
      <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">
        Portal de <span className="text-[#FFD700]">Pagos</span>
      </h1>
      
      <div className="max-w-4xl">
        <BillingPortal />
      </div>
    </AdvertiserLayout>
  );
}
