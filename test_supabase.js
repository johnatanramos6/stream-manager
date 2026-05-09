import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

const envConfig = dotenv.parse(readFileSync('.env'));
const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Testing Supabase connection...");
  // Use user's email to get auth
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'johnatanramos6@gmail.com',
    password: 'password_here' // I don't have the password.
  });
  console.log(signInError);
}
test();
