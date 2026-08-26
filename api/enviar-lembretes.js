// ============================================
// API: /api/enviar-lembretes.js
// Roda uma vez por dia (Vercel Cron — ver vercel.json) e:
//   1) Envia lembrete de WhatsApp pros agendamentos de amanhã,
//      pedindo pra responder CONFIRMAR ou REMARCAR.
//   2) Envia mensagem de recorrência pros clientes cujo serviço
//      concluído já passou do prazo configurado (recorrencia_meses)
//      e ainda não têm um novo agendamento marcado.
//
// Não faz nada até a Evolution API estar realmente conectada
// (bot_config preenchido) — silenciosamente ignora nesse caso.
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

const NOMES_SERVICO = { sofa: "sofá", colchao: "colchão", poltrona: "poltrona", tapete: "tapete" };

async function enviarMensagemWhatsApp({ url, key, instancia, numero, texto }) {
  const resp = await fetch(`${url}/message/sendText/${instancia}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: key },
    body: JSON.stringify({ number: numero, text: texto })
  });
  if (!resp.ok) {
    const corpo = await resp.text();
    throw new Error(`Evolution API respondeu ${resp.status}: ${corpo}`);
  }
}

function formatarDataBR(dataISO) {
  const [ano, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}/${ano}`;
}

module.exports = async (req, res) => {
  try {
    const { data: config } = await supabase.from("bot_config").select("*").eq("id", 1).maybeSingle();

    if (!config || !config.evolution_url || !config.evolution_key || !config.evolution_instancia) {
      res.status(200).json({ ok: true, aviso: "Evolution API ainda não configurada — nada foi enviado." });
      return;
    }

    const resultado = { lembretes: 0, recorrencias: 0, erros: [] };

    // ---------- 1) LEMBRETES DE AMANHÃ ----------
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    const dataAmanha = amanha.toISOString().slice(0, 10);

    const { data: agendamentosAmanha } = await supabase
      .from("agendamentos")
      .select("id, data_servico, horario, tipo_servico, clientes(nome, telefone)")
      .eq("data_servico", dataAmanha)
      .in("status", ["agendado", "andamento"])
      .is("lembrete_enviado_em", null);

    for (const ag of agendamentosAmanha || []) {
      if (!ag.clientes?.telefone) continue;
      try {
        const numero = "55" + ag.clientes.telefone.replace(/\D/g, "").replace(/^55/, "");
        const servico = NOMES_SERVICO[ag.tipo_servico] || ag.tipo_servico;
        const horarioTexto = ag.horario ? ` às ${ag.horario.slice(0, 5)}` : "";
        const texto = `Olá, ${ag.clientes.nome}! Passando pra lembrar que amanhã (${formatarDataBR(ag.data_servico)}${horarioTexto}) temos seu horário de higienização do ${servico} marcado. 🧼\n\nPode confirmar? Responda *CONFIRMAR* ou *REMARCAR*.`;

        await enviarMensagemWhatsApp({
          url: config.evolution_url, key: config.evolution_key, instancia: config.evolution_instancia,
          numero, texto
        });

        await supabase.from("agendamentos").update({ lembrete_enviado_em: new Date().toISOString() }).eq("id", ag.id);
        resultado.lembretes += 1;
      } catch (err) {
        resultado.erros.push(`lembrete ${ag.id}: ${err.message}`);
      }
    }

    // ---------- 2) RECORRÊNCIA ----------
    const { data: concluidosComRecorrencia } = await supabase
      .from("agendamentos")
      .select("id, data_servico, recorrencia_meses, tipo_servico, cliente_id, clientes(nome, telefone)")
      .eq("status", "concluido")
      .not("recorrencia_meses", "is", null);

    const hoje = new Date();
    for (const ag of concluidosComRecorrencia || []) {
      if (!ag.clientes?.telefone) continue;

      const dataBase = new Date(ag.data_servico + "T12:00:00");
      const proximaData = new Date(dataBase);
      proximaData.setMonth(proximaData.getMonth() + ag.recorrencia_meses);

      // Só dispara quando a data alvo é hoje ou já passou até 3 dias (evita repetir todo dia)
      const diffDias = Math.floor((hoje - proximaData) / (1000 * 60 * 60 * 24));
      if (diffDias < 0 || diffDias > 3) continue;

      // Já existe um agendamento futuro (novo) pra esse cliente depois do concluído? Então pula.
      const { data: futuro } = await supabase
        .from("agendamentos")
        .select("id")
        .eq("cliente_id", ag.cliente_id)
        .gt("data_servico", ag.data_servico)
        .limit(1)
        .maybeSingle();
      if (futuro) continue;

      try {
        const numero = "55" + ag.clientes.telefone.replace(/\D/g, "").replace(/^55/, "");
        const servico = NOMES_SERVICO[ag.tipo_servico] || ag.tipo_servico;
        const texto = `Olá, ${ag.clientes.nome}! Já faz um tempinho desde a última higienização do seu ${servico}. Que tal agendar uma nova? 🧼 É só responder aqui que a gente marca um horário.`;

        await enviarMensagemWhatsApp({
          url: config.evolution_url, key: config.evolution_key, instancia: config.evolution_instancia,
          numero, texto
        });
        resultado.recorrencias += 1;
      } catch (err) {
        resultado.erros.push(`recorrencia ${ag.id}: ${err.message}`);
      }
    }

    res.status(200).json({ ok: true, ...resultado });
  } catch (err) {
    console.error("Erro em enviar-lembretes:", err);
    res.status(500).json({ ok: false, erro: err.message });
  }
};
