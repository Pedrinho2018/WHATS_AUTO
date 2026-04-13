# 🚀 Guia de Integração - Tela de Configurações de Bot

## ✅ Checklist de Implementação

Este documento lista tudo o que foi criado e como integrar no seu projeto.

### Arquivos Criados

#### Backend
- ✅ **Model**: `backend/src/models/BotConfig.ts`
- ✅ **Service**: `backend/src/services/bot-config.service.ts`
- ✅ **Controller**: `backend/src/controllers/bot-config.controller.ts`
- ✅ **Routes**: Adicionadas em `backend/src/routes/index.ts`
- ✅ **Models Index**: Atualizado em `backend/src/models/index.ts`
- ✅ **Migração SQL**: `infrastructure/migrations/001_create_bot_configs.sql`

#### Frontend
- ✅ **View**: `frontend/src/views/BotSettings.vue`
- ✅ **Router**: Adicionada rota em `frontend/src/router/index.ts`
- ✅ **Documentação**: `docs/configuracoes-bot.md`

## 🔧 Passos de Integração

### 1. Executar Migração do Banco

```bash
# No seu cliente MySQL
mysql -u seu_usuario -p sua_database < infrastructure/migrations/001_create_bot_configs.sql

# Ou via docker
docker exec seu_container_mysql mysql -u seu_usuario -p sua_database < infrastructure/migrations/001_create_bot_configs.sql
```

### 2. Instalar Dependências (Se precisar)

Todas as dependências já devem estar instaladas, mas se não:

```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

### 3. Build e Teste

```bash
# Backend
cd backend
npm run build
npm test

# Frontend
cd frontend
npm run build
npm test
```

### 4. Reiniciar o Servidor

```bash
# Docker
docker-compose down
docker-compose up --build

# Ou localmente
npm run docker:down
npm run docker:up
```

## 📱 Como Acessar

### Na Aplicação

1. Faça login com uma conta **admin** ou **manager**
2. Navegue até: **http://localhost:3000/bot-settings**
3. Você verá a tela de configurações do bot

### Estrutura da Tela

```
Configurações do Bot
├── ⏰ Horários de Atendimento
│   ├── Hora de Abertura
│   └── Hora de Fechamento
├── 📅 Dias de Operação
│   └── Seletores de dias (Dom-Sab)
├── 🎉 Feriados
│   ├── Adicionar novo feriado
│   └── Lista de feriados
├── 👋 Mensagem de Boas-vindas
│   └── Editor de texto
├── 💬 Mensagens Padrão
│   ├── Saudação
│   ├── Despedida
│   ├── Ajuda
│   ├── Fora do Horário
│   └── Feriado
└── Status
    ├── Toggle Ativo/Inativo
    └── Botão Salvar
```

## 🔌 endpoints da API

### Criar/Atualizar Configuração
```http
POST /bot-config
Authorization: Bearer <token>
Content-Type: application/json

{
  "opening_hour": "09:00",
  "closing_hour": "18:00",
  "operating_days": [1,2,3,4,5],
  "holidays": {
    "2024-12-25": "Natal"
  },
  "welcome_message": "Olá!",
  "standard_messages": {
    "greeting": "Olá",
    "goodbye": "Até logo",
    "help": "Como ajudo?",
    "outside_hours": "Fora do horário",
    "holiday": "Dia de feriado"
  }
}
```

### Obter Configuração
```http
GET /bot-config?instance_id=123
Authorization: Bearer <token>
```

### Verificar Horário (Público)
```http
GET /bot-config/check/hours?instance_id=123
```

### Obter Mensagens
```http
GET /bot-config/messages/welcome?instance_id=123
GET /bot-config/messages/standard?instance_id=123
```

## 🛠️ Customizações Possíveis

### Adicionar Mais Mensagens Padrão

1. Edite `backend/src/models/BotConfig.ts`:
```typescript
standard_messages?: Record<string, string>; // Já aceita qualquer chave
```

2. Edite `frontend/src/views/BotSettings.vue`, seção "Mensagens Padrão":
```typescript
<div>
  <label>Nova Mensagem</label>
  <input v-model="config.standard_messages.nova_chave" type="text" />
</div>
```

### Modificar Validações

Edite `backend/src/services/bot-config.service.ts`, método `validateBotConfigData()`:

```typescript
private validateBotConfigData(data: BotConfigData): void {
  // Adicione suas validações aqui
}
```

### Alterar Layout da Tela

Todos os estilos estão em `frontend/src/views/BotSettings.vue` usando Tailwind CSS. Modifique as classes conforme necessário.

## 🧪 Testes

### Backend

```bash
cd backend

# Testar criação de config
npm test -- bot-config.service

# Testar controller
npm test -- bot-config.controller
```

### Frontend

```bash
cd frontend

# Testar componente
npm test -- BotSettings.vue
```

## 📊 Monitoramento

### Verificar Logs

```bash
# Container do backend
docker logs whatsapp_backend

# Container do frontend
docker logs whatsapp_frontend
```

### Verificar Banco de Dados

```bash
mysql> SELECT * FROM bot_configs;
mysql> SELECT * FROM bot_configs WHERE company_id = 1;
```

## 🐛 Troubleshooting

### Erro: "Configuração não encontrada"
- A tela tenta carregar uma config existente
- Se for primeira vez, cria com valores padrão
- Verifique se o SELECT está funcionando

### Erro: "Não autorizado"
- Verifique se o token JWT está na requisição
- Confirme se o usuário é admin/manager

### Erro de Banco: Foreign Key
- Execute a migração SQL primeiro
- Verifique se as tabelas `companies` e `instances` existem

### Mensagens não salvam
- Verifique a validação em tempo real
- Confira se todos os campos obrigatórios estão preenchidos
- Verifique o limites de caracteres

## 📞 Suporte

Para dúvidas ou problemas:

1. Verifique o arquivo `docs/configuracoes-bot.md`
2. Veja os logs do servidor
3. Consulte a arquitetura em `docs/guia-da-aplicacao-e-do-codigo.md`

## 🎯 Próximos Passos

Após integrar com sucesso, você pode:

1. **Integrar com Bot**: Use `/bot-config/check/hours` para verificar operação
2. **Auto-responder**: Use as mensagens de `/bot-config/messages/standard`
3. **Fluxos Automáticos**: Utilize as configs em regras de negócio
4. **Analytics**: Rastreie quando o bot está/estava operacional
5. **Templates**: Crie templates de configuração para diferentes tipos de negócio

## 📝 Notas Importantes

- **Timezone**: O servidor usa UTC. Considere o timezone do cliente
- **Feriados**: Formato de data deve ser YYYY-MM-DD
- **Performance**: Com muitas instâncias, considere cache
- **Segurança**: Apenas admin/manager podem editar configs
- **Escalabilidade**: Cada instância pode ter suas own configs
