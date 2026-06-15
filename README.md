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
| `WEB_APP_URL` ou `APP_URL` | Não | URL pública do **app Next.js** (ex.: `https://app.vagagarantida.dev.br`). Links nos emails apontam para `/eventos/{id}`. |

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
| `WEB_APP_URL` ou `APP_URL` | Não | URL pública do frontend Next.js (links nos emails) |

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

### Domínios customizados (`vagagarantida.dev.br`)

Estrutura recomendada:

| URL | Serviço Railway | Repositório |
|-----|-----------------|-------------|
| `https://www.vagagarantida.dev.br` | Landing (site estático) | `vaga-garantida-site` |
| `https://app.vagagarantida.dev.br` | Web (Next.js) | `vaga-garantida` |
| `https://api.vagagarantida.dev.br` | API (NestJS) | `vaga-garantida` |

#### Passo 1 — DNS (registro.br ou onde o domínio está)

No painel DNS, crie **dois registros CNAME** (o Railway mostra o valor exato ao adicionar cada domínio):

| Nome / host | Tipo | Valor (exemplo — use o que o Railway indicar) |
|-------------|------|-----------------------------------------------|
| `app` | CNAME | `xxxx.up.railway.app` |
| `api` | CNAME | `yyyy.up.railway.app` |

A landing (`www`) já deve estar apontando para o serviço do `vaga-garantida-site`.

#### Passo 2 — Railway: domínio no serviço **Web**

1. Abra o projeto no [Railway](https://railway.app)
2. Clique no serviço **Web** (Next.js)
3. **Settings** → **Networking** → **Custom Domain**
4. Adicione: `app.vagagarantida.dev.br`
5. Copie o CNAME e confira no DNS (Passo 1)
6. Aguarde o certificado SSL ficar **Active** (pode levar alguns minutos)

#### Passo 3 — Railway: domínio no serviço **API**

1. Clique no serviço **API** (NestJS)
2. **Settings** → **Networking** → **Custom Domain**
3. Adicione: `api.vagagarantida.dev.br`
4. Confira o CNAME no DNS
5. Aguarde SSL **Active**

#### Passo 4 — Variáveis no serviço **API**

Em **Variables**, defina ou atualize:

| Variável | Valor |
|----------|-------|
| `CORS_ORIGIN` | `https://app.vagagarantida.dev.br` |
| `WEB_APP_URL` | `https://app.vagagarantida.dev.br` |
| `APP_URL` | `https://app.vagagarantida.dev.br` |

Salve e faça **Redeploy** da API.

#### Passo 5 — Variáveis no serviço **Web**

Em **Variables**, defina ou atualize:

| Variável | Valor |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://api.vagagarantida.dev.br` |

**Importante:** `NEXT_PUBLIC_*` entra no build do Next.js. Após alterar, é obrigatório **Redeploy** (não basta restart).

#### Passo 6 — Landing page (`vaga-garantida-site`)

Os botões e o menu **Entrar** devem apontar para `https://app.vagagarantida.dev.br` (não para `*.up.railway.app`).

Após merge/deploy da landing, faça **Redeploy** do serviço do site.

#### Passo 7 — Testar

1. `https://www.vagagarantida.dev.br` → landing carrega
2. **Ver eventos** → abre `https://app.vagagarantida.dev.br/eventos`
3. **Entrar** → abre `https://app.vagagarantida.dev.br/login`
4. Login e listagem de eventos funcionam (API em `api.vagagarantida.dev.br`)
5. E-mail de confirmação contém link para `app.vagagarantida.dev.br/eventos/...`

Se o app abrir mas as chamadas à API falharem (erro de CORS no console), confira `CORS_ORIGIN` na API e redeploy.

### Verificação local (produção)

```bash
npm install
npm run build:api
node apps/api/dist/main.js
```

## Status

MVP implementado — monorepo com API NestJS, frontend Next.js e banco PostgreSQL.
