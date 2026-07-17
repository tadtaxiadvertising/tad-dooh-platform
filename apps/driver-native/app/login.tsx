import { View, Text, TextInput, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import client from '../src/lib/api';
import { useAuthStore } from '../src/store/useAuthStore';
import { Colors, GlassmorphismStyles, Typography } from '../src/styles/theme';

export default function DriverLogin() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert('Error', 'Ingresa teléfono y contraseña');
      return;
    }

    setLoading(true);
    try {
      const res = await client.post('/drivers/login', { phone, password });
      const { token, driver } = res.data;
      login(token, driver.id, driver.name);
      router.replace('/dashboard');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Error al conectar con el servidor';
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-tad-dark items-center justify-center px-6">
      <View style={GlassmorphismStyles.stitchedCard} className="w-full max-w-md p-8">
        <View style={GlassmorphismStyles.stitchedHeader}>
          <Text className="text-gradient-gold text-2xl font-extrabold">
            TAD Driver
          </Text>
          <Text className="text-zinc-400 text-sm mt-2">
            Taxi Advertising Distribution
          </Text>
        </View>

        <View className="gap-4 mt-4">
          <View>
            <Text className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-2">
              Teléfono
            </Text>
            <TextInput
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-base"
              placeholder="809-555-1234"
              placeholderTextColor={Colors.zinc500}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              autoCapitalize="none"
            />
          </View>

          <View>
            <Text className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-2">
              Contraseña
            </Text>
            <TextInput
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-base"
              placeholder="••••••••"
              placeholderTextColor={Colors.zinc500}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <Pressable
            onPress={handleLogin}
            disabled={loading}
            className="bg-tad-yellow rounded-xl py-4 mt-4 active:opacity-80"
          >
            <Text className="text-tad-dark text-center font-bold text-base">
              {loading ? 'Conectando...' : 'Iniciar Sesión'}
            </Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => router.push('/register')}
          className="mt-6"
        >
          <Text className="text-zinc-400 text-center text-sm">
            ¿Nuevo conductor? <Text className="text-tad-yellow font-bold">Regístrate</Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
