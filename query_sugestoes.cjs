const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://zwfvrmqffxcqurxpfewi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3ZnZybXFmZnhjcXVyeHBmZXdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NDMwMzksImV4cCI6MjA5MjAxOTAzOX0.6Q02L0XYE7xWtn0AcCwN2KDTvRaYQgGwoTPLblR-VgE";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log("=== Fetching from 'sugestoes' ===");
  const { data, error } = await supabase
    .from('sugestoes')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Error:", error);
    return;
  }
  
  if (data.length > 0) {
    console.log("Columns:", Object.keys(data[0]));
    console.log("Data snippet:", data[0]);
  } else {
    console.log("Table is empty but accessible.");
  }
}

run();
