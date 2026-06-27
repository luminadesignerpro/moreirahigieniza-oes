# Moreira Higienizações — Site + Painel Admin + Bot WhatsApp

Projeto completo para a Moreira Higienizações (higienização de estofados, Fortaleza).
Mesma stack do Newbox: HTML/JS puro + Supabase (banco e storage) + Vercel (hospedagem e funções).

## Estrutura do projeto

```
moreira-higienizacoes/
├── index.html              → Site público de divulgação
├── config.js                → Número de WhatsApp, preços do simulador
├── script.js                → Lógica do site público
├── supabase-loader.js       → Carrega o SDK do Supabase (mesmo padrão do Newbox)
├── vercel.json               → Configuração de rotas da Vercel
├── package.json
├── supabase-setup.sql        → Script para criar todas as tabelas no Supabase
├── assets/
│   ├── selo-marca.png
│   └── banner-marca.png
├── api/
│   └── login.js              → Função serverless de login do admin
└── admin/
    ├── login.html
    ├── dashboard.html
    ├── agendamentos.html
    ├── clientes.html
    ├── financeiro.html
    ├── galeria.html
    ├── bot.html
    ├── admin-styles.css
    ├── admin-data.js         → Funções de acesso ao Supabase (compartilhadas)
    └── admin-sidebar.js      → Menu lateral (compartilhado)
```

## Passo a passo para colocar no ar

### 1. Criar o projeto no Supabase
1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto.
2. No **SQL Editor**, cole e execute todo o conteúdo de `supabase-setup.sql`.
3. Em **Storage**, crie um bucket chamado `galeria-fotos` e marque como **público**.
4. Em **Project Settings → API**, copie:
   - `Project URL`
   - `anon public key`
   - `service_role key` (⚠️ nunca exponha essa no front-end)

### 2. Configurar as chaves no projeto
Abra `supabase-loader.js` e substitua:
```js
const SUPABASE_URL = "COLOQUE_AQUI_SUA_URL_SUPABASE";
const SUPABASE_ANON_KEY = "COLOQUE_AQUI_SUA_ANON_KEY";
```
pelos valores reais (URL e **anon key**, nunca a service_role aqui).

### 3. Subir para o GitHub
```bash
cd moreira-higienizacoes
git add .
git commit -m "Primeira versão do projeto Moreira Higienizações"
git branch -M main
git remote add origin https://github.com/luminadesignerpro/moreira-higienizacoes.git
git push -u origin main
```

### 4. Conectar na Vercel
1. Importe o repositório na Vercel.
2. Em **Settings → Environment Variables**, adicione:
   - `SUPABASE_URL` → a Project URL
   - `SUPABASE_SERVICE_ROLE_KEY` → a service_role key (só usada pela função `/api/login.js`)
3. Faça o deploy.

### 5. Testar o login do admin
- Acesse `/admin/login.html`
- Usuário: `moreira`
- Senha: `moreira2026`
- **Troque essa senha depois do primeiro acesso** (gere um novo hash com o comando no final do `supabase-setup.sql` e atualize a tabela `usuarios_admin`).

### 6. Conectar o bot do WhatsApp (Evolution API)
A página `/admin/bot.html` já tem:
- **Conexão**: campos para URL da API, token e nome da instância (você precisa de uma instância da Evolution API rodando, igual fez no Ballet Dara Rocha).
- **Fluxo do Bot**: você edita as mensagens automáticas direto no painel.
- **Testar no Chat**: simulador para validar o fluxo antes de conectar de verdade.

A integração real com a Evolution API (enviar/receber mensagens de verdade) ainda precisa de uma função serverless dedicada (`api/whatsapp-webhook.js`) — undo próximo passo natural depois que a instância estiver no ar. Por enquanto o fluxo e o simulador já funcionam 100% para validar as mensagens com o Moreira.

### 7. Trocar fotos da galeria
Em `/admin/galeria.html`, basta arrastar a foto — sem precisar editar código. Ela aparece automaticamente na seção "Antes e depois" do site público.

### 8. Depoimentos reais
A seção de depoimentos do site público (`index.html`) está com textos de exemplo. Substitua pelos depoimentos reais do Instagram [@moreira_higienizacoes1_](https://www.instagram.com/moreira_higienizacoes1_/) editando diretamente o HTML, ou me peça para criar uma tabela `depoimentos` no Supabase (mesmo padrão da galeria) se quiser que o Moreira também gerencie isso pelo painel.

## Próximos passos sugeridos
- [ ] Conectar a Evolution API de verdade (função serverless de webhook)
- [ ] Migrar o "Fluxo do Bot" do localStorage para uma tabela no Supabase (multi-dispositivo)
- [ ] Adicionar tabela de combos/promoções editável no admin
- [ ] Configurar domínio próprio na Vercel
