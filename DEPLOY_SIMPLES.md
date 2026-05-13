# Deploy simples

Este caminho sobe somente o essencial:

- Frontend em `APP_PORT` (padrao `80`)
- Backend interno, acessado pelo frontend via `/api`
- MariaDB da aplicacao
- Evolution API em `EVOLUTION_PORT` (padrao `8080`)
- PostgreSQL interno da Evolution

Nao depende de Traefik, redes externas, Redis, n8n ou Typebot.

## 1. Criar arquivo de ambiente

```bash
cp .env.simple.example .env.simple
```

Edite `.env.simple` e troque principalmente:

- `JWT_SECRET`
- `EVOLUTION_API_KEY`
- `EVOLUTION_WEBHOOK_SECRET`
- `DB_PASS`
- `DB_ROOT_PASS`
- `POSTGRES_PASSWORD`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

## 2. Subir

```bash
docker compose --env-file .env.simple -f docker-compose.simple.yml up -d --build
```

Abra:

- Aplicacao: `http://localhost`
- Evolution API: `http://localhost:8080`

Se mudou `APP_PORT`, acesse `http://localhost:PORTA`.

## 3. Ver logs

```bash
docker compose --env-file .env.simple -f docker-compose.simple.yml logs -f backend frontend evolution
```

## 4. Atualizar depois de alterar codigo

```bash
docker compose --env-file .env.simple -f docker-compose.simple.yml up -d --build
```

## 5. Parar

```bash
docker compose --env-file .env.simple -f docker-compose.simple.yml down
```

Para apagar bancos e dados salvos:

```bash
docker compose --env-file .env.simple -f docker-compose.simple.yml down -v
```

## Observacoes

No modo simples, a Evolution envia webhooks para o backend pela rede interna do Docker:

```text
http://backend:3000/api/webhooks/evolution
```

Isso evita depender de dominio publico para receber mensagens dentro da propria stack.

Se colocar atras de Nginx, Caddy, Cloudflare Tunnel ou outro proxy externo, mantenha o frontend apontando para o mesmo host e preserve o proxy de `/api` e `/socket.io`.
