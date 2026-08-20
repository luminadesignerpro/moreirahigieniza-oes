// ============================================
// API: /api/whatsapp-webhook.js
// Recebe as mensagens do WhatsApp via Evolution API
// e responde automaticamente com base no fluxo
// configurado no painel (tabela bot_config).
//
// Configure esta URL como webhook da sua instância na
// Evolution API, escutando o evento "messages.upsert":
//   https://SEU-SITE.vercel.app/api/whatsapp-webhook
//
// Variáveis de ambiente necessárias na Vercel:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
// ============================================
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Extrai o texto de uma mensagem do WhatsApp (formatos comuns da Evolution API)
function extrairTexto(mensagem) {
  if (!mensagem) return "";
  return (
    mensagem.conversation ||
    (mensagem.extendedTextMessage && mensagem.extendedTextMessage.text) ||
    (mensagem.buttonsResponseMessage && mensagem.buttonsResponseMessage.selectedDisplayText) ||
    (mensagem.listResponseMessage && mensagem.listResponseMessage.title) ||
    ""
  );
}

// Decide a resposta com base no texto recebido, usando o fluxo salvo no bot_config
function decidirResposta(textoRecebido, fluxo) {
  const texto = (textoRecebido || "").trim().toLowerCase();

  if (texto === "1") return fluxo.fluxo_orcamento;
  if (texto === "2") return fluxo.fluxo_agendamento;
  if (texto === "3") return fluxo.fluxo_servicos;
  if (texto === "4") return fluxo.fluxo_atendente;
  if (["oi", "olá", "ola", "menu", "começar", "comecar"].includes(texto)) {
    return fluxo.fluxo_boas_vindas;
  }
  return "Não entendi 🤔\n\nDigite *menu* para ver as opções novamente.";
}

async function enviarMensagemWhatsApp({ url, key, instancia, numero, texto }) {
  const resp = await fetch(`${url}/message/sendText/${instancia}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key
    },
    body: JSON.stringify({
      number: numero,
      text: texto
    })
  });

  if (!resp.ok) {
    const corpo = await resp.text();
    throw new Error(`Evolution API respondeu ${resp.status}: ${corpo}`);
  }
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(200).json({ ok: true });
    return;
  }

  try {
    const payload = req.body;
    const evento = payload && (payload.event || payload.Event);

    // Só nos interessa o evento de mensagem recebida
    if (evento && !String(evento).toLowerCase().includes("messages.upsert")) {
      res.status(200).json({ ok: true, ignorado: true });
      return;
    }

    const dado = (payload && payload.data) || payload;
    const key = (dado && dado.key) || {};
    const remoteJid = key.remoteJid || (dado && dado.remoteJid);
    const fromMe = key.fromMe;

    // Ignora mensagens enviadas pelo próprio número (ex: o Moreira
    // respondendo manualmente) e mensagens de grupo — o bot só
    // atende conversas individuais.
    if (fromMe || !remoteJid || remoteJid.endsWith("@g.us")) {
      res.status(200).json({ ok: true, ignorado: true });
      return;
    }

    const textoRecebido = extrairTexto(dado && dado.message);
    if (!textoRecebido) {
      res.status(200).json({ ok: true, ignorado: true });
      return;
    }

    const { data: config, error } = await supabase
      .from("bot_config")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) throw error;

    if (!config || !config.evolution_url || !config.evolution_key || !config.evolution_instancia) {
      console.warn("Webhook recebido, mas bot_config ainda não está configurado.");
      res.status(200).json({ ok: true, aviso: "bot_config não configurado" });
      return;
    }

    const resposta = decidirResposta(textoRecebido, config);
    const numero = remoteJid.split("@")[0];

    await enviarMensagemWhatsApp({
      url: config.evolution_url,
      key: config.evolution_key,
      instancia: config.evolution_instancia,
      numero,
      texto: resposta
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Erro no webhook do WhatsApp:", err);
    // Sempre respondemos 200 pra Evolution API não ficar reenviando o mesmo evento.
    res.status(200).json({ ok: false, erro: err.message });
  }
};
