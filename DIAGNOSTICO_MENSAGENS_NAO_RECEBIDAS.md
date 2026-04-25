# 🔧 Diagnóstico de Mensagens Não Recebidas

**Problema:** Mensagens são enviadas corretamente, mas as respostas dos clientes não chegam na aplicação.

---

## 🎯 Problema Encontrado

❌ **Causa Raiz:** `EVOLUTION_WEBHOOK_URL` não estava configurada!

O Evolution API estava preparado para enviar webhooks (`WEBHOOK_EVENTS_MESSAGES_UPSERT=true`), mas **não tinha nenhuma URL** para onde enviá-los. Isso significa que as mensagens chegavam no servidor WhatsApp, mas o Evolution não sabia como notificar seu backend.

### ✅ Solução Aplicada
- ✅ Adicionado `EVOLUTION_WEBHOOK_URL` ao `.env.example`
- ✅ Configurado `WEBHOOK_URL` + `WEBHOOK_API_TOKEN` no docker-compose.yml
- ✅ Evolution agora sabe para onde enviar webhooks de entrada

---

## 📊 Fluxo de Entrada de Mensagens

```
WhatsApp Cliente
    ↓
Evolution API (recebe no WhatsApp)
    ↓
POST /webhooks/evolution (seu backend)
    ↓
WebhookController.evolutionInbound()
    ↓
InboundMessageParser.parse()
    ↓
ChatbotOrchestratorService.processInbound()
    ↓
MariaDB (salva mensagem + ticket)
    ↓
Socket.IO emitMessageCreated
    ↓
Frontend recebe via WebSocket
```

---

## 🔍 Checklist de Diagnóstico

### 1️⃣ Evolution API Enviando Webhooks?

⚠️ **VERIFICAÇÃO CRÍTICA:** Antes de tudo, certifique-se que `.env` tem:
```bash
EVOLUTION_WEBHOOK_URL=https://api.nortemtsistemas.com.br/webhooks/evolution
EVOLUTION_WEBHOOK_SECRET=seu_secreto_minimo_20_caracteres
```

Se não tiver, copie de `.env.example` e atualize agora!

```bash
# Verificar logs do Evolution
docker compose logs evolution | grep -E "webhook|Webhook|WEBHOOK"

# Esperado: 
# - WEBHOOK_URL configurada
# - Tentativas de envio de webhooks
```

**Se não houver logs:**
- Evolution não foi reiniciado após adicionar `EVOLUTION_WEBHOOK_URL`
- Falta `WEBHOOK_URL` no docker-compose.yml (já corrigido)

**Solução:**
```bash
# Reconstruir Evolution com nova configuração
docker compose down evolution
docker compose up -d evolution
docker compose logs evolution | tail -50
```

---

### 2️⃣ Backend Recebendo Webhooks?

```bash
# Verificar logs do backend
docker compose logs backend | grep -E "webhook|inbound|Falha"

# Esperado: 202 Accepted responses
```

**Se não houver logs:**
- Webhook URL não está correta
- Rede/firewall bloqueando
- Backend não está rodando

**Teste manual:**
```bash
# Testar endpoint do webhook
curl -X POST http://localhost:8080/webhooks/evolution \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer seu_evolution_api_key" \
  -d '{
    "instanceName": "seu_whatsapp",
    "data": {
      "key": {
        "id": "123",
        "remoteJid": "558699999999@s.whatsapp.net",
        "fromMe": false
      },
      "message": {
        "conversation": "Olá, tudo bem?"
      },
      "pushName": "Cliente Teste"
    }
  }'

# Esperado: { "received": true, "processed": true }
```

---

### 3️⃣ Banco de Dados Salvando Mensagens?

```bash
# Conectar ao MariaDB
docker compose exec mariadb mysql -u whatsauto -pwhatsauto123 whatsauto

# Dentro do MySQL:
SELECT * FROM messages WHERE direction = 'inbound' ORDER BY id DESC LIMIT 5;

# Esperado: Mensagens recentes aparecem aqui
```

Se não houver mensagens:
- Webhook não está sendo processado
- Erro no INSERT do banco

**Verificar erro no banco:**
```bash
# Veja os logs completos do backend
docker compose logs backend -f --tail=100

# Procure por: "Connection refused", "NOT NULL", "FOREIGN KEY"
```

---

### 4️⃣ Socket.IO Emitindo Eventos?

```bash
# Verificar se Socket.IO está rodando
docker compose exec backend curl -s http://localhost:3000/socket.io/ | head -20

# Esperado: Dados do Socket.IO Engine

# Verificar eventos emitidos
docker compose logs backend | grep -E "emitMessageCreated|emitTicketUpdated"
```

Se eventos não forem emitidos:
- Backend não conseguiu chamar emitMessageCreated()
- Problema na persistência do banco

---

### 5️⃣ Frontend Recebendo Socket.IO?

Abra a aba **Console** do navegador (F12) e procure por:

```javascript
// Esperado: Conexão estabelecida
console.log('Socket conectado:', socket.id)

// Quando uma mensagem chegar:
socket.on('messageCreated', (msg) => console.log('Nova mensagem:', msg))
```

Se não conectar:
- Socket URL incorreta no `.env`
- Traefik/proxy bloqueando WebSocket
- CORS incorreto

**Teste no navegador console:**
```javascript
// Verificar status do Socket.IO
socket.connected  // Deve ser true
socket.id         // Deve ter um ID

// Verificar listeners
console.log(socket.eventNames())  // Deve incluir 'messageCreated'

// Forçar reconexão
socket.disconnect()
socket.connect()
```

---

## 🛠️ Soluções por Cenário

### Cenário A: Webhook Não Recebido
```bash
# 1. Verificar Evolution está rodando
docker compose logs evolution --tail=50

# 2. Verificar URL do webhook na Evolution
curl http://localhost:8080/webhook/status

# 3. Reconfigurar webhook na Evolution
# Acesse: http://evolution.nortemtsistemas.com.br/
# Settings → Webhooks → Configure URL + Secret
```

### Cenário B: Webhook Recebido Mas Não Processado
```bash
# 1. Verificar logs de erro
docker compose logs backend | grep -A5 "Falha ao processar webhook"

# 2. Verificar banco de dados
docker compose exec mariadb mysql -u whatsauto -pwhatsauto123 whatsauto -e "SHOW ENGINE INNODB STATUS\G" | grep LATEST

# 3. Reiniciar backend
docker compose restart backend
```

### Cenário C: Processado Mas Não Exibido no Frontend
```bash
# 1. Verificar Socket.IO
docker compose logs backend | grep -E "socket|connected"

# 2. Testar conexão do Socket
curl -I http://api.nortemtsistemas.com.br/socket.io/

# 3. Recarregar frontend
# Force refresh: Ctrl+Shift+R (Chrome) ou Cmd+Shift+R (Mac)
```

---

## 📋 Variáveis Críticas no `.env`

⚠️ **PROBLEMA ENCONTRADO:** `EVOLUTION_WEBHOOK_URL` estava faltando!

Certifique-se que estão corretas:

```env
# ✅ DEVE existir e ser válido
EVOLUTION_SERVER_URL=https://evolution.nortemtsistemas.com.br
EVOLUTION_API_KEY=sua_chave_minimo_20_caracteres

# 🔴 CRÍTICA (FALTAVA!) - URL que o Evolution chama para messenger inbound
EVOLUTION_WEBHOOK_URL=https://api.nortemtsistemas.com.br/webhooks/evolution
EVOLUTION_WEBHOOK_SECRET=seu_secreto_minimo_20_caracteres

# ✅ Backend DEVE ter JWT_SECRET
JWT_SECRET=sua_chave_jwt_minimo_32_caracteres

# ✅ Socket URL DEVE ser acessível pelo frontend
SOCKET_URL=https://api.nortemtsistemas.com.br
SOCKET_PATH=/socket.io

# ✅ Allowed origins DEVE incluir frontend
ALLOWED_ORIGINS=https://nortemtsistemas.com.br,https://api.nortemtsistemas.com.br,https://chat.nortemtsistemas.com.br
```

### ✅ Correção Aplicada
- Adicionado `EVOLUTION_WEBHOOK_URL` ao `.env.example`
- Adicionado `WEBHOOK_URL` e `WEBHOOK_API_TOKEN` ao docker-compose.yml Evolution
- Docker-compose agora passa as variáveis corretamente para o Evolution

---

## 🚨 Comandos de Emergência

```bash
# 1️⃣ PRIMEIRO: Atualizar .env com EVOLUTION_WEBHOOK_URL
# Copiar .env.example para .env e preencher:
# EVOLUTION_WEBHOOK_URL=https://api.seu-dominio.com.br/webhooks/evolution

# 2️⃣ Reconstruir Evolution com novas variáveis
docker compose down
docker compose up -d evolution

# 3️⃣ Reiniciar backend e frontend
docker compose restart backend frontend

# 4️⃣ Monitorar tudo em tempo real
docker compose logs -f backend evolution mariadb

# 5️⃣ Testar webhook manualmente após tudo online
curl -X POST https://api.seu-dominio.com.br/webhooks/evolution \
  -H "Authorization: Bearer sua_chave_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "seu_whatsapp",
    "data": {
      "key": {"remoteJid": "5586999999999@s.whatsapp.net", "fromMe": false},
      "message": {"conversation": "Mensagem de teste"},
      "pushName": "Cliente"
    }
  }'
```

---

## 🔗 Arquivos Relevantes

| Arquivo | Responsável Por |
|---------|-----------------|
| `backend/src/controllers/webhook.controller.ts` | Receber webhooks |
| `backend/src/application/chatbot/inbound-message.parser.ts` | Parse da mensagem |
| `backend/src/application/chatbot/chatbot-orchestrator.service.ts` | Processar inbound |
| `backend/src/realtime/events.ts` | Emitir Socket.IO |
| `backend/src/models/Message.ts` | Model de mensagem |
| `frontend/src/services/socket/socket.client.ts` | Socket do frontend |

---

## 📞 Próximos Passos

1. **Execute o Checklist** acima (todos os 5 pontos)
2. **Identifique em qual etapa falha**
3. **Aplique a solução do Cenário correspondente**
4. **Teste**: Envie uma mensagem de teste via WhatsApp

Se ainda não funcionar, **cole os logs** aqui:
```bash
docker compose logs backend | grep -E "webhook|inbound|error|ERRO" | head -50
docker compose logs frontend | grep -E "socket|error|ERRO" | head -50
```
