
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://ltdcdhqixvbpdcitthqf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_sa_TwjDpFtkNn93Ynrw5PA_pv3BhfSi";

async function loginAdmin() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log('Attempting to sign in as admin@tad.do...');
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@tad.do',
    password: 'TadAdmin2026!'
  });

  if (error) {
    console.error('Login Error:', error.message);
  } else {
    console.log('Login successful! Session for project established.');
  }
}

loginAdmin();
