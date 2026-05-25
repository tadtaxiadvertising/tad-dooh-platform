import React from 'react';
import Link from 'next/link';
import { LucideIcon } from 'lucide-react';

export function ZeroState({ icon: Icon, title, description, ctaLabel, ctaHref }: { icon: LucideIcon; title: string; description: string; ctaLabel?: string; ctaHref?: string; }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/30 p-10 text-center">
      <Icon className="w-10 h-10 text-zinc-500 mx-auto mb-4" />
      <h3 className="text-xl font-bold text-white">{title}</h3>
      <p className="text-sm text-zinc-400 mt-2">{description}</p>
      {ctaLabel && ctaHref ? (
        <Link href={ctaHref} className="inline-flex mt-5 px-5 py-3 rounded-xl bg-[#FFD700] text-black font-bold text-xs uppercase tracking-widest">
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}
