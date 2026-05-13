# Quickstart GitHub Actions

## 1. Configure os secrets

Em `GitHub -> Settings -> Secrets and variables -> Actions`, crie:

```text
SERVER_HOST
SERVER_USER
SSH_PRIVATE_KEY
```

Opcional:

```text
SERVER_PATH
```

Sem `SERVER_PATH`, o deploy usa `/opt/whatsauto`.

## 2. Prepare o servidor

```bash
sudo mkdir -p /opt/whatsauto
sudo chown "$USER:$USER" /opt/whatsauto
git clone <URL_DO_REPOSITORIO> /opt/whatsauto
cd /opt/whatsauto
cp .env.simple.example .env.simple
nano .env.simple
docker compose --env-file .env.simple -f docker-compose.simple.yml up -d --build
```

## 3. Rode o deploy pelo GitHub

Vá em:

```text
Actions -> Deploy -> Run workflow
```

Informe a URL para teste, por exemplo:

```text
http://seu-servidor
```

O workflow vai rodar:

```bash
git pull --ff-only origin main
docker compose --env-file .env.simple -f docker-compose.simple.yml up -d --build --remove-orphans
```

Depois testa:

```text
/health
/api/health
```
