const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://zwfvrmqffxcqurxpfewi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3ZnZybXFmZnhjcXVyeHBmZXdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NDMwMzksImV4cCI6MjA5MjAxOTAzOX0.6Q02L0XYE7xWtn0AcCwN2KDTvRaYQgGwoTPLblR-VgE";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log("=== Fetching from 'usuarios' ===");
  const { data: users, error } = await supabase
    .from('usuarios')
    .select('id, permissions');

  if (error) {
    console.error("Error fetching usuarios:", error);
    return;
  }

  console.log(`Found ${users.length} users in 'usuarios'.`);
  
  for (const user of users) {
    let perms = user.permissions || [];
    
    if (!Array.isArray(perms)) {
      if (typeof perms === 'string') {
        try { perms = JSON.parse(perms); } catch(e) { perms = []; }
      } else {
        perms = [];
      }
    }
    
    let updated = false;
    // We already added Dashboard and Calendário, now adding Sugestões
    if (!perms.includes('Sugestões')) {
      perms.push('Sugestões');
      updated = true;
    }
    
    if (updated) {
      console.log(`Updating user ${user.id} to add Sugestões...`);
      const { error: updErr } = await supabase
        .from('usuarios')
        .update({ permissions: perms })
        .eq('id', user.id);
        
      if (updErr) {
        console.error(`Failed to update user ${user.id}:`, updErr);
      } else {
        console.log(`Successfully updated user ${user.id}.`);
      }
    } else {
      console.log(`User ${user.id} already has Sugestões.`);
    }
  }
}

run();
