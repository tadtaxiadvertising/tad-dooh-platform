import React, { FormEvent, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import axios from "axios";

export default function DriverRegisterPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    password: "",
    confirmPassword: "",
    vehicleModel: "",
    licensePlate: "",
  });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      await axios.post("/api/proxy/auth/driver/register", {
        name: form.name,
        phone: form.phone,
        password: form.password,
        vehicleModel: form.vehicleModel,
        licensePlate: form.licensePlate,
      });
      setSuccess(
        "Registro completado. Tu perfil quedó pendiente de aprobación y pago.",
      );
      setForm({
        name: "",
        phone: "",
        password: "",
        confirmPassword: "",
        vehicleModel: "",
        licensePlate: "",
      });
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "No se pudo completar el registro.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <Head>
        <title>Registro | TAD DRIVER</title>
      </Head>
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl p-8 shadow-2xl">
        <h1 className="text-2xl font-black mb-2">Únete a la red TAD</h1>
        <p className="text-sm text-zinc-400 mb-6">
          Tu cuenta se crea con estado pendiente hasta aprobación
          administrativa.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            className="w-full rounded-xl bg-zinc-900/80 border border-zinc-700 p-3"
            placeholder="Nombre completo"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            className="w-full rounded-xl bg-zinc-900/80 border border-zinc-700 p-3"
            placeholder="Teléfono"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            required
          />
          <input
            className="w-full rounded-xl bg-zinc-900/80 border border-zinc-700 p-3"
            placeholder="Modelo del vehículo"
            value={form.vehicleModel}
            onChange={(e) => setForm({ ...form, vehicleModel: e.target.value })}
            required
          />
          <input
            className="w-full rounded-xl bg-zinc-900/80 border border-zinc-700 p-3"
            placeholder="Placa"
            value={form.licensePlate}
            onChange={(e) => setForm({ ...form, licensePlate: e.target.value })}
            required
          />
          <input
            type="password"
            className="w-full rounded-xl bg-zinc-900/80 border border-zinc-700 p-3"
            placeholder="Contraseña"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            minLength={6}
          />
          <input
            type="password"
            className="w-full rounded-xl bg-zinc-900/80 border border-zinc-700 p-3"
            placeholder="Confirmar contraseña"
            value={form.confirmPassword}
            onChange={(e) =>
              setForm({ ...form, confirmPassword: e.target.value })
            }
            required
            minLength={6}
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          {success && <p className="text-emerald-400 text-sm">{success}</p>}
          <button
            disabled={loading}
            className="w-full bg-tad-yellow text-black font-bold rounded-xl py-3 disabled:opacity-60"
          >
            {loading ? "Registrando..." : "Crear cuenta"}
          </button>
        </form>
        <p className="mt-4 text-sm text-zinc-400">
          ¿Ya tienes cuenta?{" "}
          <Link href="/driver/login" className="text-tad-yellow">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
