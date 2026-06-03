
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://ltdcdhqixvbpdcitthqf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_sa_TwjDpFtkNn93Ynrw5PA_pv3BhfSi";

async function signupAdmin() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log('Attempting to sign up admin@tad.do...');
  
  const { data, error } = await supabase.auth.signUp({
    email: 'admin@tad.do',
    password: 'TadAdmin2026!',
    options: {
      data: {
        full_name: 'Super Admin',
      }
    }
  });

  if (error) {
    console.error('Signup Error:', error.message);
    if (error.message.includes('already registered')) {
      console.log('User already exists. If password fails, it must be reset in Supabase Dashboard.');
    }
  } else {
    console.log('Signup initiated! Check email for confirmation if required, or user is created if auto-confirm is on.');
    console.log('User ID:', data.user?.id);
  }
}

signupAdmin();
