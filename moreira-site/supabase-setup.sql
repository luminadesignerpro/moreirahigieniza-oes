-- ============================================
-- MOREIRA HIGIENIZAÇÕES — SETUP DO BANCO (Supabase)
-- Execute este script completo no SQL Editor do Supabase
-- ============================================

-- ===== TABELA: CLIENTES =====
create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text not null unique,
  bairro text,
  criado_em timestamptz default now()
);

-- ===== TABELA: AGENDAMENTOS (cada serviço prestado) =====
create table if not exists agendamentos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id) on delete set null,
  tipo_servico text not null check (tipo_servico in ('sofa', 'colchao', 'poltrona', 'tapete')),
  data_servico date not null,
  valor_cobrado numeric(10,2) not null default 0,
  custo_produto numeric(10,2) not null default 0,
  forma_pagamento text check (forma_pagamento in ('pix', 'dinheiro', 'cartao')),
  status_pagamento text not null default 'pendente' check (status_pagamento in ('pendente', 'pago')),
  status text not null default 'agendado' check (status in ('agendado', 'andamento', 'concluido', 'cancelado')),
  observacoes text,
  criado_em timestamptz default now()
);

-- ===== TABELA: GALERIA DO SITE =====
create table if not exists galeria (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  caminho_arquivo text,
  descricao text,
  tipo text not null default 'foto', -- 'foto' ou 'video'
  criado_em timestamptz default now()
);

-- ===== TABELA: USUÁRIOS DO ADMIN (login) =====
create table if not exists usuarios_admin (
  id uuid primary key default gen_random_uuid(),
  usuario text not null unique,
  nome text not null,
  senha_hash text not null,
  salt text not null,
  ativo boolean default true,
  criado_em timestamptz default now()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

alter table clientes enable row level security;
alter table agendamentos enable row level security;
alter table galeria enable row level security;
alter table usuarios_admin enable row level security;

-- Remove policies antigas para evitar erro de duplicidade
drop policy if exists "permitir tudo clientes" on clientes;
drop policy if exists "permitir tudo agendamentos" on agendamentos;
drop policy if exists "leitura publica galeria" on galeria;
drop policy if exists "escrita galeria" on galeria;
drop policy if exists "exclusao galeria" on galeria;

-- Recria as policies
create policy "permitir tudo clientes" on clientes
  for all using (true) with check (true);

create policy "permitir tudo agendamentos" on agendamentos
  for all using (true) with check (true);

-- Galeria: leitura pública (site), escrita liberada (admin)
create policy "leitura publica galeria" on galeria
  for select using (true);

create policy "escrita galeria" on galeria
  for insert with check (true);

create policy "exclusao galeria" on galeria
  for delete using (true);

-- usuarios_admin: NENHUM acesso direto via anon key.
-- Só a função serverless /api/login.js acessa, usando a service_role key.

-- ============================================
-- STORAGE: bucket para fotos da galeria
-- Crie manualmente em Storage > New Bucket:
--   nome: galeria-fotos
--   público: sim
-- ============================================

-- ============================================
-- USUÁRIO ADMIN INICIAL
-- Senha: "moreira2026" — TROQUE depois de testar!
-- ============================================

insert into usuarios_admin (usuario, nome, senha_hash, salt, ativo)
values (
  'moreira',
  'Moreira',
  'e07e049b35055257ed4e0e70f195654c4caeca86345b418a087795754520247c',
  'moreira-salt-inicial-2026',
  true
)
on conflict (usuario) do nothing;

-- ✅ Login inicial: usuário "moreira" / senha "moreira2026"
-- TROQUE a senha depois de testar! Para gerar um hash novo:
--   node -e "console.log(require('crypto').createHash('sha256').update('SUASENHA'+'SEUSALT').digest('hex'))"
-- e faça um UPDATE na tabela usuarios_admin com o novo senha_hash/salt.
