import React, { useState, useEffect } from "react";
import type { GetServerSideProps } from "next";
import { AdvertiserLayout } from "../../components/layout/AdvertiserLayout";
import { MetricsGrid } from "../../components/bi/MetricsGrid";
import { BarChart3 } from "lucide-react";

export const getServerSideProps: GetServerSideProps = async () => ({
  props: {},
});

export default function InsightsPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <AdvertiserLayout
      title="Marketing Insights"
      subtitle="Business Intelligence"
    >
      <div className="flex items-center gap-3">
        <BarChart3 className="text-[#FFD700]" />
        <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">
          Marketing <span className="text-[#FFD700]">Insights</span>
        </h1>
      </div>

      <MetricsGrid />
    </AdvertiserLayout>
  );
}
