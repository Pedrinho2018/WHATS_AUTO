# Imagens Docker Corretas do Typebot - Descoberta Atualizada

## Status das Imagens Procuradas

❌ **DESCONTINUADAS/NÃO DISPONÍVEIS:**
- `typebot/builder:latest` - Not found (removida)
- `typebot/viewer:latest` - Not found (removida)  
- `baptiste-arnaud/typebot-builder` - Removed

## ✅ IMAGENS OFICIAIS ATUAIS E FUNCIONANDO

### Repositório Correto
**Docker Hub:** [`baptistearno`](https://hub.docker.com/u/baptistearno)  
**GitHub:** [baptisteArno/typebot.io](https://github.com/baptisteArno/typebot.io) (9.9k stars, mantido ativamente)

### Imagens Disponíveis

| Componente | Imagem | Pulls | Atualização | Tags Disponíveis |
|-----------|--------|-------|------------|-----------------|
| **Builder** | `baptistearno/typebot-builder` | 1M+ | 16 dias atrás | `latest`, `3.16.1`, `3.16.0`, `3.15.2`, `3.15.1`, etc |
| **Viewer** | `baptistearno/typebot-viewer` | 1M+ | 16 dias atrás | `latest`, `3.16.1`, `3.16.0`, `3.15.2`, `3.15.1`, etc |

**Versão Recomendada:** `3.16.1` (mais recente) ou `latest` (track automático)

---

## Como Usar em docker-compose.yml

### Configuração Corrigida

```yaml
# ─── Typebot Builder (Construtor Visual) ────────────────────────
typebot-builder:
  profiles: ["typebot"]
  image: baptistearno/typebot-builder:latest  # ou baptistearno/typebot-builder:3.16.1
  container_name: typebot_builder
  restart: unless-stopped
  environment:
    - ENCRYPTION_SECRET=${TYPEBOT_ENCRYPTION_SECRET}
    - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres_bot:5432/${POSTGRES_DB}?schema=typebot
    - NEXT_PUBLIC_VIEWER_URL=${TYPEBOT_VIEWER_URL:-https://typebot-viewer.${ROOT_DOMAIN:-nortemtsistemas.com.br}}
    - NEXTAUTH_URL=${TYPEBOT_BUILDER_URL:-https://typebot-builder.${ROOT_DOMAIN:-nortemtsistemas.com.br}}
    - ADMIN_EMAIL=${ADMIN_EMAIL}
  networks:
    - traefik-public
    - bot_network
  depends_on:
    postgres:
      condition: service_healthy
  # ... labels e healthcheck restante igual

# ─── Typebot Viewer (Motor de Chat) ─────────────────────────────
typebot-viewer:
  profiles: ["typebot"]
  image: baptistearno/typebot-viewer:latest  # ou baptistearno/typebot-viewer:3.16.1
  container_name: typebot_viewer
  restart: unless-stopped
  environment:
    - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres_bot:5432/${POSTGRES_DB}?schema=typebot
    - NEXT_PUBLIC_VIEWER_URL=${TYPEBOT_VIEWER_URL:-https://typebot-viewer.${ROOT_DOMAIN:-nortemtsistemas.com.br}}
  networks:
    - traefik-public
    - bot_network
  depends_on:
    postgres:
      condition: service_healthy
  # ... labels e healthcheck restante igual
```

### Comandos para Testar

```bash
# Testar disponibilidade das imagens
docker pull baptistearno/typebot-builder:latest
docker pull baptistearno/typebot-viewer:latest

# Listar versões disponíveis
docker run --rm docker:latest images baptistearno/typebot-builder

# Subir apenas o Typebot
docker compose --profile typebot up -d
```

---

## Deployment em Produção - Recomendações

### Opção 1: Self-Hosted com Docker (Recomendado para Seu Stack)

**Requisitos:**
- PostgreSQL (configurado no seu `postgres_bot` service)
- Environment variables de encryption e auth
- Traefik/Load Balancer (você já tem)
- HTTPS/SSL (usando certresolver como na config atual)

**Recursos Mínimos:**
- Builder: ~1.23 GB (amd64), ~1.2 GB (arm64)
- Viewer: ~1.16 GB (amd64), ~1.13 GB (arm64)

**Configuração de Produção:**
```yaml
# Adicionar health checks robustos
healthcheck:
  test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://127.0.0.1:3000"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 60s

# Limitar recursos
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 4G
```

### Opção 2: SaaS Cloud (Se não quiser Self-Hosting)

**Alternativa Gerenciada:**
- **Typebot Cloud:** https://app.typebot.io/
- Sem necessidade de manutenção de infraestrutura
- Suporta integração via API/Webhook com sua aplicação

---

## Integrações Suportadas com Seu Stack

- ✅ Webhook para NxN/Eventos personalizados
- ✅ REST API para controle programático
- ✅ Socket.IO para real-time (compatível com seu backend Socket)
- ✅ Embedded no frontend Vue 3 com iframe ou Web Component
- ✅ Multi-tenant pronto

---

## Licença e Observações Importantes

**Licença:** Functional Source License (Fair Source)
- Self-hosting é permitido
- Consulte: https://github.com/baptisteArno/typebot.io/blob/main/LICENSE

**Suporte:**
- GitHub Issues: https://github.com/baptisteArno/typebot.io/issues
- Discord Community: https://typebot.io/discord
- Documentação: https://docs.typebot.io/

---

## Resumo: Correções Necessárias

Para produção no seu `docker-compose.yml`:

1. **Linha 216:** Alterar `image: typebot/builder:latest` para `image: baptistearno/typebot-builder:latest`
2. **Linha 242:** Alterar `image: typebot/viewer:latest` para `image: baptistearno/typebot-viewer:latest`
3. Manter todas as outras configurações de environment, networks e labels iguais
4. Testar pull antes de deploy: `docker pull baptistearno/typebot-builder:latest`

