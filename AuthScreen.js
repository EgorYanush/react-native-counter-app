import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from './supabaseClient';
import { useLang } from './i18n';

export default function AuthScreen({ onAuthed }) {
  const { t } = useLang();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [fullName, setFullName] = useState(''); // только для signup
  const [phone, setPhone] = useState('');       // только для signup
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');

  async function upsertMyProfile(defaultRole = 'worker') {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = {
      id: user.id,
      full_name: fullName?.trim() || email.split('@')[0],
      phone: phone?.trim() || null,
      role: defaultRole, // по умолчанию worker; для бригадира затем поменяешь role='foreman'
    };
    const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
    if (error) throw error;
  }

  async function submit() {
    setErr(''); setInfo('');
    try {
      if (mode === 'signup') {
        if (!fullName.trim()) throw new Error(t('auth.needName'));
        if (!phone.trim()) throw new Error(t('auth.needPhone'));
        // Регистрируем
        const { data, error } = await supabase.auth.signUp({ email, password: pass });
        if (error) throw error;

        if (data.session) {
          // Подтверждение e-mail выключено → сессия уже есть
          await upsertMyProfile('worker');
          onAuthed && onAuthed();
          return;
        }
        // Подтверждение включено → ждём письма
        setInfo(t('auth.confirmMail'));
        return;
      }

      // Вход
      const { error: e2 } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (e2) throw e2;

      // На всякий случай дозапишем профиль, если пустой (без смены имени/телефона)
      await supabase.from('profiles').upsert({ id: (await supabase.auth.getUser()).data.user.id }, { onConflict: 'id' });
      onAuthed && onAuthed();
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <View style={s.wrap}>
      <Text style={s.ttl}>{mode === 'signin' ? t('auth.signin') : t('auth.signup')}</Text>

      {mode === 'signup' && (
        <>
          <TextInput
            placeholder={t('auth.fullName')}
            placeholderTextColor="#94a3b8"
            value={fullName}
            onChangeText={setFullName}
            style={s.inp}
          />
          <TextInput
            placeholder={t('auth.phone')}
            placeholderTextColor="#94a3b8"
            value={phone}
            onChangeText={setPhone}
            style={s.inp}
            keyboardType="phone-pad"
          />
        </>
      )}

      <TextInput
        placeholder={t('auth.email')}
        placeholderTextColor="#94a3b8"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={s.inp}
      />
      <TextInput
        placeholder={t('auth.password')}
        placeholderTextColor="#94a3b8"
        secureTextEntry
        value={pass}
        onChangeText={setPass}
        style={s.inp}
      />

      {err ? <Text style={s.err}>{t('common.error')}: {err}</Text> : null}
      {info ? <Text style={s.info}>{info}</Text> : null}

      <Pressable onPress={submit} style={s.btn}>
        <Text style={s.btnT}>{mode === 'signin' ? t('auth.submitIn') : t('auth.submitUp')}</Text>
      </Pressable>

      <Pressable onPress={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setErr(''); setInfo(''); }}>
        <Text style={s.link}>
          {mode === 'signin' ? t('auth.switchToUp') : t('auth.switchToIn')}
        </Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: '#0b1220' },
  ttl: { color: '#e5e7eb', fontSize: 20, marginBottom: 12, fontWeight: '600' },
  inp: { width: '100%', backgroundColor: '#111827', borderWidth: 1, borderColor: '#1f2937', color: '#e5e7eb', padding: 12, borderRadius: 10, marginBottom: 8 },
  btn: { backgroundColor: '#e5e7eb', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, width: '100%', alignItems: 'center', marginTop: 8 },
  btnT: { color: '#0b1220', fontWeight: '700' },
  link: { color: '#93c5fd', marginTop: 10 },
  err: { color: '#fca5a5', marginTop: 6, textAlign: 'center' },
  info: { color: '#a7f3d0', marginTop: 6, textAlign: 'center' },
});
