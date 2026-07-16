/**
 * register.tsx — Driver Registration (4-Step Wizard)
 *
 * Step 1: Value proposition (earn RD$500 per active ad, up to 15 = RD$7,500/month)
 * Step 2: Earnings calculator with +/- controls
 * Step 3: Registration form (name, phone, cedula, vehicle plate, password)
 * Step 4: Success confirmation → redirect to /login
 *
 * Posts to /drivers via the direct API client. Same Spanish text as PWA.
 */

import { View, Text, TextInput, Pressable, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import client from '../src/lib/api';
import { Colors, GlassmorphismStyles, Typography, Spacing } from '../src/styles/theme';

type OnboardingStep = 1 | 2 | 3 | 4;

const TOTAL_STEPS = 4;
const PAY_PER_UNIT_RD = 500;
const MAX_CAMPAIGNS = 15;
const MAX_REFERRALS = 10;

export default function DriverRegister() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>(1);

  // ── Simulator ─────────────────────────────────────────────────────
  const [campaigns, setCampaigns] = useState(5);
  const [referredAdvertisers, setReferredAdvertisers] = useState(1);
  const [referredDrivers, setReferredDrivers] = useState(1);

  const projectedEarnings =
    (campaigns * PAY_PER_UNIT_RD) +
    (referredAdvertisers * PAY_PER_UNIT_RD) +
    (referredDrivers * PAY_PER_UNIT_RD);

  // ── Registration fields ───────────────────────────────────────────
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [cedula, setCedula] = useState('');
  const [taxiPlate, setTaxiPlate] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [contractAccepted, setContractAccepted] = useState(false);
  const [hardwareLiability, setHardwareLiability] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const nextStep = () => setStep(s => Math.min(s + 1, 4) as OnboardingStep);
  const prevStep = () => setStep(s => Math.max(s - 1, 1) as OnboardingStep);

  // ── Registration handler ──────────────────────────────────────────
  const handleRegister = async () => {
    setError('');

    if (!fullName || !phone || !cedula || !taxiPlate || !password) {
      setError('Todos los campos son obligatorios');
      return;
    }

    if (!contractAccepted || !hardwareLiability) {
      setError('Debes aceptar ambos acuerdos para continuar');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      const res = await client.post('/drivers', {
        fullName,
        phone,
        cedula,
        taxiPlate,
        password,
        contractAccepted: true,
        agreementVersion: '2.0 (HaaS)',
        subscriptionPaid: false,
      });

      if (res.status === 201 || res.status === 200) {
        setTimeout(() => setStep(4), 1000);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Error al registrar';
      setError(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Benefit cards data ────────────────────────────────────────────
  const benefits = [
    {
      title: 'Pagos por Campaña',
      desc: 'Recibe RD$500 mensuales por cada anuncio activo en tu pantalla (hasta 15 anuncios simultáneos).',
      color: Colors.emerald400,
      bgColor: 'rgba(34, 197, 94, 0.10)',
    },
    {
      title: 'Referidos de Negocios',
      desc: 'Gana RD$500 adicionales por cada marca o negocio local que recomiendes y se anuncie con nosotros.',
      color: '#a78bfa',
      bgColor: 'rgba(167, 139, 250, 0.10)',
    },
    {
      title: 'Invitar Compañeros',
      desc: 'Gana un bono de RD$500 por cada compañero taxista que refieras cuando instale su pantalla.',
      color: '#60a5fa',
      bgColor: 'rgba(96, 165, 250, 0.10)',
    },
  ];

  // ── Step indicator ─────────────────────────────────────────────────
  const StepIndicator = () => (
    <View className="flex-row items-center gap-1.5">
      {[1, 2, 3, 4].map(i => (
        <View
          key={i}
          className="h-1 rounded-full"
          style={{
            width: step >= i ? 32 : 16,
            backgroundColor: step >= i ? Colors.yellow : Colors.whiteAlpha10,
          }}
        />
      ))}
    </View>
  );

  // ── Counter control ────────────────────────────────────────────────
  const CounterControl = ({
    label,
    value,
    onChange,
    min,
    max,
    color,
    helper,
  }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    min: number;
    max: number;
    color: string;
    helper: string;
  }) => (
    <View className="mb-5">
      <View className="flex-row justify-between items-center mb-1">
        <Text className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
          {label}
        </Text>
        <Text className="text-sm font-black" style={{ color }}>
          {value} {value === 1 ? 'unidad' : 'unidades'}
        </Text>
      </View>
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={() => onChange(Math.max(min, value - 1))}
          className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 items-center justify-center active:opacity-80"
        >
          <Text className="text-white font-black text-lg">-</Text>
        </Pressable>
        <View
          className="flex-1 h-2 rounded-lg"
          style={{ backgroundColor: Colors.zinc900Alpha60 }}
        >
          <View
            className="h-full rounded-lg"
            style={{
              width: `${((value - min) / (max - min)) * 100}%`,
              backgroundColor: color,
            }}
          />
        </View>
        <Pressable
          onPress={() => onChange(Math.min(max, value + 1))}
          className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 items-center justify-center active:opacity-80"
        >
          <Text className="text-white font-black text-lg">+</Text>
        </Pressable>
      </View>
      <Text className="text-[10px] text-zinc-500 mt-1">{helper}</Text>
    </View>
  );

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-tad-dark">
      {/* Top nav bar */}
      <View className="w-full px-4 pt-4 pb-2 flex-row items-center justify-between">
        <Pressable
          onPress={() => step > 1 ? prevStep() : router.replace('/login')}
          className="w-10 h-10 items-center justify-center rounded-2xl bg-white/5 border border-white/5 active:opacity-80"
        >
          <Text className="text-zinc-400 text-lg font-bold">‹</Text>
        </Pressable>

        <StepIndicator />

        <Text className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
          {step}/{TOTAL_STEPS}
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-4 pb-8"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {/* ═══════════ STEP 1: Value Proposition ═══════════ */}
        {step === 1 && (
          <View className="flex-1 py-6">
            {/* Hero */}
            <View className="items-center mb-8">
              <View
                className="w-20 h-20 rounded-[28px] items-center justify-center mb-6"
                style={{ backgroundColor: Colors.yellow }}
              >
                <Text className="text-black text-2xl font-black">✦</Text>
              </View>
              <Text className="text-[28px] font-black text-white uppercase tracking-tight text-center leading-tight mb-3">
                Tu taxi genera{'\n'}
                <Text style={{ color: Colors.yellow }}>dinero extra</Text>
              </Text>
              <Text className="text-sm text-zinc-400 font-medium text-center leading-relaxed max-w-[320px]">
                Coloca una pantalla publicitaria en tu taxi y gana dinero mensual mientras realizas tus rutas de siempre.
              </Text>
            </View>

            {/* Benefit cards */}
            <View className="gap-3 flex-1">
              {benefits.map((b, i) => (
                <View
                  key={i}
                  className="flex-row items-start gap-4 p-4 rounded-2xl"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    borderWidth: 1,
                    borderColor: Colors.whiteAlpha5,
                  }}
                >
                  <View
                    className="w-11 h-11 rounded-xl items-center justify-center shrink-0"
                    style={{ backgroundColor: b.bgColor }}
                  >
                    <Text className="font-black text-sm" style={{ color: b.color }}>
                      {i === 0 ? '$' : i === 1 ? '♦' : '►'}
                    </Text>
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="text-sm font-black text-white uppercase tracking-tight">
                      {b.title}
                    </Text>
                    <Text className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                      {b.desc}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* CTA */}
            <View className="pt-6">
              <Pressable
                onPress={nextStep}
                className="bg-tad-yellow rounded-2xl py-5 items-center justify-center active:opacity-80"
              >
                <Text className="text-tad-dark font-black uppercase tracking-[0.15em] text-sm">
                  PROBAR SIMULADOR DE GANANCIAS →
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ═══════════ STEP 2: Earnings Calculator ═══════════ */}
        {step === 2 && (
          <View className="flex-1 py-6">
            {/* Header */}
            <View className="items-center mb-6">
              <View
                className="px-4 py-1.5 rounded-full mb-4"
                style={{
                  backgroundColor: 'rgba(34, 197, 94, 0.10)',
                  borderWidth: 1,
                  borderColor: 'rgba(34, 197, 94, 0.20)',
                }}
              >
                <Text className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em]">
                  Simulador de Comisiones
                </Text>
              </View>
              <Text className="text-[26px] font-black text-white uppercase tracking-tight text-center leading-tight mb-2">
                Simula tus{'\n'}
                <Text style={{ color: Colors.emerald400 }}>Ingresos</Text>
              </Text>
              <Text className="text-xs text-zinc-500 font-medium">
                Ajusta los valores para calcular tus ganancias estimadas
              </Text>
            </View>

            {/* Calculator Card */}
            <View style={GlassmorphismStyles.stitchedCard} className="p-6">
              <CounterControl
                label="1. Anuncios en tu Pantalla (1 - 15)"
                value={campaigns}
                onChange={setCampaigns}
                min={1}
                max={MAX_CAMPAIGNS}
                color={Colors.yellow}
                helper="Ganas RD$500 mensuales por cada anuncio en pantalla."
              />

              <CounterControl
                label="2. Negocios Recomendados (0 - 10)"
                value={referredAdvertisers}
                onChange={setReferredAdvertisers}
                min={0}
                max={MAX_REFERRALS}
                color="#a78bfa"
                helper="Bono de RD$500 al mes por cada comercio que refieras."
              />

              <CounterControl
                label="3. Compañeros Taxistas Invitados (0 - 10)"
                value={referredDrivers}
                onChange={setReferredDrivers}
                min={0}
                max={MAX_REFERRALS}
                color="#60a5fa"
                helper="Bono de RD$500 al mes por cada colega taxista en la red."
              />

              {/* Earnings display */}
              <View
                className="rounded-2xl p-6"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.40)',
                  borderWidth: 1,
                  borderColor: Colors.whiteAlpha5,
                }}
              >
                <View className="flex-row justify-between items-end mb-4">
                  <View>
                    <Text className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mb-1">
                      Total Mensual Estimado
                    </Text>
                    <View className="flex-row items-baseline gap-1">
                      <Text className="text-[10px] text-zinc-500 font-bold">RD$</Text>
                      <Text className="text-4xl font-black text-white tracking-tighter">
                        {projectedEarnings.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="text-[9px] text-emerald-500 font-black uppercase tracking-widest mb-1">
                      Rol
                    </Text>
                    <Text className="text-lg font-black text-emerald-400 tracking-tight">
                      Socio
                    </Text>
                  </View>
                </View>

                <View
                  className="border-t pt-4"
                  style={{ borderTopColor: Colors.whiteAlpha5 }}
                >
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-[11px] text-zinc-400">
                      Por anuncios activos ({campaigns}):
                    </Text>
                    <Text className="text-[11px] text-white font-bold">
                      RD${(campaigns * 500).toLocaleString()}
                    </Text>
                  </View>
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-[11px] text-zinc-400">
                      Por negocios recomendados ({referredAdvertisers}):
                    </Text>
                    <Text className="text-[11px] text-white font-bold">
                      RD${(referredAdvertisers * 500).toLocaleString()}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-[11px] text-zinc-400">
                      Por compañeros taxistas ({referredDrivers}):
                    </Text>
                    <Text className="text-[11px] text-white font-bold">
                      RD${(referredDrivers * 500).toLocaleString()}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Membership cost */}
              <View
                className="rounded-xl p-4 mt-5"
                style={{
                  backgroundColor: Colors.whiteAlpha5,
                  borderWidth: 1,
                  borderColor: Colors.whiteAlpha5,
                }}
              >
                <View className="flex-row justify-between mb-2">
                  <Text className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    Inversión de Activación
                  </Text>
                  <Text className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    Monto
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-xs font-bold text-zinc-300">
                    Membresía Flota y Seguro de Hardware
                  </Text>
                  <Text className="text-xs font-bold text-zinc-300">
                    RD$6,000 / año
                  </Text>
                </View>
                <Text className="text-[10px] text-zinc-500 italic mt-1.5 leading-normal">
                  * El pago de la membresía cubre el Starter Kit (tablet, soporte, cableado) y seguro contra robo o averías.
                </Text>
              </View>
            </View>

            {/* CTA */}
            <View className="pt-6">
              <Pressable
                onPress={nextStep}
                className="bg-tad-yellow rounded-2xl py-5 items-center justify-center active:opacity-80"
              >
                <Text className="text-tad-dark font-black uppercase tracking-[0.15em] text-sm">
                  QUIERO SOLICITAR MI PANTALLA →
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ═══════════ STEP 3: Registration Form ═══════════ */}
        {step === 3 && (
          <View className="flex-1 py-4">
            {/* Header */}
            <View className="items-center mb-4">
              <Text className="text-[22px] font-black text-white uppercase tracking-tight text-center leading-tight mb-1">
                Completa tu Registro
              </Text>
              <Text className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider text-center">
                Asegura tu membresía de RD$6,000 / año
              </Text>
            </View>

            {/* Error display */}
            {error && (
              <View
                className="mb-4 p-3 rounded-xl flex-row items-center gap-2"
                style={{
                  backgroundColor: 'rgba(220, 38, 38, 0.10)',
                  borderWidth: 1,
                  borderColor: 'rgba(220, 38, 38, 0.20)',
                }}
              >
                <Text className="text-red-400 font-black">⚠</Text>
                <Text className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
                  {error}
                </Text>
              </View>
            )}

            {/* Full Name */}
            <View className="mb-4">
              <Text className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1.5 ml-1">
                Nombre Completo
              </Text>
              <TextInput
                className="bg-black/60 border border-white/5 rounded-xl px-4 py-4 text-white text-sm font-bold"
                placeholder="Juan Pérez"
                placeholderTextColor={Colors.zinc500}
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            {/* Phone */}
            <View className="mb-4">
              <Text className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1.5 ml-1">
                Teléfono Celular
              </Text>
              <TextInput
                className="bg-black/60 border border-white/5 rounded-xl px-4 py-4 text-white text-sm font-bold"
                placeholder="829-555-0001"
                placeholderTextColor={Colors.zinc500}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            {/* Cedula + Placa row */}
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1.5 ml-1">
                  Cédula
                </Text>
                <TextInput
                  className="bg-black/60 border border-white/5 rounded-xl px-4 py-4 text-white text-sm font-bold"
                  placeholder="001-0000000-0"
                  placeholderTextColor={Colors.zinc500}
                  value={cedula}
                  onChangeText={setCedula}
                />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1.5 ml-1">
                  Placa del Taxi
                </Text>
                <TextInput
                  className="bg-black/60 border border-white/5 rounded-xl px-4 py-4 text-white text-sm font-bold"
                  placeholder="T-101"
                  placeholderTextColor={Colors.zinc500}
                  autoCapitalize="characters"
                  value={taxiPlate}
                  onChangeText={setTaxiPlate}
                />
              </View>
            </View>

            {/* Password */}
            <View className="mb-4">
              <Text className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1.5 ml-1">
                Contraseña (mín. 6 caracteres)
              </Text>
              <View className="flex-row items-center">
                <TextInput
                  className="flex-1 bg-black/60 border border-white/5 rounded-xl px-4 py-4 text-white text-sm font-bold"
                  placeholder={showPassword ? 'MiClave123' : '••••••••'}
                  placeholderTextColor={Colors.zinc500}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  className="ml-3 px-3 py-2 rounded-xl bg-white/5"
                >
                  <Text className="text-zinc-500 text-xs font-bold">
                    {showPassword ? 'OCULTAR' : 'VER'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Agreement checkboxes */}
            <View className="gap-3 mb-4">
              <Pressable
                onPress={() => setContractAccepted(!contractAccepted)}
                className="flex-row items-center gap-3 p-3 rounded-xl"
                style={{
                  backgroundColor: contractAccepted ? 'rgba(34, 197, 94, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  borderWidth: 1,
                  borderColor: contractAccepted ? 'rgba(34, 197, 94, 0.20)' : Colors.whiteAlpha5,
                }}
              >
                <View
                  className="w-6 h-6 rounded-lg items-center justify-center"
                  style={{
                    backgroundColor: contractAccepted ? Colors.green : Colors.whiteAlpha5,
                    borderWidth: 1,
                    borderColor: contractAccepted ? Colors.green : Colors.whiteAlpha10,
                  }}
                >
                  {contractAccepted && (
                    <Text className="text-white text-xs font-black">✓</Text>
                  )}
                </View>
                <Text className="text-xs text-zinc-300 font-bold flex-1 leading-relaxed">
                  Acepto el contrato de servicio y el uso del hardware proporcionado.
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setHardwareLiability(!hardwareLiability)}
                className="flex-row items-center gap-3 p-3 rounded-xl"
                style={{
                  backgroundColor: hardwareLiability ? 'rgba(34, 197, 94, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  borderWidth: 1,
                  borderColor: hardwareLiability ? 'rgba(34, 197, 94, 0.20)' : Colors.whiteAlpha5,
                }}
              >
                <View
                  className="w-6 h-6 rounded-lg items-center justify-center"
                  style={{
                    backgroundColor: hardwareLiability ? Colors.green : Colors.whiteAlpha5,
                    borderWidth: 1,
                    borderColor: hardwareLiability ? Colors.green : Colors.whiteAlpha10,
                  }}
                >
                  {hardwareLiability && (
                    <Text className="text-white text-xs font-black">✓</Text>
                  )}
                </View>
                <Text className="text-xs text-zinc-300 font-bold flex-1 leading-relaxed">
                  Acepto la responsabilidad del equipo (Starter Kit) y el seguro contra robo o averías.
                </Text>
              </Pressable>
            </View>

            {/* Submit */}
            <Pressable
              onPress={handleRegister}
              disabled={loading}
              className="bg-tad-yellow rounded-2xl py-5 items-center justify-center mt-2 active:opacity-80"
              style={{ opacity: loading ? 0.6 : 1 }}
            >
              <Text className="text-tad-dark font-black uppercase tracking-[0.15em] text-sm">
                {loading ? 'Registrando...' : 'UNIRME A LA RED Y SOLICITAR PANTALLA'}
              </Text>
            </Pressable>
          </View>
        )}

        {/* ═══════════ STEP 4: Success ═══════════ */}
        {step === 4 && (
          <View className="flex-1 items-center justify-center py-12">
            <View
              className="w-20 h-20 rounded-full items-center justify-center mb-6"
              style={{
                backgroundColor: 'rgba(34, 197, 94, 0.10)',
                borderWidth: 1,
                borderColor: 'rgba(34, 197, 94, 0.20)',
              }}
            >
              <Text className="text-emerald-400 text-3xl font-black">✓</Text>
            </View>

            <Text className="text-[28px] font-black text-white uppercase tracking-tight text-center mb-3">
              Tu registro se completó!
            </Text>
            <Text className="text-sm text-zinc-400 text-center leading-relaxed mb-8 max-w-[300px]">
              Ya eres parte de la red TAD. Inicia sesión para comenzar a configurar tu operación.
            </Text>

            <Pressable
              onPress={() => router.replace('/login')}
              className="bg-tad-yellow rounded-2xl py-5 px-8 items-center justify-center active:opacity-80"
            >
              <Text className="text-tad-dark font-black uppercase tracking-[0.15em] text-sm">
                IR A INICIAR SESIÓN
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
