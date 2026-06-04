import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { getMyProfile, updateMyProfile } from '@tad/services/api';
import { User, Shield, Key, Mail, Save, Loader2, Info, Building2 } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { AdvertiserLayout } from '@/components/layout/AdvertiserLayout';
import type { GetServerSideProps } from 'next';
// Force dynamic rendering — prevents "No QueryClient set" SSR errors
export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });

export default function AdvertiserProfilePage() {
  const router = useRouter();
  const { data: profile, error, isLoading, mutate } = useSWR('/auth/profile', getMyProfile);

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Sync state when data loads
  React.useEffect(() => {
    if (profile && !name) {
      setName(profile.name || profile.fullName || profile.contactName || '');
    }
  }, [profile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await updateMyProfile({ name });
      await mutate();
      toast.success('Perfil actualizado correctamente');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al actualizar el perfil');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsSavingPassword(true);
    try {
      await updateMyProfile({ password: newPassword, currentPassword });
      toast.success('Contraseña actualizada correctamente');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al actualizar la contraseña');
    } finally {
      setIsSavingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <AdvertiserLayout title="Perfil" subtitle="Cargando...">
        <div className="flex h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#FFD700]" />
        </div>
      </AdvertiserLayout>
    );
  }

  if (error) {
    return (
      <AdvertiserLayout title="Perfil" subtitle="Error">
        <div className="p-8 text-center text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
          <p className="font-bold">Error al cargar la información del perfil</p>
          <button
            onClick={() => mutate()}
            className="mt-4 text-xs uppercase tracking-widest font-black text-white hover:text-[#FFD700] transition-colors"
          >
            Reintentar
          </button>
        </div>
      </AdvertiserLayout>
    );
  }

  return (
    <AdvertiserLayout title="Mi Perfil" subtitle="Configuración de Cuenta">
      <Toaster theme="dark" richColors />

      <div className="space-y-8 max-w-5xl">
        {/* HEADER */}
        <section>
          <div className="flex items-center gap-2 text-[#FFD700] mb-2">
            <User size={18} />
            <span className="text-xs font-black uppercase tracking-[0.2em]">Account Management</span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-white uppercase italic">
            Mi <span className="text-[#FFD700]">Perfil</span>
          </h1>
          <p className="text-[#F4F4F5]/60 max-w-md mt-2">
            Gestiona tu identidad digital y la seguridad de tu acceso al portal de anunciantes.
          </p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* PROFILE SUMMARY SIDEBAR */}
          <div className="lg:col-span-1 space-y-6">
            <div className="rounded-2xl border border-[#F4F4F5]/5 bg-[#18181B] p-8 flex flex-col items-center text-center">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-[#FFD700] to-[#B8860B] flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(255,215,0,0.15)] border-4 border-[#09090B]">
                <span className="text-3xl font-black text-black italic">
                  {(profile?.name || profile?.fullName || profile?.contactName || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">
                {profile?.name || profile?.fullName || profile?.contactName || 'Usuario'}
              </h2>
              <p className="text-[#F4F4F5]/40 text-xs font-bold mt-1 tracking-wider">{profile?.email}</p>

              <div className="mt-6 px-4 py-1.5 bg-white/5 rounded-full border border-white/10 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-[#FFD700]" />
                <span className="text-[10px] font-black text-[#F4F4F5]/70 uppercase tracking-[0.2em]">
                  {profile?.role || 'ADVERTISER'}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6 flex gap-4">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <div>
                <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Nota de Seguridad</h4>
                <p className="text-[11px] text-blue-200/50 leading-relaxed">
                  Los cambios en el perfil se sincronizan instantáneamente con el motor de identidades de Supabase.
                </p>
              </div>
            </div>
          </div>

          {/* MAIN FORMS */}
          <div className="lg:col-span-2 space-y-8">

            {/* PERSONAL INFO FORM */}
            <form onSubmit={handleUpdateProfile} className="rounded-2xl border border-[#F4F4F5]/5 bg-[#18181B] p-8">
              <h3 className="text-lg font-black text-white mb-8 flex items-center gap-3 uppercase tracking-wider italic">
                <Building2 className="w-5 h-5 text-[#FFD700]" />
                Datos de Contacto
              </h3>

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#F4F4F5]/40 uppercase tracking-widest ml-1">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#09090B] border border-[#F4F4F5]/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-[#FFD700]/50 outline-none transition-all placeholder:text-zinc-800"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#F4F4F5]/40 uppercase tracking-widest ml-1">Email de Acceso (Solo Lectura)</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    <input
                      type="email"
                      disabled
                      value={profile?.email || ''}
                      className="w-full bg-[#09090B]/50 border border-[#F4F4F5]/5 rounded-xl px-12 py-3 text-sm font-bold text-zinc-600 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-10 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="flex items-center gap-3 bg-white text-black px-8 py-3 rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-[#FFD700] transition-all disabled:opacity-30 group"
                >
                  {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 transition-transform group-hover:scale-110" />}
                  Confirmar Cambios
                </button>
              </div>
            </form>

            {/* PASSWORD FORM */}
            <form onSubmit={handleUpdatePassword} className="rounded-2xl border border-[#F4F4F5]/5 bg-[#18181B] p-8">
              <h3 className="text-lg font-black text-white mb-8 flex items-center gap-3 uppercase tracking-wider italic">
                <Key className="w-5 h-5 text-[#FFD700]" />
                Seguridad de Acceso
              </h3>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#F4F4F5]/40 uppercase tracking-widest ml-1">Contraseña Actual</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#09090B] border border-[#F4F4F5]/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-[#FFD700]/50 outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#F4F4F5]/40 uppercase tracking-widest ml-1">Nueva Contraseña</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#09090B] border border-[#F4F4F5]/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-[#FFD700]/50 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#F4F4F5]/40 uppercase tracking-widest ml-1">Repetir Nueva</label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#09090B] border border-[#F4F4F5]/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-[#FFD700]/50 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-10 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingPassword || !currentPassword || !newPassword || !confirmPassword}
                  className="flex items-center gap-3 bg-[#111111] text-white border border-white/10 px-8 py-3 rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:border-[#FFD700]/50 transition-all disabled:opacity-20 group"
                >
                  {isSavingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4 transition-transform group-hover:rotate-12" />}
                  Actualizar Clave
                </button>
              </div>
            </form>

          </div>
        </div>
      </div>
    </AdvertiserLayout>
  );
}
