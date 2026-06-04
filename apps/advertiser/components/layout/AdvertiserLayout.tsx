import React from 'react';
import { Layout } from '@tad/ui';

interface AdvertiserLayoutProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function AdvertiserLayout({ title, subtitle, children }: AdvertiserLayoutProps) {
  return (
    <Layout>
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