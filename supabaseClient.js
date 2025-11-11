import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// Конфиг через переменные окружения Expo (EXPO_PUBLIC_*)
// См. .env.example и README
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://cxnkphccklqajgdkymtc.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4bmtwaGNja2xxYWpnZGt5bXRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NDk0ODIsImV4cCI6MjA3MjQyNTQ4Mn0.EMIPk4vUn00gkoCCDQrzBnyGe1UutAwUFIFxodd6o2Q';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

