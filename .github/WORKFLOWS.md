# GitHub Actions

O projeto agora usa dois workflows principais.

## CI

Arquivo: `.github/workflows/ci.yml`

Roda em:

- push para `main` e `develop`
- pull request para `main` e `develop`
- execucao manual

O que faz:

- instala dependencias do backend
- compila o backend
- instala dependencias do frontend
- compila o frontend
- valida `docker-compose.simple.yml`

## Deploy

Arquivo: `.github/workflows/cd.yml`

Roda somente manualmente em `Actions -> Deploy -> Run workflow`.

O que faz:

- entra no servidor por SSH
- acessa o diretorio do projeto
- atualiza a branch `main`
- sobe a stack simples com Docker Compose
- roda smoke tests em `/health` e `/api/health`

Secrets obrigatorios:

```text
SERVER_HOST
SERVER_USER
SSH_PRIVATE_KEY
```

Secret opcional:

```text
SERVER_PATH
```

Se `SERVER_PATH` nao existir, o workflow usa `/opt/whatsauto`.

## Preparacao do servidor

No servidor, deixe o repositorio clonado no caminho do deploy:

```bash
sudo mkdir -p /opt/whatsauto
sudo chown "$USER:$USER" /opt/whatsauto
git clone <URL_DO_REPOSITORIO> /opt/whatsauto
cd /opt/whatsauto
cp .env.simple.example .env.simple
nano .env.simple
```

Teste uma vez manualmente:

```bash
docker compose --env-file .env.simple -f docker-compose.simple.yml up -d --build
```

Depois disso, o workflow `Deploy` pode atualizar a aplicacao.
