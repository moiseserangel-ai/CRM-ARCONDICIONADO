# Cardoso Ar CRM

CRM web para empresas de instalação e manutenção de ar-condicionado. O sistema
inclui contatos, pipeline, ordens de serviço, produtos e estoque, financeiro,
notas fiscais, relatórios e notificações.

## Arquitetura

- React 19, TypeScript e Vite
- Tailwind CSS
- Supabase (PostgreSQL, Auth, Realtime e RLS)
- PWA com `vite-plugin-pwa`
- Vercel para hospedagem do frontend

## Requisitos

- Node.js 20 ou superior
- npm
- Um projeto Supabase

## Configuração local

1. Instale as dependências:

   ```bash
   npm ci
   ```

2. Crie o arquivo `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

3. Preencha as variáveis públicas do Supabase:

   ```env
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-anon
   ```

4. Aplique, em ordem, os arquivos da pasta `supabase/migrations` em um projeto
   Supabase vazio.

5. Inicie o frontend:

   ```bash
   npm run dev
   ```

## Validação

```bash
npm run lint
npm run build
npm audit --omit=dev
```

## Segurança

- A chave anônima do Supabase pode ser usada no frontend porque todas as tabelas
  possuem Row Level Security.
- Nunca adicione `service_role`, chaves Gemini, tokens SMTP ou tokens de
  integração a variáveis `VITE_*`.
- Senhas são gerenciadas exclusivamente pelo Supabase Auth e não são armazenadas
  nas tabelas da aplicação.
- Segredos de integrações deverão ser processados por uma função de backend antes
  de essas integrações serem ativadas.

## Deploy na Vercel

Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` separadamente para os
ambientes Development, Preview e Production. Pull requests e branches podem ser
validados por Preview Deployments antes do merge na branch principal.
