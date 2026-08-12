import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import { DEMO_MODE, SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

// On native there is no browser URL to parse, and the session must persist across cold starts —
// hence AsyncStorage + detectSessionInUrl: false.
export const supabase = createClient(
  DEMO_MODE ? 'https://demo.invalid' : SUPABASE_URL,
  DEMO_MODE ? 'demo-anon-key' : SUPABASE_ANON_KEY,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
