# AlfaDoor — ambiente local inicial

Primeira base técnica para a plataforma de mídia indoor: API Node.js/TypeScript, PostgreSQL e autenticação administrativa inicial.

## Requisitos
- Windows 10/11
- Node.js 20 ou superior
- Docker Desktop (recomendado para iniciar o PostgreSQL)

## 1. Preparar
1. Extraia esta pasta em `C:\Projetos\alfadoor-local` (ou outro caminho sem restrições).
2. Copie `.env.example` para `.env`.
3. Abra o terminal nesta pasta e execute `npm install`.
4. Inicie o banco: `docker compose up -d db`
5. Crie as tabelas: `npm run db:migrate`
6. Inicie a API: `npm run dev`

A API ficará em `http://localhost:4000`.
Teste de saúde: `http://localhost:4000/health`.

## 2. Criar o primeiro administrador
Configure `ADMIN_EMAIL` e `ADMIN_PASSWORD` no `.env` antes de iniciar a API. No primeiro arranque, a API cria esse usuário se ainda não existir.

Solicite um token:
```powershell
$body = @{ email = "admin@alfadoor.local"; password = "TroqueEstaSenha123!" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:4000/api/auth/login -ContentType "application/json" -Body $body
```
Copie o `token` da resposta. Para consultar o perfil:
```powershell
$headers = @{ Authorization = "Bearer COLE_SEU_TOKEN" }
Invoke-RestMethod -Uri http://localhost:4000/api/auth/me -Headers $headers
```

## Endpoints iniciais
- `GET /health` — estado básico da API e banco
- `POST /api/auth/login` — autenticação
- `GET /api/auth/me` — perfil do usuário autenticado
- `GET /api/advertisers` — lista anunciantes (autenticado)
- `POST /api/advertisers` — cadastra anunciante (autenticado)

## Segurança e limitações desta base
- Use uma senha forte no `.env`; nunca publique esse arquivo.
- O JWT é uma base inicial. Antes de uso comercial, acrescente rotação/expiração de sessões, recuperação de senha, limitação de tentativas, auditoria e política de backup.
- Ainda não inclui o app Android Player, upload de mídia, campanhas, pagamentos ou relatórios.
- A API local não fica pública na internet. Para acesso externo será necessário implantar e proteger os serviços.
