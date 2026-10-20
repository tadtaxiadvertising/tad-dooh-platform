import { useEffect } from "react";
import { useRouter } from "next/router";
import type { GetServerSideProps } from "next";

/**
 * TAD Admin Folder Redirector
 * Ensures /admin always points to the primary dashboard.
 */

export const getServerSideProps: GetServerSideProps = async () => ({
  props: {},
});

export default function AdminRootRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <div className="w-12 h-12 rounded-full border-t-2 border-tad-yellow animate-spin" />
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
          Reconectando con el Centro de Control...
        </p>
      </div>
    </div>
  );
}
