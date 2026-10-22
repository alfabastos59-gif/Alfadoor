# AlfaDoor v2 — Supabase + React

Primeira interface funcional da AlfaDoor com login Supabase Auth, painel administrativo e cadastro/listagem de anunciantes. Inclui schema SQL inicial para anunciantes, locais, telas, mídias, campanhas, playlists e eventos de reprodução.

## Requisitos
- Node.js 20+
- Conta/projeto Supabase

## 1. Configurar Supabase
1. Crie um projeto no https://supabase.com/dashboard.
2. Abra SQL Editor e execute o conteúdo de `supabase/schema.sql`.
3. Em Authentication → Users, crie o usuário administrador com e-mail e senha.
4. No SQL Editor, promova o usuário criado a administrador. Substitua o e-mail:
   ```sql
   update public.profiles
   set role = 'admin', active = true
   where id = (select id from auth.users where email = 'admin@seudominio.com');
   ```
5. Em Project Settings → API, copie a Project URL e a chave publicável (publishable/anon). Nunca use a `service_role`/secret key no navegador.

## 2. Executar no Windows
1. Copie `.env.example` para `.env`.
2. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
3. No PowerShell, dentro da pasta do projeto:
   ```powershell
   npm install
   npm run dev
   ```
4. Abra o endereço local mostrado no terminal, normalmente `http://127.0.0.1:5173`.

## O que já funciona
- Tela de login conectada ao Supabase Auth.
- Sessão persistente e botão sair.
- Dashboard inicial.
- Cadastro e listagem de anunciantes, com busca.
- Estrutura SQL com RLS habilitado para tabelas administrativas.
- Tabelas preparadas para locais, dispositivos, campanhas, playlists e eventos.
- Bucket privado `alfadoor-media` com políticas de acesso administrativo.

## Notas importantes de segurança
- O primeiro usuário Auth é criado pelo Dashboard; o trigger cria o perfil como `operator`. Promova explicitamente o administrador pelo SQL acima.
- O frontend usa somente a chave publicável/anon. Nunca coloque a chave `service_role` no `.env` do frontend.
- O SQL de políticas é adequado como base de painel interno. Antes de abrir contas a anunciantes ou parear dispositivos reais, crie políticas separadas por proprietário e endpoints seguros para credenciais dos dispositivos. Não exponha tokens secretos de TV no navegador.
- Os módulos de telas, campanhas, upload e Android Player estão preparados no banco/roadmap, mas a interface dessas funções ainda será implementada.
- A configuração do bucket aceita imagens e vídeos até 500 MiB; confira os limites do plano Supabase e ajuste para sua operação.
