
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ltdcdhqixvbpdcitthqf.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "sb_secret_Zs87C42ElWKEYWcbcrFV8Q_EUxpUbxQ";

async function createAdmin() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('Creating/Updating admin@tad.do...');
  
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'admin@tad.do',
    password: 'TadAdmin2026!',
    email_confirm: true,
    user_metadata: { full_name: 'Super Admin' }
  });

  if (error) {
    if (error.message.includes('already exists')) {
      console.log('User already exists, attempting to reset password...');
      const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
        (await supabase.auth.admin.listUsers()).data.users.find(u => u.email === 'admin@tad.do')?.id || '',
        { password: 'TadAdmin2026!' }
      );
      if (updateError) console.error('Error resetting password:', updateError.message);
      else console.log('Password reset successfully!');
    } else {
      console.error('Error creating user:', error.message);
    }
  } else {
    console.log('User created successfully!');
  }
}

createAdmin();
