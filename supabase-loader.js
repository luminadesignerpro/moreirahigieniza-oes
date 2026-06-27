// ============================================
// SUPABASE LOADER
// Carrega o SDK do Supabase via CDN (versão fixa)
// e expõe getSupabaseClient() como Promise única.
// Mesmo padrão usado no Newbox para evitar conflito
// de "supabase already declared".
// ============================================

const SUPABASE_URL = "https://avtadkyyhrejnrxafvef.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2dGFka3l5aHJlam5yeGFmdmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1ODUzNTksImV4cCI6MjA5ODE2MTM1OX0.tmOfLkfr0rOEh9fOlNA02KZhRgvFL-nKywVd9qOvP4I";

let _supabaseClientPromise = null;

function getSupabaseClient() {
  if (_supabaseClientPromise) return _supabaseClientPromise;

  _supabaseClientPromise = new Promise((resolve, reject) => {
    if (window.supabase && window.supabase.createClient) {
      resolve(window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js";
    script.onload = () => {
      try {
        const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        resolve(client);
      } catch (err) {
        reject(err);
      }
    };
    script.onerror = () => reject(new Error("Falha ao carregar o SDK do Supabase."));
    document.head.appendChild(script);
  });

  return _supabaseClientPromise;
}
