// ============================================
// API: /api/login.js
// Login do painel admin com SHA-256 + salt
// Mesmo padrão usado no projeto Newbox.
// Variáveis de ambiente necessárias na Vercel:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY  (não a anon key!)
// ============================================

const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function gerarHash(senha, salt) {
  return crypto.createHash("sha256").update(senha + salt).digest("hex");
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ sucesso: false, mensagem: "Método não permitido." });
    return;
  }

  try {
    const { usuario, senha } = req.body;

    if (!usuario || !senha) {
      res.status(400).json({ sucesso: false, mensagem: "Informe usuário e senha." });
      return;
    }

    const { data: registro, error } = await supabase
      .from("usuarios_admin")
      .select("id, usuario, nome, senha_hash, salt, ativo")
      .eq("usuario", usuario.trim())
      .maybeSingle();

    if (error) throw error;

    if (!registro || !registro.ativo) {
      res.status(401).json({ sucesso: false, mensagem: "Usuário ou senha incorretos." });
      return;
    }

    const hashCalculado = gerarHash(senha, registro.salt);

    if (hashCalculado !== registro.senha_hash) {
      res.status(401).json({ sucesso: false, mensagem: "Usuário ou senha incorretos." });
      return;
    }

    res.status(200).json({
      sucesso: true,
      usuario: { id: registro.id, usuario: registro.usuario, nome: registro.nome }
    });
  } catch (err) {
    console.error("Erro no login:", err);
    res.status(500).json({ sucesso: false, mensagem: "Erro interno ao tentar entrar." });
  }
};
