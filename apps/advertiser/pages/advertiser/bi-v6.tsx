import React, { useState, useEffect } from 'react';
import { AdvertiserLayout } from '@/components/layout/AdvertiserLayout';
import { BiMainDashboard } from '@/components/bi/BiMainDashboard';
import { LayoutDashboard } from 'lucide-react';

export default function BiV6Page() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <AdvertiserLayout title="Business Intelligence v6.0" subtitle="Advanced Analytics">
      <div className="flex items-center gap-3 mb-8">
        <LayoutDashboard className="text-[#FFD700] w-8 h-8" />
        <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">
          Dashboard <span className="text-[#FFD700]">v6.0</span>
        </h1>
      </div>
      
      <BiMainDashboard />
    </AdvertiserLayout>
  );
}
