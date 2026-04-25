# ⚡ SOLUÇÃO RÁPIDA - Mensagens Não Recebidas

🎯 **Problema Identificado:** `EVOLUTION_WEBHOOK_URL` não estava configurada no `.env`

---

## 🚀 Corrigir Em 3 Passos

### 1️⃣ Atualizar `.env`

```bash
# Se não tem .env, copie do exemplo
cp .env.example .env

# Depois edite e adicione/confirme estas linhas:
nano .env
```

**Procure por "Evolution API" e adicione:**
```env
EVOLUTION_SERVER_URL=https://evolution.nortemtsistemas.com.br
EVOLUTION_API_KEY=sua_chave_api_aqui
EVOLUTION_WEBHOOK_URL=https://api.nortemtsistemas.com.br/webhooks/evolution
EVOLUTION_WEBHOOK_SECRET=seu_secreto_da_api_key
```

### 2️⃣ Reiniciar Evolution

```bash
# Parar Evolution
docker compose stop evolution

# Reiniciar com novas configurações
docker compose up -d evolution

# Monitorar logs (Ctrl+C para parar)
docker compose logs -f evolution | grep -E "webhook|WEBHOOK|Webhook"
```

### 3️⃣ Testar

```bash
# Terminal 1: Monitorar backend
docker compose logs -f backend | grep -E "webhook|inbound|messageCreated"

# Terminal 2: Enviar mensagem de teste pelo WhatsApp para sua conta
# (aguarde 5-10 segundos)

# Esperado nos logs:
# - "Falha ao processar webhook..." (pode ter erros iniciais)
# - Ou "emitMessageCreated" significa sucesso!
```

---

## ✅ Verificar Se Funcionou

No navegador, abra o **Console (F12)** e procure por:

```javascript
// Deve conectar ao Socket.IO
socket.connected  // true

// Quando receber mensagem:
socket.on('messageCreated', (msg) => console.log('✅ Mensagem recebida!', msg))
```

Se ver mensagens chegando no Console → **Está funcionando!**

---

## 🔗 Links

- Guia completo: [DIAGNOSTICO_MENSAGENS_NAO_RECEBIDAS.md](DIAGNOSTICO_MENSAGENS_NAO_RECEBIDAS.md)
- Configuração: [.env.example](.env.example)
- PR com fix: https://github.com/Pedrinho2018/WHATS_AUTO/pull/new/docs/diagnostico-mensagens-nao-recebidas

---

## 📞 Se Ainda Não Funcionar

Cole os logs aqui:

```bash
# Terminal 1
docker compose logs evolution | grep -E "webhook|error|ERROR" | tail -20

# Terminal 2  
docker compose logs backend | grep -E "webhook|inbound|ERRO|error" | tail -20

# Terminal 3
docker compose logs mariadb | grep -E "ERROR" | tail -20
```
