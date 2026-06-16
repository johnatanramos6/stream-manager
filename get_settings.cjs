const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://etapavapidukcrvduixf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0YXBhdmFwaWR1a2NydmR1aXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5MjUzMzAsImV4cCI6MjA5MjUwMTMzMH0.Hy4MWILJzM3kMi2aZDbVsex1sGbvMQ0PvnM1JrVMTZw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('store_settings')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error('Error fetching settings:', error);
  } else {
    console.log('Row:', data[0]);
  }
}

run();
