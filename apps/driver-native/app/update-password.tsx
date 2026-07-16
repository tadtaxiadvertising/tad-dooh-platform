/**
 * update-password.tsx — Password Update Page
 *
 * Simple form with:
 *   - Current password field
 *   - New password field
 *   - Confirmation field
 *
 * Posts to /drivers/me/password via the API client.
 * On success, shows confirmation and redirects back.
 */

import { View, Text, TextInput, Pressable, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import client from '../src/lib/api';
import { Colors, GlassmorphismStyles, Typography } from '../src/styles/theme';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleUpdate = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Todos los campos son obligatorios');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'La nueva contraseña y la confirmación no coinciden');
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert('Error', 'La nueva contraseña debe ser diferente a la actual');
      return;
    }

    setLoading(true);
    try {
      await client.post('/drivers/me/password', {
        currentPassword,
        newPassword,
      });
      setSuccess(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Error al actualizar la contraseña';
      Alert.alert('Error', Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Success state ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <View className="flex-1 bg-tad-dark items-center justify-center px-6">
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
          Contraseña actualizada
        </Text>
        <Text className="text-sm text-zinc-400 text-center leading-relaxed mb-8 max-w-[300px]">
          Tu contraseña ha sido cambiada exitosamente. Usa la nueva contraseña en tu próximo inicio de sesión.
        </Text>

        <Pressable
          onPress={() => router.replace('/dashboard')}
          className="bg-tad-yellow rounded-2xl py-5 px-8 items-center justify-center active:opacity-80"
        >
          <Text className="text-tad-dark font-black uppercase tracking-[0.15em] text-sm">
            VOLVER AL DASHBOARD
          </Text>
        </Pressable>
      </View>
    );
  }

  // ── Form state ──────────────────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-tad-dark">
      {/* Header */}
      <View
        className="pt-12 pb-4 px-6 flex-row items-center gap-4"
        style={{
          borderBottomWidth: 1,
          borderBottomColor: Colors.whiteAlpha5,
          backgroundColor: 'rgba(0, 0, 0, 0.40)',
        }}
      >
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center rounded-2xl bg-white/5 border border-white/5 active:opacity-80"
        >
          <Text className="text-zinc-400 text-lg font-bold">‹</Text>
        </Pressable>

        <View>
          <Text className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.25em]">
            Seguridad
          </Text>
          <Text className="text-lg font-black uppercase tracking-tighter text-white">
            Cambiar Contraseña
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-6 pt-6 pb-8"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View className="flex-1 items-center justify-center">
          <View style={GlassmorphismStyles.stitchedCard} className="w-full max-w-md p-8">
            {/* Header */}
            <View style={GlassmorphismStyles.stitchedHeader}>
              <Text className="text-gradient-gold text-xl font-extrabold">
                Actualizar Contraseña
              </Text>
              <Text className="text-zinc-400 text-sm mt-2">
                Ingresa tu contraseña actual y la nueva
              </Text>
            </View>

            <View className="gap-4 mt-4">
              {/* Current password */}
              <View>
                <Text className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-2">
                  Contraseña Actual
                </Text>
                <View className="flex-row items-center">
                  <TextInput
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-base"
                    placeholder={showCurrent ? 'Tu contraseña' : '••••••••'}
                    placeholderTextColor={Colors.zinc500}
                    secureTextEntry={!showCurrent}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                  />
                  <Pressable
                    onPress={() => setShowCurrent(!showCurrent)}
                    className="ml-3 px-3 py-2 rounded-xl bg-white/5"
                  >
                    <Text className="text-zinc-500 text-xs font-bold">
                      {showCurrent ? 'OCULTAR' : 'VER'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* New password */}
              <View>
                <Text className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-2">
                  Nueva Contraseña (mín. 6 caracteres)
                </Text>
                <View className="flex-row items-center">
                  <TextInput
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-base"
                    placeholder={showNew ? 'Tu nueva clave' : '••••••••'}
                    placeholderTextColor={Colors.zinc500}
                    secureTextEntry={!showNew}
                    value={newPassword}
                    onChangeText={setNewPassword}
                  />
                  <Pressable
                    onPress={() => setShowNew(!showNew)}
                    className="ml-3 px-3 py-2 rounded-xl bg-white/5"
                  >
                    <Text className="text-zinc-500 text-xs font-bold">
                      {showNew ? 'OCULTAR' : 'VER'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Confirm password */}
              <View>
                <Text className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-2">
                  Confirmar Nueva Contraseña
                </Text>
                <TextInput
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-base"
                  placeholder="••••••••"
                  placeholderTextColor={Colors.zinc500}
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                  <Text className="text-red-400 text-xs font-bold mt-1">
                    Las contraseñas no coinciden
                  </Text>
                )}
                {confirmPassword.length > 0 && newPassword === confirmPassword && newPassword.length >= 6 && (
                  <Text className="text-emerald-400 text-xs font-bold mt-1">
                    ✓ Contraseñas coinciden
                  </Text>
                )}
              </View>

              {/* Submit */}
              <Pressable
                onPress={handleUpdate}
                disabled={loading}
                className="bg-tad-yellow rounded-xl py-4 mt-4 items-center justify-center active:opacity-80"
                style={{ opacity: loading ? 0.6 : 1 }}
              >
                <Text className="text-tad-dark text-center font-bold text-base uppercase tracking-widest">
                  {loading ? 'Actualizando...' : 'Cambiar Contraseña'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
