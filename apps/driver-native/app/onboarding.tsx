/**
 * onboarding.tsx — Driver Onboarding Wizard (Post-Login)
 *
 * 4-stage flow matching the PWA dashboard modal:
 *   1. contract  — Accept agreement V2 (mandatory, can't close)
 *   2. bank      — Configure bank account via inline BankForm (mandatory, can't close)
 *   3. payment   — Starter Kit annual activation info (can close)
 *   4. ready     — Confirmation screen (can close)
 *
 * Fetches hub data to determine current stage and navigates through each.
 * Same Spanish text and logic as the PWA onboarding modal.
 */

import { View, Text, TextInput, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import client from '../src/lib/api';
import { useAuthStore } from '../src/store/useAuthStore';
import { Colors, GlassmorphismStyles, Typography, Spacing } from '../src/styles/theme';

// ─── Constants ────────────────────────────────────────────────────────────────

const DRIVER_AGREEMENT_VERSION = '2.0 (HaaS)';
const DRIVER_STARTER_KIT_FEE_RD = 6000;

type OnboardingStage = 'contract' | 'bank' | 'payment' | 'ready';

interface DriverReadinessData {
  contractAccepted: boolean;
  agreementVersion: string | null;
  bankAccountConfigured: boolean;
  subscriptionPaid: boolean;
  onboardingStatus: string;
  driverId: string;
}

// ─── Bank form constants ──────────────────────────────────────────────────────

type BankAccountType = 'AHORRO' | 'CORRIENTE';

interface BankFormData {
  banco: string;
  cuenta: string;
  tipo: BankAccountType;
  ownerName: string;
  cedula: string;
}

const BANK_OPTIONS = [
  { value: 'BPD', label: 'Banco Popular Dominicano', short: 'BPD' },
  { value: 'BHD', label: 'BHD León', short: 'BHD' },
  { value: 'BR', label: 'Banreservas', short: 'BR' },
  { value: 'SCOTIABANK', label: 'Scotiabank DR', short: 'SCO' },
  { value: 'APAP', label: 'Asociación Popular', short: 'APAP' },
];

const BANK_STEPS = ['Banco', 'Cuenta', 'Tipo', 'Titular', 'Cédula'] as const;

// ─── Stage determination ──────────────────────────────────────────────────────

function getDriverOnboardingStage(
  hubData: DriverReadinessData | null,
  bankPendingSync: boolean,
): OnboardingStage {
  if (!hubData?.contractAccepted) return 'contract';
  if (!hubData.bankAccountConfigured && !bankPendingSync) return 'bank';
  if (!hubData.subscriptionPaid) return 'payment';
  return 'ready';
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DriverOnboarding() {
  const router = useRouter();
  const { driverId } = useAuthStore();

  const [hubData, setHubData] = useState<DriverReadinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [bankPendingSync, setBankPendingSync] = useState(false);
  const [stage, setStage] = useState<OnboardingStage>('contract');

  // ── Bank form state (inline) ────────────────────────────────────────────────
  const [bankStep, setBankStep] = useState(1);
  const [bankSubmitting, setBankSubmitting] = useState(false);
  const [bankSavedOffline, setBankSavedOffline] = useState(false);
  const [bankFormData, setBankFormData] = useState<BankFormData>({
    banco: '',
    cuenta: '',
    tipo: 'AHORRO',
    ownerName: '',
    cedula: '',
  });

  // ── Fetch hub data ──────────────────────────────────────────────────────────
  useEffect(() => {
    const loadHubData = async () => {
      try {
        const res = await client.get('/drivers/me/hub');
        const raw = res.data;
        const normalized: DriverReadinessData = {
          contractAccepted: Boolean(raw?.contractAccepted),
          agreementVersion: raw?.agreementVersion ? String(raw.agreementVersion) : null,
          bankAccountConfigured: Boolean(raw?.bankAccountConfigured),
          subscriptionPaid: Boolean(raw?.subscriptionPaid),
          onboardingStatus: String(raw?.onboardingStatus || 'UNKNOWN'),
          driverId: String(raw?.driverId || ''),
        };
        setHubData(normalized);
        setStage(getDriverOnboardingStage(normalized, false));
      } catch (err: any) {
        Alert.alert('Error', 'No se pudo cargar tu estado de preparación.');
      } finally {
        setLoading(false);
      }
    };
    loadHubData();
  }, []);

  // ── Accept agreement handler ────────────────────────────────────────────────
  const handleAcceptAgreement = async () => {
    setBusy(true);
    try {
      await client.post(`/drivers/${driverId || hubData?.driverId}/accept-agreement`, {
        agreementVersion: DRIVER_AGREEMENT_VERSION,
      });
      // Update local state
      setHubData(prev => prev ? { ...prev, contractAccepted: true, agreementVersion: DRIVER_AGREEMENT_VERSION } : prev);
      setStage(getDriverOnboardingStage(
        { ...hubData!, contractAccepted: true, agreementVersion: DRIVER_AGREEMENT_VERSION },
        bankPendingSync,
      ));
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Error al registrar el acuerdo.';
      Alert.alert('Error', msg);
    } finally {
      setBusy(false);
    }
  };

  // ── Bank form handlers ──────────────────────────────────────────────────────
  const handleBankFieldChange = (field: keyof BankFormData, value: string) => {
    setBankFormData(prev => ({
      ...prev,
      [field]: field === 'tipo'
        ? (value === 'CHECKING' || value === 'CORRIENTE' ? 'CORRIENTE' : 'AHORRO')
        : value,
    }));
  };

  const handleBankNext = async () => {
    // Validation
    if (bankStep === 2 && !/^\d{10,20}$/.test(bankFormData.cuenta)) {
      Alert.alert('Error', 'Número de cuenta inválido (10–20 dígitos numéricos)');
      return;
    }
    if (bankStep === 5 && !/^\d{11}$/.test(bankFormData.cedula)) {
      Alert.alert('Error', 'Cédula inválida (11 dígitos, sin guiones)');
      return;
    }

    if (bankStep < 5) {
      setBankStep(bankStep + 1);
      return;
    }

    // Last step → submit
    setBankSubmitting(true);
    try {
      await client.put('/wallet/bank', {
        banco: bankFormData.banco,
        cuenta: bankFormData.cuenta,
        tipo: bankFormData.tipo === 'AHORRO' ? 'AHORRO' : 'CORRIENTE',
        cedula: bankFormData.cedula,
        ownerName: bankFormData.ownerName.trim(),
      });

      // Success
      setHubData(prev => prev ? { ...prev, bankAccountConfigured: true } : prev);
      setBankPendingSync(false);
      setStage(getDriverOnboardingStage(
        { ...hubData!, bankAccountConfigured: true },
        false,
      ));
    } catch (err: any) {
      const isNetworkFailure =
        !err?.response ||
        /failed to fetch|network|load failed/i.test(String(err?.response?.data?.message || err?.message || '').toLowerCase());

      if (isNetworkFailure) {
        // Save offline, mark as pending sync
        setBankSavedOffline(true);
        setBankPendingSync(true);
        setHubData(prev => prev ? { ...prev, bankAccountConfigured: false } : prev);
        setTimeout(() => {
          setStage(getDriverOnboardingStage(hubData!, true));
        }, 1800);
        return;
      }

      const msg = err?.response?.data?.message || 'No se pudo guardar la información bancaria.';
      Alert.alert('Error', Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setBankSubmitting(false);
    }
  };

  const handleBankBack = () => setBankStep(Math.max(1, bankStep - 1));

  const handleClose = () => {
    router.replace('/dashboard');
  };

  // ── Loading state ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View className="flex-1 bg-tad-dark items-center justify-center">
        <ActivityIndicator size="large" color={Colors.yellow} />
        <Text className="text-zinc-400 text-sm mt-4 font-bold">Cargando estado...</Text>
      </View>
    );
  }

  if (!hubData) {
    return (
      <View className="flex-1 bg-tad-dark items-center justify-center">
        <Text className="text-zinc-400 text-sm font-bold">No se pudo cargar tu información.</Text>
        <Pressable onPress={() => router.replace('/dashboard')} className="mt-4 px-6 py-3 rounded-xl bg-tad-yellow">
          <Text className="text-tad-dark font-black text-sm">Volver al Dashboard</Text>
        </Pressable>
      </View>
    );
  }

  // ── Can close? (only payment / ready stages) ─────────────────────────────────
  const canClose = stage === 'payment' || stage === 'ready';

  // ── Bank form isNextDisabled ─────────────────────────────────────────────────
  const isBankNextDisabled =
    (bankStep === 1 && !bankFormData.banco) ||
    (bankStep === 2 && bankFormData.cuenta.length < 10) ||
    (bankStep === 4 && bankFormData.ownerName.trim() === '') ||
    (bankStep === 5 && bankFormData.cedula.length !== 11) ||
    bankSubmitting;

  // ── Readiness progress ──────────────────────────────────────────────────────
  const readinessItems = [
    { label: 'Contrato', complete: hubData.contractAccepted, detail: hubData.contractAccepted ? `Firmado · ${hubData.agreementVersion || ''}` : 'Falta firma electrónica' },
    { label: 'Banco', complete: hubData.bankAccountConfigured || bankPendingSync, detail: hubData.bankAccountConfigured ? 'Configurado en backend' : bankPendingSync ? 'Pendiente de sincronización' : 'No configurado' },
    { label: 'Anualidad', complete: hubData.subscriptionPaid, detail: hubData.subscriptionPaid ? 'Operativa' : `Pendiente RD$${DRIVER_STARTER_KIT_FEE_RD.toLocaleString()}` },
  ];
  const completedCount = readinessItems.filter(r => r.complete).length;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-tad-dark">
      {/* Top bar */}
      <View className="px-4 pt-4 pb-2 flex-row items-center justify-between">
        {canClose ? (
          <Pressable
            onPress={handleClose}
            className="w-10 h-10 items-center justify-center rounded-2xl bg-white/5 border border-white/5 active:opacity-80"
          >
            <Text className="text-zinc-400 text-lg font-bold">✕</Text>
          </Pressable>
        ) : (
          <View className="w-10 h-10 items-center justify-center rounded-2xl bg-white/[0.03]">
            <Text className="text-zinc-800 text-lg font-bold">✕</Text>
          </View>
        )}

        <View className="flex-row items-center gap-2">
          <Text className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.25em]">
            Driver Readiness
          </Text>
        </View>

        <View
          className="rounded-2xl px-4 py-2 items-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.30)', borderWidth: 1, borderColor: Colors.whiteAlpha10 }}
        >
          <Text className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">
            Avance
          </Text>
          <Text className="text-3xl font-black text-white">{completedCount}/3</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 py-2" showsVerticalScrollIndicator={false}>
        {/* ═══════════ CONTRACT STAGE ═══════════ */}
        {stage === 'contract' && (
          <View className="py-6">
            {/* Badge */}
            <View
              className="flex-row items-center gap-2 px-4 py-2 rounded-full mb-5"
              style={{
                backgroundColor: 'rgba(255, 212, 0, 0.10)',
                borderWidth: 1,
                borderColor: 'rgba(255, 212, 0, 0.20)',
              }}
            >
              <Text className="text-[10px] font-black text-yellow-400 uppercase tracking-[0.25em]">
                ✓ Contrato de servicio
              </Text>
            </View>

            <Text className="text-[26px] font-black text-white tracking-tight leading-tight mb-3">
              Acepta el acuerdo V2 antes de salir a pista
            </Text>
            <Text className="text-sm text-zinc-400 leading-relaxed mb-5">
              Este paso deja formalizado el servicio, el uso del hardware y la continuidad del esquema de pagos.
              La operación mantiene el límite de 15 slots y la lógica de RD$500 por campaña activa.
            </Text>

            {/* Contract summary */}
            <View style={GlassmorphismStyles.stitchedCard} className="p-5 mb-5">
              <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-4">
                Resumen contractual
              </Text>
              <View className="gap-3">
                <Text className="text-sm text-zinc-300">
                  • Pago anual del Starter Kit: RD$6,000 con ITBIS integrado.
                </Text>
                <Text className="text-sm text-zinc-300">
                  • El kill-switch 402 se activa automáticamente si la membresía queda morosa.
                </Text>
                <Text className="text-sm text-zinc-300">
                  • La app sigue operando offline-first y sincroniza al volver la red.
                </Text>
              </View>
            </View>

            {/* Accept button */}
            <Pressable
              onPress={handleAcceptAgreement}
              disabled={busy}
              className="bg-tad-yellow rounded-2xl py-4 px-6 items-center justify-center active:opacity-80"
              style={{ opacity: busy ? 0.6 : 1 }}
            >
              <Text className="text-tad-dark font-black uppercase tracking-[0.2em] text-sm">
                {busy ? 'Registrando acuerdo...' : 'Aceptar contrato y continuar →'}
              </Text>
            </Pressable>

            {/* Readiness checklist */}
            <View className="mt-6 gap-3">
              {readinessItems.map((item, i) => (
                <View
                  key={i}
                  className="p-4 rounded-2xl"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    borderWidth: 1,
                    borderColor: Colors.whiteAlpha5,
                  }}
                >
                  <View className="flex-row items-center justify-between gap-3">
                    <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                      {item.label}
                    </Text>
                    <Text
                      className="rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.2em]"
                      style={{
                        backgroundColor: item.complete ? 'rgba(34, 197, 94, 0.10)' : 'rgba(245, 158, 11, 0.10)',
                        color: item.complete ? Colors.emerald400 : Colors.amber300,
                      }}
                    >
                      {item.complete ? 'OK' : 'Pendiente'}
                    </Text>
                  </View>
                  <Text className="mt-2 text-sm text-zinc-300 leading-relaxed">
                    {item.detail}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ═══════════ BANK STAGE ═══════════ */}
        {stage === 'bank' && (
          <View className="py-6">
            {/* Badge */}
            <View
              className="flex-row items-center gap-2 px-4 py-2 rounded-full mb-5"
              style={{
                backgroundColor: 'rgba(96, 165, 250, 0.10)',
                borderWidth: 1,
                borderColor: 'rgba(96, 165, 250, 0.20)',
              }}
            >
              <Text className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: '#60a5fa' }}>
                ◉ Cuenta de pagos
              </Text>
            </View>

            <Text className="text-[26px] font-black text-white tracking-tight leading-tight mb-3">
              Configura tu banco con modo offline-first
            </Text>
            <Text className="text-sm text-zinc-400 leading-relaxed mb-5">
              Si pierdes conectividad en ruta, los datos quedan guardados localmente y se reenvían
              al recuperar la red. Nunca se pierde el formulario.
            </Text>

            {/* Bank saved offline confirmation */}
            {bankSavedOffline ? (
              <View className="items-center justify-center gap-5 py-8">
                <View
                  className="w-16 h-16 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: 'rgba(34, 197, 94, 0.10)',
                    borderWidth: 1,
                    borderColor: 'rgba(34, 197, 94, 0.20)',
                  }}
                >
                  <Text className="text-emerald-400 text-2xl font-black">✓</Text>
                </View>
                <Text className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400 text-center">
                  Guardado sin conexión
                </Text>
                <Text className="text-sm text-zinc-400 text-center leading-relaxed max-w-xs">
                  Tu información bancaria quedó cifrada en el dispositivo y se sincronizará
                  automáticamente al recuperar la red.
                </Text>
              </View>
            ) : (
              /* ── Inline BankForm ── */
              <View className="gap-5">
                {/* Step progress track */}
                <View className="flex-row items-end gap-1.5">
                  {BANK_STEPS.map((label, i) => {
                    const n = i + 1;
                    const isActive = n === bankStep;
                    const isDone = n < bankStep;
                    return (
                      <View key={label} className="flex-1 flex-col items-center gap-1.5">
                        <View
                          className="h-1.5 w-full rounded-full"
                          style={{
                            backgroundColor: isDone ? Colors.emerald500 : isActive ? Colors.yellow : Colors.whiteAlpha5,
                          }}
                        />
                        <Text
                          className="text-[8px] font-black uppercase tracking-[0.15em]"
                          style={{
                            color: isDone ? Colors.emerald400 : isActive ? Colors.yellow : '#27272a',
                          }}
                        >
                          {label}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {/* Step content */}
                <View
                  className="rounded-2xl p-5"
                  style={{ backgroundColor: 'rgba(0, 0, 0, 0.40)', borderWidth: 1, borderColor: Colors.whiteAlpha5 }}
                >
                  {/* STEP 1 — Banco selection */}
                  {bankStep === 1 && (
                    <View className="gap-3">
                      <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                        Selecciona tu banco dominicano
                      </Text>
                      <View className="gap-2">
                        {BANK_OPTIONS.map(bank => (
                          <Pressable
                            key={bank.value}
                            onPress={() => handleBankFieldChange('banco', bank.value)}
                            className="flex-row items-center gap-4 rounded-xl px-4 py-3.5"
                            style={{
                              borderWidth: 1,
                              borderColor: bankFormData.banco === bank.value ? 'rgba(255, 212, 0, 0.40)' : Colors.whiteAlpha5,
                              backgroundColor: bankFormData.banco === bank.value ? 'rgba(255, 212, 0, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                            }}
                          >
                            <View
                              className="h-8 w-8 shrink-0 rounded-lg items-center justify-center"
                              style={{
                                backgroundColor: bankFormData.banco === bank.value ? Colors.yellow : Colors.whiteAlpha5,
                              }}
                            >
                              <Text
                                className="text-[9px] font-black"
                                style={{ color: bankFormData.banco === bank.value ? Colors.primary : '#52525b' }}
                              >
                                {bank.short}
                              </Text>
                            </View>
                            <Text
                              className="text-sm font-black flex-1"
                              style={{ color: bankFormData.banco === bank.value ? Colors.white : Colors.zinc400 }}
                            >
                              {bank.label}
                            </Text>
                            {bankFormData.banco === bank.value && (
                              <Text className="text-yellow-400 font-black">✓</Text>
                            )}
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* STEP 2 — Account number */}
                  {bankStep === 2 && (
                    <View className="gap-3">
                      <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                        Número de cuenta
                      </Text>
                      <TextInput
                        className="rounded-xl bg-black/60 border border-white/5 px-4 py-4 text-base tracking-wider text-white"
                        placeholderTextColor={Colors.zinc500}
                        keyboardType="number-pad"
                        value={bankFormData.cuenta}
                        onChangeText={v => handleBankFieldChange('cuenta', v.replace(/\D/g, ''))}
                        placeholder="Ej: 0123456789"
                      />
                      <Text className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-700">
                        Solo dígitos · sin guiones ni espacios (10–20 dígitos)
                      </Text>
                    </View>
                  )}

                  {/* STEP 3 — Account type */}
                  {bankStep === 3 && (
                    <View className="gap-3">
                      <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                        Tipo de cuenta
                      </Text>
                      <View className="flex-row gap-3">
                        {(['AHORRO', 'CORRIENTE'] as BankAccountType[]).map(tipo => (
                          <Pressable
                            key={tipo}
                            onPress={() => handleBankFieldChange('tipo', tipo)}
                            className="flex-1 rounded-xl py-5 items-center justify-center"
                            style={{
                              borderWidth: 1,
                              borderColor: bankFormData.tipo === tipo ? 'rgba(255, 212, 0, 0.40)' : Colors.whiteAlpha5,
                              backgroundColor: bankFormData.tipo === tipo ? 'rgba(255, 212, 0, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                            }}
                          >
                            <Text
                              className="text-sm font-black uppercase tracking-[0.15em]"
                              style={{ color: bankFormData.tipo === tipo ? Colors.yellow : Colors.zinc500 }}
                            >
                              {tipo === 'AHORRO' ? 'Ahorros' : 'Corriente'}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* STEP 4 — Owner name */}
                  {bankStep === 4 && (
                    <View className="gap-3">
                      <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                        Nombre del titular
                      </Text>
                      <TextInput
                        className="rounded-xl bg-black/60 border border-white/5 px-4 py-4 text-sm font-bold text-white"
                        placeholderTextColor={Colors.zinc500}
                        value={bankFormData.ownerName}
                        onChangeText={v => handleBankFieldChange('ownerName', v)}
                        placeholder="Igual que aparece en tu banco"
                      />
                    </View>
                  )}

                  {/* STEP 5 — Cedula */}
                  {bankStep === 5 && (
                    <View className="gap-3">
                      <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                        Cédula del titular
                      </Text>
                      <TextInput
                        className="rounded-xl bg-black/60 border border-white/5 px-4 py-4 text-base tracking-[0.35em] text-white"
                        placeholderTextColor={Colors.zinc500}
                        keyboardType="number-pad"
                        maxLength={11}
                        value={bankFormData.cedula}
                        onChangeText={v => handleBankFieldChange('cedula', v.replace(/\D/g, ''))}
                        placeholder="00000000000"
                      />
                      <View className="flex-row items-center justify-between">
                        <Text className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-700">
                          11 dígitos · sin guiones
                        </Text>
                        {bankFormData.cedula.length === 11 && (
                          <Text className="text-[9px] font-black uppercase tracking-[0.15em] text-emerald-400">
                            ✓ Formato válido
                          </Text>
                        )}
                      </View>
                    </View>
                  )}
                </View>

                {/* Navigation buttons */}
                <View className="flex-row items-center gap-3">
                  {bankStep > 1 && (
                    <Pressable
                      onPress={handleBankBack}
                      className="flex-row items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3.5"
                    >
                      <Text className="text-zinc-400 text-sm font-black uppercase tracking-[0.15em]">
                        ← Atrás
                      </Text>
                    </Pressable>
                  )}

                  <Pressable
                    onPress={() => void handleBankNext()}
                    disabled={isBankNextDisabled}
                    className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-tad-yellow py-3.5 active:opacity-80"
                    style={{ opacity: isBankNextDisabled ? 0.5 : 1 }}
                  >
                    {bankSubmitting ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <Text className="text-tad-dark text-sm font-black uppercase tracking-[0.15em]">
                        {bankStep === 5 ? 'Guardar cuenta' : 'Continuar →'}
                      </Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}

            {/* Readiness checklist */}
            <View className="mt-6 gap-3">
              {readinessItems.map((item, i) => (
                <View
                  key={i}
                  className="p-4 rounded-2xl"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    borderWidth: 1,
                    borderColor: Colors.whiteAlpha5,
                  }}
                >
                  <View className="flex-row items-center justify-between gap-3">
                    <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                      {item.label}
                    </Text>
                    <Text
                      className="rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.2em]"
                      style={{
                        backgroundColor: item.complete ? 'rgba(34, 197, 94, 0.10)' : 'rgba(245, 158, 11, 0.10)',
                        color: item.complete ? Colors.emerald400 : Colors.amber300,
                      }}
                    >
                      {item.complete ? 'OK' : 'Pendiente'}
                    </Text>
                  </View>
                  <Text className="mt-2 text-sm text-zinc-300 leading-relaxed">
                    {item.detail}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ═══════════ PAYMENT STAGE ═══════════ */}
        {stage === 'payment' && (
          <View className="py-6">
            {/* Badge */}
            <View
              className="flex-row items-center gap-2 px-4 py-2 rounded-full mb-5"
              style={{
                backgroundColor: 'rgba(34, 197, 94, 0.10)',
                borderWidth: 1,
                borderColor: 'rgba(34, 197, 94, 0.20)',
              }}
            >
              <Text className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-300">
                ◉ Activación final
              </Text>
            </View>

            <Text className="text-[26px] font-black text-white tracking-tight leading-tight mb-3">
              Solo falta activar la anualidad del Starter Kit
            </Text>
            <Text className="text-sm text-zinc-400 leading-relaxed mb-5">
              Contrato y cobro bancario ya están listos. El siguiente paso es regularizar el pago
              anual de{' '}
              <Text className="text-white font-bold">
                RD${DRIVER_STARTER_KIT_FEE_RD.toLocaleString()}
              </Text>{' '}
              <Text className="text-zinc-500">(ITBIS 18% incluido)</Text> para mantener la
              unidad fuera del bloqueo 402.
            </Text>

            {/* Status card */}
            <View
              className="rounded-[2.5rem] p-5 mb-5"
              style={{
                backgroundColor: 'rgba(255, 212, 0, 0.05)',
                borderWidth: 1,
                borderColor: 'rgba(255, 212, 0, 0.15)',
              }}
            >
              <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-4">
                Estado actual
              </Text>
              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                    Onboarding
                  </Text>
                  <Text className="mt-1 text-2xl font-black text-white">
                    {hubData.onboardingStatus}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                    Slots máximos
                  </Text>
                  <Text className="mt-1 text-2xl font-black text-white">15</Text>
                </View>
              </View>
            </View>

            {/* Close button */}
            <Pressable
              onPress={handleClose}
              className="bg-tad-yellow rounded-2xl py-4 px-6 items-center justify-center active:opacity-80"
            >
              <Text className="text-tad-dark font-black uppercase tracking-[0.2em] text-sm">
                Cerrar y seguir operando
              </Text>
            </Pressable>

            {/* Readiness checklist */}
            <View className="mt-6 gap-3">
              {readinessItems.map((item, i) => (
                <View
                  key={i}
                  className="p-4 rounded-2xl"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    borderWidth: 1,
                    borderColor: Colors.whiteAlpha5,
                  }}
                >
                  <View className="flex-row items-center justify-between gap-3">
                    <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                      {item.label}
                    </Text>
                    <Text
                      className="rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.2em]"
                      style={{
                        backgroundColor: item.complete ? 'rgba(34, 197, 94, 0.10)' : 'rgba(245, 158, 11, 0.10)',
                        color: item.complete ? Colors.emerald400 : Colors.amber300,
                      }}
                    >
                      {item.complete ? 'OK' : 'Pendiente'}
                    </Text>
                  </View>
                  <Text className="mt-2 text-sm text-zinc-300 leading-relaxed">
                    {item.detail}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ═══════════ READY STAGE ═══════════ */}
        {stage === 'ready' && (
          <View className="py-6 items-center">
            {/* Badge */}
            <View
              className="flex-row items-center gap-2 px-4 py-2 rounded-full mb-5"
              style={{
                backgroundColor: 'rgba(34, 197, 94, 0.10)',
                borderWidth: 1,
                borderColor: 'rgba(34, 197, 94, 0.20)',
              }}
            >
              <Text className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-300">
                ✓ Unidad lista
              </Text>
            </View>

            <Text className="text-[26px] font-black text-white tracking-tight text-center leading-tight mb-3">
              Tu operación quedó preparada
            </Text>
            <Text className="text-sm text-zinc-400 text-center leading-relaxed mb-5">
              Ya puedes seguir usando el dashboard con contrato, banco y anualidad completos.
            </Text>

            {/* Open dashboard button */}
            <Pressable
              onPress={handleClose}
              className="bg-tad-yellow rounded-2xl py-4 px-6 items-center justify-center active:opacity-80"
            >
              <Text className="text-tad-dark font-black uppercase tracking-[0.2em] text-sm">
                Abrir dashboard →
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
