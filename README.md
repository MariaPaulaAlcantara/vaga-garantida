# Vaga Garantida

## Sobre o projeto

O Vaga Garantida é uma plataforma para gerenciamento de vagas e controle de presença em eventos com capacidade limitada.

O projeto surgiu a partir da necessidade de organizar aulas gratuitas de ciclismo, onde muitas pessoas reservam vagas, mas não comparecem no dia do evento, impedindo que outras pessoas participem.

A plataforma automatiza o processo de reserva, confirmação de presença e gerenciamento da lista de espera.

## Problema

Atualmente o controle de participantes é realizado manualmente através do WhatsApp.

Principais dificuldades:

* Pessoas reservam vagas e não comparecem.
* Controle manual da lista de espera.
* Necessidade de enviar confirmações individualmente.
* Vagas ficam ociosas por desistências de última hora.
* Processo trabalhoso para o organizador.

## Objetivo

Criar uma solução que permita:

* Reservar vagas online.
* Gerenciar listas de espera automaticamente.
* Confirmar presença antes do evento.
* Repassar vagas liberadas para outras pessoas.
* Acompanhar histórico de participação.

## MVP

### Participantes

* Criar conta.
* Visualizar eventos disponíveis.
* Reservar vaga.
* Entrar na lista de espera.
* Cancelar participação.

### Organizador

* Criar eventos.
* Definir limite de participantes.
* Visualizar participantes confirmados.
* Visualizar lista de espera.
* Gerenciar reservas.

## Notificações por email

A API envia emails automaticamente nos seguintes casos:

* **Lista de espera** — ao entrar na fila ou avançar de posição.
* **Vaga liberada** — ao sair da fila e precisar confirmar presença.
* **Lembrete de confirmação** — quando abre a janela para confirmar presença.
* **Nova aula** — quando a organizadora publica um evento (`publish: true`).

Sem `MAILERSEND_API_TOKEN`, os emails aparecem nos logs da API como `[MOCK EMAIL]` (ideal para desenvolvimento).

### MailerSend (piloto / produção)

1. Crie conta em [mailersend.com](https://www.mailersend.com).
2. **Trial** (domínio `mlsender.net`): até 100 emails para 2 destinatários — só para teste inicial.
3. Para piloto com várias pessoas: verifique seu domínio no MailerSend e ative o plano **Livre** (500 emails/mês).
4. Crie um **API token** com permissão de envio de email.
5. No `.env` da API (ou Railway):

| Variável | Obrigatória | Exemplo |
|----------|-------------|---------|
| `MAILERSEND_API_TOKEN` | Sim (email real) | `mlsn.xxxxxxxx` |
| `EMAIL_FROM` | Sim (email real) | `Vaga Garantida <noreply@seudominio.com>` |
| `APP_URL` | Não | `https://seu-app.vercel.app` (links nos emails) |

6. Reinicie a API.

O remetente (`EMAIL_FROM`) deve usar um domínio verificado no MailerSend.

## Funcionalidades futuras

* Check-in automático.
* Notificações por WhatsApp.
* Sistema de pontuação e reputação.
* Estatísticas de participação.
* Relatórios de presença.

## Tecnologias

### Frontend

* Next.js
* TypeScript
* Tailwind CSS

### Backend

* NestJS
* TypeScript
* Prisma ORM

### Banco de Dados

* PostgreSQL

## Como rodar localmente

### Pré-requisitos

* Node.js 20+
* Docker (para PostgreSQL)

### Passos

```bash
# 1. Instalar dependências
npm install

# 2. Subir o banco de dados
docker compose up -d

# 3. Copiar variáveis de ambiente
cp .env.example .env

# 4. Rodar migrations e seed
npm run db:generate
npm run db:migrate
npm run db:seed

# 5. Iniciar API e frontend
npm run dev
```

* Frontend: http://localhost:3000
* API: http://localhost:3001
* Swagger: http://localhost:3001/docs

### Contas de exemplo (seed)

| Papel | Telefone | OTP (dev) |
|-------|----------|-----------|
| Organizadora | 11999990000 | 123456 |
| Participante | 11988880000 | 123456 |

## Deploy no Railway (dois serviços)

Use **dois serviços** no mesmo repositório, ambos com **Root Directory vazio** (raiz do monorepo).

| Serviço | Config-as-code | Start |
|---------|----------------|-------|
| `@vaga-garantida/api` | `railway.toml` | API NestJS |
| `@vaga-garantida/web` | `railway.web.toml` | Next.js |

No painel de cada serviço: **Settings → Config-as-code** → informe o arquivo correto.

Se um deploy aparecer como **Skipped** ("No changes to watched files"), use **Redeploy** no último deploy bem-sucedido ou confira os `watchPatterns` em [`railway.toml`](railway.toml) (inclui `packages/database/**` e `package.json`).

**Networking:** aponte o domínio público para a porta que o Railway injeta (`PORT`, em geral `8080`) — a mesma nos logs de deploy.

### API (`railway.toml`)

### Build Command

```bash
npm install && npm run build:api
```

(`build:api` compila `@vaga-garantida/database` com `prisma generate` e depois a API.)

### Start Command

```bash
npm run start:api:prod
```

Isso executa `prisma migrate deploy` (aplica migrations pendentes) e depois sobe a API. Execute a partir da raiz do repositório.

**Importante:** o serviço da API precisa da variável `DATABASE_URL` apontando para o mesmo PostgreSQL usado em produção.

### Variáveis de ambiente

| Variável | Obrigatória | Exemplo |
|----------|-------------|---------|
| `DATABASE_URL` | Sim | `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require` |
| `JWT_SECRET` | Sim | string aleatória longa |
| `JWT_EXPIRES_IN` | Não | `7d` |
| `CORS_ORIGIN` | Sim (prod) | URL do frontend (ex.: `https://seu-app.vercel.app`) |
| `OTP_MOCK_CODE` | Não | apenas dev (sem Twilio) |
| `TWILIO_ACCOUNT_SID` | Sim (SMS) | `ACxxxxxxxx` |
| `TWILIO_AUTH_TOKEN` | Sim (SMS) | token do Twilio |
| `TWILIO_PHONE_NUMBER` | Sim (SMS) | `+15551234567` (formato E.164) |
| `MAILERSEND_API_TOKEN` | Sim (email) | `mlsn.xxxxxxxx` |
| `EMAIL_FROM` | Sim (email) | `Vaga Garantida <noreply@seudominio.com>` |
| `APP_URL` | Não | URL do frontend (links nos emails) |

Com as três variáveis Twilio preenchidas, o OTP é enviado por **SMS**. Sem elas, em dev usa `OTP_MOCK_CODE`; em produção o código aparece nos logs (`[MOCK OTP]`).

Com `MAILERSEND_API_TOKEN` e `EMAIL_FROM`, as notificações são enviadas por **email**. Sem elas, aparecem nos logs (`[MOCK EMAIL]`).

Railway define `PORT` automaticamente; a API escuta em `0.0.0.0`.

### OTP por SMS (Twilio) — piloto

1. Crie conta em [twilio.com](https://www.twilio.com) e obtenha um número com SMS.
2. No console Twilio: **Account SID**, **Auth Token**, número remetente.
3. Adicione as três variáveis `TWILIO_*` no serviço **API** do Railway.
4. Redeploy da API.
5. No site, **Entrar** com telefone no formato `11999990000` — o SMS chega em alguns segundos.

**Trial Twilio:** só envia SMS para números **verificados** no console (Phone Numbers → Verified Caller IDs).

### Health check

`GET /health` — use como health check path no Railway (`/health`).

### Web (`railway.web.toml`)

Variável obrigatória: `NEXT_PUBLIC_API_URL` = URL pública da API (sem barra no final). Deve existir **antes do build**.

Build: `npm install && npm run build -w @vaga-garantida/web`  
Start: `npm run start -w @vaga-garantida/web`

### Verificação local (produção)

```bash
npm install
npm run build:api
node apps/api/dist/main.js
```

## Status

MVP implementado — monorepo com API NestJS, frontend Next.js e banco PostgreSQL.
