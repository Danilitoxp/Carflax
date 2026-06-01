const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://zwfvrmqffxcqurxpfewi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3ZnZybXFmZnhjcXVyeHBmZXdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NDMwMzksImV4cCI6MjA5MjAxOTAzOX0.6Q02L0XYE7xWtn0AcCwN2KDTvRaYQgGwoTPLblR-VgE";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log("=== Querying a row from premio_mes ===");
  const { data, error } = await supabase
    .from('premio_mes')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Error fetching premio_mes:", error);
  } else {
    console.log("Columns in premio_mes:", data.length > 0 ? Object.keys(data[0]) : "No data to check keys");
    console.log("Data snippet:", data);
  }
}

run();
