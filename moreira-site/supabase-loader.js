// ============================================
// SUPABASE LOADER
// Carrega o SDK do Supabase via CDN (versão fixa)
// e expõe getSupabaseClient() como Promise única.
// Mesmo padrão usado no Newbox para evitar conflito
// de "supabase already declared".
// ============================================

const SUPABASE_URL = "COLOQUE_AQUI_SUA_URL_SUPABASE";
const SUPABASE_ANON_KEY = "COLOQUE_AQUI_SUA_ANON_KEY";

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
