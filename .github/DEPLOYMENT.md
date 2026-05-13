# Deploy pelo GitHub Actions

O deploy foi simplificado para rodar via SSH no servidor.

## Secrets

Configure em `Settings -> Secrets and variables -> Actions`:

```text
SERVER_HOST
SERVER_USER
SSH_PRIVATE_KEY
```

Opcional:

```text
SERVER_PATH
```

Padrao: `/opt/whatsauto`.

## Servidor

O servidor precisa ter:

- Docker
- Docker Compose
- Git
- repositorio clonado em `SERVER_PATH`
- arquivo `.env.simple` criado no servidor

Preparacao:

```bash
sudo mkdir -p /opt/whatsauto
sudo chown "$USER:$USER" /opt/whatsauto
git clone <URL_DO_REPOSITORIO> /opt/whatsauto
cd /opt/whatsauto
cp .env.simple.example .env.simple
nano .env.simple
docker compose --env-file .env.simple -f docker-compose.simple.yml up -d --build
```

## Rodar deploy

No GitHub:

```text
Actions -> Deploy -> Run workflow
```

Informe a URL publica da aplicacao no campo `app_url`.

## O que o workflow executa

No servidor:

```bash
git fetch --all --prune
git checkout main
git pull --ff-only origin main
docker compose --env-file .env.simple -f docker-compose.simple.yml up -d --build --remove-orphans
docker compose --env-file .env.simple -f docker-compose.simple.yml ps
```

No runner do GitHub:

```bash
.github/scripts/smoke-tests.sh "$APP_URL"
```

O smoke test verifica:

- `/health`
- `/api/health`
