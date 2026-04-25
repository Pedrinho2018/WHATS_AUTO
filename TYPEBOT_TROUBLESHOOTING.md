# 🔧 TypeBot Builder - Troubleshooting & Ativação

**Status Atual:** ⚠️ TypeBot está **desabilitado por padrão**

---

## 🚨 Problema: Página Indisponível

Se você vê que `https://typebot-builder.nortemtsistemas.com.br/` está inacessível, a causa provável é:

```
❌ O container typebot-builder não está rodando
```

---

## ✅ Solução 1: Ativar TypeBot (Rápido)

### 1️⃣ Caso A: Começar TypeBot agora

```bash
# Ativa o profile "typebot" e inicia os containers
docker compose --profile typebot up -d
```

### 2️⃣ Caso B: Parar TypeBot

```bash
# Para os containers de TypeBot
docker compose --profile typebot down
```

---

## ⚙️ Solução 2: Ativar TypeBot Permanentemente

Se quer que TypeBot sempre inicie com o projeto, edite `.env`:

```env
# .env
TYPEBOT_ENABLED=true
TYPEBOT_ENCRYPTION_SECRET=seu_segredo_aqui_minimo_32_caracteres
```

Depois atualize `docker-compose.yml` para **remover** a linha `profiles: ["typebot"]` dos serviços:

### 📝 Editar `docker-compose.yml`

Localize essas seções e **remova** a linha `profiles: ["typebot"]`:

**Antes:**
```yaml
typebot-builder:
  profiles: ["typebot"]     # ← REMOVER ESTA LINHA
  image: baptiste-arnaud/typebot-builder:latest
  ...
```

**Depois:**
```yaml
typebot-builder:
  image: baptiste-arnaud/typebot-builder:latest
  ...
```

Faça o mesmo para `typebot-viewer`.

---

## 🔍 Verificações de Diagnóstico

### 1️⃣ Verificar se container está rodando

```bash
docker ps | grep typebot
```

**Esperado:** Você deve ver `typebot_builder` e `typebot_viewer`

**Se não aparecer:**
```bash
# Verifique logs
docker compose --profile typebot logs typebot-builder
```

### 2️⃣ Verificar conectividade com banco

```bash
# Acessar container PostgreSQL
docker compose exec postgres psql -U botuser -d evolution_db -c "SELECT 1;"
```

**Esperado:** Resultado: `1` (conexão OK)

### 3️⃣ Verificar variáveis de ambiente

```bash
docker compose --profile typebot config | grep -i typebot
```

**Verifique:**
- `ENCRYPTION_SECRET` tem valor (mínimo 32 caracteres)
- `NEXTAUTH_URL` está correto: `https://typebot-builder.nortemtsistemas.com.br`
- `DATABASE_URL` aponta para PostgreSQL correto

### 4️⃣ Testar acesso direto ao container

```bash
# Se Traefik estiver funcionando
curl -I https://typebot-builder.nortemtsistemas.com.br

# Se quiser testar pelo localhost
docker compose exec typebot-builder curl -s http://localhost:3000/api/health >/dev/null && echo "OK" || echo "ERRO"
```

---

## 🛠️ Solução 3: Imagem Docker Não Encontrada

Se receber este erro:
```
Error pull access denied for baptiste-arnaud/typebot-builder, repository does not exist
```

**Causa:** A imagem `baptiste-arnaud/typebot-builder` foi removida ou descontinuada.

### Opção A: Usar Imagem Oficial do Typebot (Recomendado)

Atualize `docker-compose.yml` para usar a imagem oficial:

```yaml
  typebot-builder:
    profiles: ["typebot"]
    image: typebot/builder:latest  # ← MUDAR PARA ESTA IMAGEM
    container_name: typebot_builder
    # ... resto das configs
```

```yaml
  typebot-viewer:
    profiles: ["typebot"]
    image: typebot/viewer:latest   # ← MUDAR PARA ESTA IMAGEM
    container_name: typebot_viewer
    # ... resto das configs
```

Depois execute:
```bash
docker compose --profile typebot pull
docker compose --profile typebot up -d
```

### Opção B: Construir Localmente do Repositório

```bash
# Clone o repositório oficial do Typebot
git clone https://github.com/baptisteArno/typebot.io.git typebot-src
cd typebot-src

# Build da imagem localmente
docker build -t typebot/builder:local -f apps/builder/Dockerfile .
docker build -t typebot/viewer:local -f apps/viewer/Dockerfile .

# Atualize docker-compose.yml para usar as imagens locais
# image: typebot/builder:local
# image: typebot/viewer:local

cd ..
docker compose --profile typebot up -d
```

### Opção C: Usar Versão Específica Conhecida

Se a versão oficial falhar, teste com versões anteriores:

```yaml
# No docker-compose.yml
image: typebot/builder:v2.17.0  # ou outra versão estável
image: typebot/viewer:v2.17.0
```

Depois:
```bash
docker compose --profile typebot pull
docker compose --profile typebot up -d
```

---

## 🌐 Acessar TypeBot Depois de Ativo

| Serviço | URL | Porém |
|---------|-----|-------|
| **Builder** (criar bots) | `https://typebot-builder.nortemtsistemas.com.br` | Editar fluxos |
| **Viewer** (executar bots) | `https://typebot-viewer.nortemtsistemas.com.br` | Testar bots ao vivo |

---

## 📋 Checklist de Pré-requisitos

Antes de ativar TypeBot, verifique:

- ✅ PostgreSQL rodando: `docker compose exec postgres psql ...`
- ✅ `.env` com `TYPEBOT_ENCRYPTION_SECRET` definido (mín. 32 chars)
- ✅ `ADMIN_EMAIL` definido no `.env`
- ✅ Traefik rodando (para roteamento HTTPS)
- ✅ DNS resolvendo `typebot-builder.nortemtsistemas.com.br` → seu servidor

---

## 🔐 Variáveis Obrigatórias (`.env`)

```env
# Segredo para criptografia de dados no Typebot
TYPEBOT_ENCRYPTION_SECRET=sua_chave_super_secreta_com_minimo_32_caracteres_aqui_1234567890

# Banco de dados
POSTGRES_USER=botuser
POSTGRES_PASSWORD=bot_senha_forte_aqui
POSTGRES_DB=evolution_db

# URLs públicas
TYPEBOT_BUILDER_URL=https://typebot-builder.nortemtsistemas.com.br
TYPEBOT_VIEWER_URL=https://typebot-viewer.nortemtsistemas.com.br

# Admin
ADMIN_EMAIL=admin@nortemtsistemas.com.br
```

---

## 🚀 Próximos Passos

1. **Ativar TypeBot:**
   ```bash
   docker compose --profile typebot up -d
   ```

2. **Acessar:**
   - Builder: https://typebot-builder.nortemtsistemas.com.br
   - Criar uma conta ou fazer login

3. **Testar integração com backend:**
   - Consulte `docs/integracao-typebot-n8n.md`

---

## 📞 Problemas Comuns

| Problema | Solução |
|----------|---------|
| "Image not found" ou "pull access denied" | Use imagem oficial: `typebot/builder:latest` em vez de `baptiste-arnaud/typebot-builder` |
| "Database connection refused" | Verifique se PostgreSQL está rodando: `docker ps \| grep postgres` |
| "ENCRYPTION_SECRET not set" | Adicione `TYPEBOT_ENCRYPTION_SECRET` ao `.env` |
| "Host not found" | Verifique DNS ou configure `/etc/hosts` localmente |
| "TLS certificate error" | Verifique se Traefik e Let's Encrypt estão configurados |
| Container crasha constantemente | Veja logs: `docker compose --profile typebot logs typebot-builder` |

---

## 📚 Referências

- 📄 Integração TypeBot + N8N: `docs/integracao-typebot-n8n.md`
- 📄 Setup de Produção: `SETUP_PRODUCAO.md`
- 📄 Docker Compose: `docker-compose.yml` (linhas 214-270)
