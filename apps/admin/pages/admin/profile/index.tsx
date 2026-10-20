import React, { useState } from "react";
import type { GetServerSideProps } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import useSWR from "swr";
import { getMyProfile, updateMyProfile } from "@tad/services";

// Force dynamic rendering — prevents "No QueryClient set" SSR errors
export const getServerSideProps: GetServerSideProps = async () => ({
  props: {},
});
import { User, Shield, Key, Mail, Save, Loader2, Info } from "lucide-react";
import { toast } from "sonner";

export default function ProfilePage() {
  const router = useRouter();
  const {
    data: profile,
    error,
    isLoading,
    mutate,
  } = useSWR("/auth/profile", getMyProfile);

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Sync state when data loads
  React.useEffect(() => {
    if (profile && !name) {
      setName(profile.name || profile.fullName || profile.contactName || "");
    }
  }, [profile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await updateMyProfile({ name });
      await mutate();
      toast.success("Perfil actualizado correctamente");
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "Error al actualizar el perfil",
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setIsSavingPassword(true);
    try {
      await updateMyProfile({ password: newPassword, currentPassword });
      toast.success("Contraseña actualizada correctamente");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "Error al actualizar la contraseña",
      );
    } finally {
      setIsSavingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-tad-brand" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-400">
        <p>Error al cargar el perfil</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Mi Perfil | TAD DOOH</title>
      </Head>

      <div className="space-y-8 pb-12">
        {/* HEADER */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Mi Perfil
          </h1>
          <p className="text-zinc-400 mt-2">
            Gestiona tu información personal y credenciales de acceso.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* PROFILE SUMMARY SIDEBAR */}
          <div className="col-span-1">
            <div className="rounded-xl border border-white/10 bg-[#0F0F13]/80 p-6 backdrop-blur-xl shadow-2xl flex flex-col items-center">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-tad-brand to-yellow-600 flex items-center justify-center mb-4 shadow-lg shadow-tad-brand/20">
                <span className="text-3xl font-bold text-black">
                  {(
                    profile?.name ||
                    profile?.fullName ||
                    profile?.contactName ||
                    "U"
                  )
                    .charAt(0)
                    .toUpperCase()}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mb-1">
                {profile?.name ||
                  profile?.fullName ||
                  profile?.contactName ||
                  "Usuario"}
              </h2>
              <p className="text-zinc-400 text-sm mb-4">{profile?.email}</p>

              <div className="px-3 py-1 bg-white/5 rounded-full border border-white/10 flex items-center gap-2">
                <Shield className="w-4 h-4 text-tad-brand" />
                <span className="text-xs font-medium text-zinc-300 uppercase tracking-wider">
                  {profile?.role || "ADMIN"}
                </span>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex gap-3">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-200/70 leading-relaxed">
                Tu rol actual determina el nivel de acceso en la plataforma.
                Para cambios de rol o transferencias de cuenta, contacta a
                soporte técnico.
              </p>
            </div>
          </div>

          {/* MAIN FORMS */}
          <div className="col-span-1 md:col-span-2 space-y-6">
            {/* PERSONAL INFO FORM */}
            <form
              onSubmit={handleUpdateProfile}
              className="rounded-xl border border-white/10 bg-[#0F0F13]/80 p-6 backdrop-blur-xl"
            >
              <h3 className="text-lg font-medium text-white mb-6 flex items-center gap-2 border-b border-white/5 pb-4">
                <User className="w-5 h-5 text-tad-brand" />
                Información Personal
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/50 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-tad-brand focus:outline-none focus:ring-1 focus:ring-tad-brand/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5 flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Correo Electrónico
                  </label>
                  <input
                    type="email"
                    disabled
                    value={profile?.email || ""}
                    className="w-full rounded-lg border border-white/5 bg-white/5 px-4 py-2.5 text-zinc-500 cursor-not-allowed"
                    title="El correo no puede ser modificado por seguridad"
                  />
                  <p className="text-xs text-zinc-500 mt-1.5">
                    El correo electrónico se utiliza como identificador único y
                    no puede cambiarse.
                  </p>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black transition-all hover:bg-tad-brand disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingProfile ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Guardar Cambios
                </button>
              </div>
            </form>

            {/* PASSWORD FORM */}
            <form
              onSubmit={handleUpdatePassword}
              className="rounded-xl border border-white/10 bg-[#0F0F13]/80 p-6 backdrop-blur-xl"
            >
              <h3 className="text-lg font-medium text-white mb-6 flex items-center gap-2 border-b border-white/5 pb-4">
                <Key className="w-5 h-5 text-tad-brand" />
                Cambiar Contraseña
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                    Contraseña Actual
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-white/10 bg-black/50 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-tad-brand focus:outline-none focus:ring-1 focus:ring-tad-brand/50 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                      Nueva Contraseña
                    </label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-lg border border-white/10 bg-black/50 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-tad-brand focus:outline-none focus:ring-1 focus:ring-tad-brand/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                      Confirmar Nueva Contraseña
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-lg border border-white/10 bg-black/50 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-tad-brand focus:outline-none focus:ring-1 focus:ring-tad-brand/50 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  type="submit"
                  disabled={
                    isSavingPassword ||
                    !currentPassword ||
                    !newPassword ||
                    !confirmPassword
                  }
                  className="flex items-center gap-2 rounded-lg bg-zinc-800 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
                >
                  {isSavingPassword ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Shield className="w-4 h-4" />
                  )}
                  Actualizar Contraseña
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
