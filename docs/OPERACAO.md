# Operacao e confiabilidade

Este documento descreve como operar o WHATS_AUTO em ambiente real: logs, diagnostico, retry de mensagens, backup, health checks, monitoramento e staging.

## Objetivo

Garantir que a operacao consiga responder rapidamente:

- o webhook chegou?
- a mensagem foi salva?
- o evento realtime foi emitido?
- a Evolution falhou?
- o banco esta saudavel?
- os containers estao reiniciando?
- existe backup recente?
- staging esta separado da producao?

## Logs estruturados

O backend escreve logs em JSON.

Campos recomendados e ja usados nos fluxos criticos:

- `company_id`
- `ticket_id`
- `message_id`
- `event_type`
- `status`
- `source`
- `timestamp`
- `message`

Exemplo:

```json
{
  "timestamp": "2026-05-13T18:00:00.000Z",
  "level": "info",
  "message": "Evento operacional registrado",
  "company_id": 1,
  "ticket_id": 10,
  "message_id": 55,
  "event_type": "message_saved",
  "status": "success",
  "source": "chatbot-orchestrator"
}
```

Ver logs:

```bash
docker compose --env-file .env.simple -f docker-compose.simple.yml logs -f backend
```

Filtrar por ticket:

```bash
docker compose --env-file .env.simple -f docker-compose.simple.yml logs backend | grep '"ticket_id":10'
```

## Tela/admin de diagnostico

Rota no frontend:

```text
/diagnostics
```

Endpoint:

```text
GET /api/diagnostics/events
GET /api/diagnostics/events?ticketId=10
```

A tela mostra:

- webhooks recebidos;
- mensagens salvas;
- eventos realtime emitidos;
- falhas/retries de envio;
- resumo de alertas e erros das ultimas 24h.

Eventos registrados:

| Evento | Quando acontece |
|---|---|
| `webhook_received` | Backend recebe webhook da Evolution |
| `message_saved` | Mensagem inbound e persistida |
| `realtime_emitted` | Socket.IO emite evento para o frontend |
| `message_send_retry` | Envio outbound falha e sera tentado novamente |
| `message_send_failed` | Envio outbound falhou apos tentativas |

## Retry de envio de mensagem

O provider da Evolution tenta reenviar mensagem em caso de falha transitoria.

Variavel:

```env
MESSAGE_SEND_MAX_ATTEMPTS=3
```

Comportamento:

1. tenta enviar pela Evolution;
2. se falhar, registra `message_send_retry`;
3. aguarda alguns segundos;
4. tenta novamente;
5. se esgotar, registra `message_send_failed` e retorna erro ao operador.

Este mecanismo reduz perda por instabilidade momentanea, mas ainda nao substitui uma fila persistente dedicada.

## Backup automatico do MariaDB

O compose simples inclui o servico:

```text
mariadb-backup
```

Ele roda `mysqldump` periodicamente e grava arquivos compactados em volume Docker.

Variaveis:

```env
BACKUP_RETENTION_DAYS=7
BACKUP_INTERVAL_SECONDS=86400
```

Listar backups:

```bash
docker compose --env-file .env.simple -f docker-compose.simple.yml exec mariadb-backup ls -lh /backups
```

Executar backup manual:

```bash
docker compose --env-file .env.simple -f docker-compose.simple.yml exec mariadb-backup /usr/local/bin/backup-mariadb.sh
```

Restaurar backup:

```bash
docker compose --env-file .env.simple -f docker-compose.simple.yml exec -T mariadb sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' < backup.sql
```

Se o arquivo estiver `.gz`:

```bash
gunzip -c backup.sql.gz | docker compose --env-file .env.simple -f docker-compose.simple.yml exec -T mariadb sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"'
```

## Health checks

Servicos com health check no compose simples:

- frontend: `GET /health`
- backend: `GET /api/health`
- mariadb: `SELECT 1`
- postgres: `pg_isready`
- evolution: tentativa HTTP em `:8080`

Ver status:

```bash
docker compose --env-file .env.simple -f docker-compose.simple.yml ps
```

Testes manuais:

```bash
curl -f http://localhost/health
curl -f http://localhost/api/health
curl -f http://localhost:8080
```

## Monitoramento basico

O compose simples inclui:

- `node-exporter`: CPU, memoria, disco e rede do host.
- `cadvisor`: uso de CPU/memoria por container e reinicios.

Portas padrao:

```env
NODE_EXPORTER_PORT=9100
CADVISOR_PORT=8081
```

URLs:

```text
http://localhost:9100/metrics
http://localhost:8081
```

Comandos uteis:

```bash
docker stats
docker compose --env-file .env.simple -f docker-compose.simple.yml ps
docker compose --env-file .env.simple -f docker-compose.simple.yml logs --tail=200 backend
df -h
free -h
```

Sinais de alerta:

- backend reiniciando muitas vezes;
- Evolution sem responder;
- disco acima de 80%;
- MariaDB sem backup recente;
- muitos `message_send_failed`;
- muitos webhooks recebidos sem `message_saved`.

## Staging separado de producao

Existe um overlay:

```text
docker-compose.staging.yml
```

Subir staging:

```bash
cp .env.simple.example .env.staging
docker compose --env-file .env.staging -f docker-compose.simple.yml -f docker-compose.staging.yml up -d --build
```

Portas padrao do staging:

- App: `18080`
- Evolution: `18082`
- cAdvisor: `18083`
- Node exporter: `19100`

Recomendacoes:

- usar banco/volumes separados;
- usar chaves Evolution separadas;
- usar usuario admin diferente;
- nunca apontar WhatsApp de cliente real para staging;
- testar migrations e deploy em staging antes de producao.

## Checklist de incidente: mensagem nao apareceu

1. Abrir `/diagnostics`.
2. Filtrar pelo `ticket_id`, se existir.
3. Verificar se existe `webhook_received`.
4. Se nao existe, olhar Evolution e configuracao de webhook.
5. Se existe webhook mas nao `message_saved`, olhar logs do backend.
6. Se existe `message_saved` mas nao `realtime_emitted`, olhar Socket.IO.
7. Se existe realtime mas tela nao atualiza, olhar console do navegador e token JWT.
8. Verificar `docker compose ps`.
9. Verificar `docker compose logs backend evolution`.

## Checklist diario

- `docker compose ps` sem containers reiniciando.
- `/diagnostics` sem erros nas ultimas 24h.
- backup recente em `/backups`.
- disco com folga.
- Evolution respondendo.
- mensagens inbound/outbound recentes aparecendo no dashboard.
