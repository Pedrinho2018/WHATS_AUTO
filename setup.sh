#!/bin/bash
# ══════════════════════════════════════════════════════════
#   SETUP COMPLETO DO BOT WHATSAPP COM IA
#   Execute: bash setup.sh
# ══════════════════════════════════════════════════════════

set -e

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   WhatsApp Bot Comercial com IA — Setup      ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# 1. Verifica dependências
echo "▶ Verificando dependências..."
command -v docker >/dev/null 2>&1 || { echo "❌ Docker não encontrado. Instale em https://docker.com"; exit 1; }
command -v docker compose >/dev/null 2>&1 || docker compose version >/dev/null 2>&1 || { echo "❌ Docker Compose não encontrado."; exit 1; }
echo "✅ Docker OK"

# 2. Cria .env se não existir
if [ ! -f .env ]; then
  echo "▶ Criando .env a partir do exemplo..."
  cp .env.example .env
  echo "⚠️  EDITE o arquivo .env com suas chaves antes de continuar!"
  echo "   Especialmente: GEMINI_API_KEY, EVOLUTION_API_KEY, EVOLUTION_WEBHOOK_SECRET, N8N_PASSWORD, ADMIN_EMAIL e ADMIN_PASSWORD"
  echo ""
  read -p "   Pressione ENTER após editar o .env..." _
fi

# 3. Cria pasta para dados do bot (SQLite)
echo "▶ Criando pasta de dados..."
mkdir -p bot_data
echo "✅ Pasta bot_data/ criada (SQLite do bot ficará aqui)"

# 4. Sobe os containers
echo ""
echo "▶ Iniciando containers (isso pode demorar na primeira vez)..."
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.local.yml}"
docker compose -f "$COMPOSE_FILE" up -d

echo ""
echo "▶ Aguardando containers ficarem prontos..."
sleep 15

# 5. Cria instância na Evolution API
echo ""
echo "▶ Configurando instância na Evolution API..."

source .env

required_vars=(EVOLUTION_SERVER_URL EVOLUTION_API_KEY EVOLUTION_WEBHOOK_SECRET EVOLUTION_INSTANCE WEBHOOK_URL N8N_USER ADMIN_EMAIL ADMIN_PASSWORD)
for var_name in "${required_vars[@]}"; do
  if [ -z "${!var_name}" ]; then
    echo "❌ Variável obrigatória ausente no .env: $var_name"
    exit 1
  fi
done

CREATE_RESP=$(curl -s -X POST "${EVOLUTION_SERVER_URL}/instance/create" \
  -H "apikey: ${EVOLUTION_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"instanceName\": \"${EVOLUTION_INSTANCE}\",
    \"qrcode\": true,
    \"integration\": \"WHATSAPP-BAILEYS\"
  }" 2>/dev/null)

echo "Resposta da Evolution API: $CREATE_RESP"
echo ""

extract_connect_data() {
  echo "$1" | node -e '
    let input = "";
    process.stdin.on("data", (chunk) => { input += chunk; });
    process.stdin.on("end", () => {
      try {
        const data = JSON.parse(input);
        const qr = data?.qrcode?.base64 || data?.base64 || data?.qrCode || data?.qrcode || "";
        const pin = data?.code || data?.pairingCode || data?.pairing_code || "";
        if (qr) console.log(`QR=${qr}`);
        if (pin) console.log(`PIN=${pin}`);
      } catch {
        process.exit(0);
      }
    });
  '
}

echo "▶ Conferindo dados retornados na criação..."
extract_connect_data "$CREATE_RESP"

# 6. Configura webhook na instância
echo "▶ Configurando webhook na instância..."

WEBHOOK_URL_BOT="${WEBHOOK_URL}/webhook/whatsapp"

WEBHOOK_RESP=$(curl -s -X POST "${EVOLUTION_SERVER_URL}/webhook/set/${EVOLUTION_INSTANCE}" \
  -H "apikey: ${EVOLUTION_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"${WEBHOOK_URL_BOT}\",
    \"webhook_by_events\": false,
    \"webhook_base64\": false,
    \"events\": [\"MESSAGES_UPSERT\"]
  }" 2>/dev/null)

echo "Webhook configurado: $WEBHOOK_RESP"
echo ""

# 7. Busca QR Code para conectar WhatsApp
echo "▶ Gerando QR Code para conectar WhatsApp..."
sleep 3

QR_RESP=$(curl -s -X GET "${EVOLUTION_SERVER_URL}/instance/connect/${EVOLUTION_INSTANCE}" \
  -H "apikey: ${EVOLUTION_API_KEY}" 2>/dev/null)

echo "Resposta de connect: $QR_RESP"
extract_connect_data "$QR_RESP"

if ! echo "$QR_RESP" | grep -Eq '"qrcode"|"base64"|"code"|"pairingCode"'; then
  echo "⚠️  A Evolution não retornou QR/PIN nessa chamada."
  echo "   Verifique o status em: ${EVOLUTION_SERVER_URL}/manager"
  echo "   Ou consulte: ${EVOLUTION_SERVER_URL}/instance/fetchInstances?instanceName=${EVOLUTION_INSTANCE}"
fi

echo ""
echo "═══════════════════════════════════════════════════"
echo "✅ SETUP CONCLUÍDO!"
echo "═══════════════════════════════════════════════════"
echo ""
echo "📱 PRÓXIMOS PASSOS:"
echo ""
echo "1. Acesse o n8n: http://localhost:5678"
echo "   Usuário: $N8N_USER"
echo "   Senha: (a que você definiu no .env)"
echo ""
echo "2. Importe o workflow:"
echo "   n8n → Settings → Import Workflow → workflow_whatsapp_bot.json"
echo ""
echo "3. Ative o workflow (toggle no canto superior direito)"
echo ""
echo "4. Escaneie o QR Code do WhatsApp:"
echo "   Acesse: ${EVOLUTION_SERVER_URL}/instance/connect/${EVOLUTION_INSTANCE}"
echo "   Use o header apikey: ${EVOLUTION_API_KEY}"
echo "   Ou acesse o Evolution API Manager em: ${EVOLUTION_SERVER_URL}/manager"
echo ""
echo "5. Teste enviando uma mensagem para o número conectado!"
echo ""
echo "🔍 Logs dos containers:"
echo "   docker compose logs -f n8n"
echo "   docker compose logs -f evolution"
echo ""
