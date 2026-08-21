import React from 'react';
import { Layout } from '@tad/ui';
import CityMapBackdrop from '@/components/advertiser/CityMapBackdrop';

interface AdvertiserLayoutProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function AdvertiserLayout({ title, subtitle, children }: AdvertiserLayoutProps) {
  return (
    <Layout>
      {/* Identidad ambiental del portal: ciudad nocturna tras el vidrio */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 opacity-40">
        <CityMapBackdrop />
      </div>
      {(title || subtitle) && (
        <div className="mb-8">
          {title && (
            <h1 className="text-2xl font-black tracking-tighter text-white uppercase italic">
              {title} {subtitle && <span className="text-[#FFD400]">{subtitle}</span>}
            </h1>
          )}
        </div>
      )}
      {children}
    </Layout>
  );
}