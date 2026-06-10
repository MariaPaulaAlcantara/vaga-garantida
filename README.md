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

## Funcionalidades futuras

* Check-in automático.
* Confirmação de presença antes do evento.
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

**Networking:** aponte o domínio público para a porta que o Railway injeta (`PORT`, em geral `8080`) — a mesma nos logs de deploy.

### API (`railway.toml`)

### Build Command

```bash
npm install && npm run build:api
```

(`build:api` compila `@vaga-garantida/database` com `prisma generate` e depois a API.)

### Start Command

```bash
node apps/api/dist/main.js
```

Execute a partir da raiz do repositório. Não use `node dist/main` na raiz — o build da API fica em `apps/api/dist/`.

### Variáveis de ambiente

| Variável | Obrigatória | Exemplo |
|----------|-------------|---------|
| `DATABASE_URL` | Sim | `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require` |
| `JWT_SECRET` | Sim | string aleatória longa |
| `JWT_EXPIRES_IN` | Não | `7d` |
| `CORS_ORIGIN` | Sim (prod) | URL do frontend (ex.: `https://seu-app.vercel.app`) |
| `OTP_MOCK_CODE` | Não | apenas dev |

Railway define `PORT` automaticamente; a API escuta em `0.0.0.0`.

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
