
const SUPABASE_URL =
  "https://wfxzttzwvryktxjjqeya.supabase.co";

const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmeHp0dHp3dnJ5a3R4ampxZXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MTQ0MzMsImV4cCI6MjA5NDA5MDQzM30.w5BZiYtMXZrbdnoQxXMr82CTGALVulUVwlFwvB1TwhE";
  

window.supabaseClient =
  supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );