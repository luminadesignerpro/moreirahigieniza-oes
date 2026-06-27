// ============================================
// ADMIN — CAMADA DE DADOS (Supabase)
// Funções compartilhadas entre todas as páginas
// do painel admin. Tabelas usadas:
//   - clientes
//   - agendamentos   (1 serviço = 1 agendamento)
//   - galeria
//   - usuarios_admin (login)
// ============================================

const STATUS_AGENDAMENTO = {
  AGENDADO: "agendado",
  ANDAMENTO: "andamento",
  CONCLUIDO: "concluido",
  CANCELADO: "cancelado"
};

const STATUS_PAGAMENTO = {
  PENDENTE: "pendente",
  PAGO: "pago"
};

const FORMAS_PAGAMENTO = ["pix", "dinheiro", "cartao"];

// --------------------------------------------
// CLIENTES
// --------------------------------------------
async function listarClientes() {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function buscarOuCriarCliente({ nome, telefone, bairro }) {
  const supabase = await getSupabaseClient();

  const { data: existente, error: errBusca } = await supabase
    .from("clientes")
    .select("*")
    .eq("telefone", telefone)
    .maybeSingle();
  if (errBusca) throw errBusca;
  if (existente) return existente;

  const { data: novo, error: errCriar } = await supabase
    .from("clientes")
    .insert([{ nome, telefone, bairro }])
    .select()
    .single();
  if (errCriar) throw errCriar;
  return novo;
}

// --------------------------------------------
// AGENDAMENTOS / SERVIÇOS (com dados financeiros embutidos)
// --------------------------------------------
async function listarAgendamentos({ status = null, limite = 100 } = {}) {
  const supabase = await getSupabaseClient();
  let query = supabase
    .from("agendamentos")
    .select("*, clientes(nome, telefone, bairro)")
    .order("data_servico", { ascending: false })
    .limit(limite);

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function criarAgendamento(payload) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from("agendamentos")
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function atualizarAgendamento(id, campos) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from("agendamentos")
    .update(campos)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function excluirAgendamento(id) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.from("agendamentos").delete().eq("id", id);
  if (error) throw error;
}

// --------------------------------------------
// FINANCEIRO — agregações sobre a tabela agendamentos
// Cada agendamento já guarda: valor_cobrado, custo_produto,
// forma_pagamento, status_pagamento, data_servico
// --------------------------------------------
async function calcularResumoFinanceiro({ mes, ano } = {}) {
  const agora = new Date();
  const mesRef = mes ?? agora.getMonth();
  const anoRef = ano ?? agora.getFullYear();

  const inicio = new Date(anoRef, mesRef, 1).toISOString();
  const fim = new Date(anoRef, mesRef + 1, 1).toISOString();

  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from("agendamentos")
    .select("valor_cobrado, custo_produto, forma_pagamento, status_pagamento, status, data_servico")
    .gte("data_servico", inicio)
    .lt("data_servico", fim);

  if (error) throw error;
  const servicos = data || [];

  const resumo = {
    receitaTotal: 0,
    custoTotal: 0,
    lucroLiquido: 0,
    totalServicos: servicos.length,
    pendentes: 0,
    valorPendente: 0,
    porFormaPagamento: { pix: 0, dinheiro: 0, cartao: 0 },
    concluidos: 0
  };

  servicos.forEach((s) => {
    const valor = Number(s.valor_cobrado) || 0;
    const custo = Number(s.custo_produto) || 0;

    if (s.status === STATUS_AGENDAMENTO.CONCLUIDO) {
      resumo.concluidos += 1;
    }

    if (s.status_pagamento === STATUS_PAGAMENTO.PAGO) {
      resumo.receitaTotal += valor;
      resumo.custoTotal += custo;
      if (s.forma_pagamento && resumo.porFormaPagamento[s.forma_pagamento] !== undefined) {
        resumo.porFormaPagamento[s.forma_pagamento] += valor;
      }
    } else {
      resumo.pendentes += 1;
      resumo.valorPendente += valor;
    }
  });

  resumo.lucroLiquido = resumo.receitaTotal - resumo.custoTotal;
  return resumo;
}

async function listarServicoMaisPedido() {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from("agendamentos")
    .select("tipo_servico");
  if (error) throw error;

  const contagem = {};
  (data || []).forEach((s) => {
    contagem[s.tipo_servico] = (contagem[s.tipo_servico] || 0) + 1;
  });
  return contagem;
}

// --------------------------------------------
// GALERIA
// --------------------------------------------
async function listarFotosGaleria() {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from("galeria")
    .select("*")
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function enviarFotoGaleria(arquivo, descricao) {
  const supabase = await getSupabaseClient();
  const nomeArquivo = `${Date.now()}-${arquivo.name}`;

  const { error: erroUpload } = await supabase.storage
    .from("galeria-fotos")
    .upload(nomeArquivo, arquivo);
  if (erroUpload) throw erroUpload;

  const { data: urlData } = supabase.storage
    .from("galeria-fotos")
    .getPublicUrl(nomeArquivo);

  const { data, error } = await supabase
    .from("galeria")
    .insert([{ url: urlData.publicUrl, descricao, caminho_arquivo: nomeArquivo }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function excluirFotoGaleria(id, caminhoArquivo) {
  const supabase = await getSupabaseClient();

  if (caminhoArquivo) {
    await supabase.storage.from("galeria-fotos").remove([caminhoArquivo]);
  }

  const { error } = await supabase.from("galeria").delete().eq("id", id);
  if (error) throw error;
}

// --------------------------------------------
// FORMATAÇÃO
// --------------------------------------------
function formatarMoeda(valor) {
  return (Number(valor) || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function formatarData(dataISO) {
  if (!dataISO) return "—";
  const d = new Date(dataISO);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function mostrarToast(mensagem, tipo = "default") {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className = `toast ${tipo}`;
  toast.textContent = mensagem;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}
