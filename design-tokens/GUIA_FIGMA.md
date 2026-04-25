# Design System - Guia de Implementação no Figma

**Projeto:** WhatsAuto - Plataforma Multi-tenant de Atendimento WhatsApp  
**Versão:** 1.0.0  
**Data:** 25 de abril de 2026

---

## 📋 Estrutura do Design System

### 1. Paleta de Cores

#### Cores Primárias (Verde)
```
Primary 50:  #f0fdf4
Primary 100: #dcfce7
Primary 200: #bbf7d0
Primary 300: #86efac
Primary 400: #4ade80
Primary 500: #22c55e
Primary 600: #16a34a
Primary 700: #15803d (Main)
Primary 800: #166534
Primary 900: #145231
Primary 950: #0f2818

Main: #10b981
Dark: #059669
Light: #d1fae5
```

#### Cores Secundárias (Cinza Escuro)
- **Main:** #0b1220
- **Light:** #f1f5f9
- **Dark:** #020617

#### Cores de Status
- **Success:** #10b981 (Verde)
- **Error:** #ef4444 (Vermelho)
- **Warning:** #f59e0b (Âmbar)
- **Info:** #3b82f6 (Azul)

#### Cores de Marca
- **WhatsApp:** #25d366
- **Accent:** #fb923c (Laranja)

---

## 🎨 Tipografia

### Famílias de Fonte
- **Primary:** Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
- **Mono:** Courier New, monospace

### Escalas de Tamanho

| Nome | Tamanho | Altura da Linha | Peso | Espaçamento |
|------|---------|-----------------|------|-------------|
| XS | 12px | 16px | Regular (400) | 0.5 |
| SM | 14px | 20px | Regular (400) | 0 |
| Base | 16px | 24px | Regular (400) | 0 |
| LG | 18px | 28px | Medium (500) | 0 |
| XL | 20px | 28px | SemiBold (600) | 0 |
| 2XL | 24px | 32px | Bold (700) | 0 |
| 3XL | 30px | 36px | Bold (700) | 0 |
| 4XL | 36px | 40px | Bold (700) | -0.02 |
| 5XL | 48px | 48px | Bold (700) | -0.02 |

---

## 📏 Espaçamento

Sistema de espaçamento baseado em múltiplos de 4px:

```
XS:  4px
SM:  8px
MD:  12px
LG:  16px
XL:  24px
2XL: 32px
3XL: 48px
4XL: 64px
```

---

## 🔘 Componentes

### 1. Botões

#### Tamanhos

**Small (32px altura)**
- Padding: 6px 12px
- Font Size: 14px
- Uso: Ações secundárias, formulários

**Medium (40px altura)**
- Padding: 8px 16px
- Font Size: 14px
- Uso: Padrão para maioria dos casos

**Large (48px altura)**
- Padding: 10px 20px
- Font Size: 16px
- Uso: CTAs principais, ações importantes

#### Variantes

1. **Primary** - Fundo verde primário, texto branco
   - Estado: default, hover, active, disabled, loading

2. **Secondary** - Fundo cinza secundário, texto branco
   - Uso: Ações menos importantes

3. **Outline** - Borda primária, fundo transparente
   - Uso: Ações alternativas

4. **Ghost** - Sem fundo, apenas texto colorido
   - Uso: Links, ações terciárias

5. **Danger** - Fundo vermelho, texto branco
   - Uso: Ações destrutivas (delete, logout)

#### Estados

- **Default:** Estado natural do componente
- **Hover:** Leve mudança de opacidade/cor
- **Active:** Destaque visual (shadow, cor mais escura)
- **Disabled:** Opacidade 50%, sem interação
- **Loading:** Ícone de loading, desabilitado

**Exemplo no Figma:**
```
Button/
├── Primary
│   ├── Small
│   │   ├── Default
│   │   ├── Hover
│   │   ├── Active
│   │   ├── Disabled
│   │   └── Loading
│   ├── Medium
│   └── Large
├── Secondary
├── Outline
├── Ghost
└── Danger
```

---

### 2. Inputs

#### Tamanhos

**Small (32px)**
- Height: 32px
- Padding: 6px 8px
- Font Size: 14px

**Medium (40px)**
- Height: 40px
- Padding: 8px 12px
- Font Size: 14px

**Large (48px)**
- Height: 48px
- Padding: 10px 16px
- Font Size: 16px

#### Variantes

1. **Default** - Borda cinza, fundo branco
2. **Filled** - Fundo cinza, sem borda
3. **Outline** - Apenas borda

#### Estados

- **Default:** Borda cinza, valor placeholder
- **Hover:** Borda primária mais escura
- **Focus:** Borda primária, sombra
- **Disabled:** Fundo cinza claro, sem interação
- **Error:** Borda vermelha, ícone de erro
- **Success:** Borda verde, ícone de sucesso

---

### 3. Cards

#### Padrões
- Border Radius: 12px
- Shadow: md (0 4px 6px -1px rgba(0, 0, 0, 0.1))
- Padding: 24px
- Background: Surface (branco em light, #101d1a em dark)

---

### 4. Modals

- Border Radius: 16px
- Shadow: 2xl
- Backdrop Opacity: 50%
- Padding: 24px

---

## 📱 Breakpoints

| Nome | Largura | Uso |
|------|---------|-----|
| XS | 0px | Mobile |
| SM | 640px | Small Mobile |
| MD | 768px | Tablet |
| LG | 1024px | Desktop |
| XL | 1280px | Large Desktop |
| 2XL | 1536px | Extra Large |

---

## ⏱️ Animações

### Timings

- **Fast:** 150ms - Hover, microinterações
- **Normal:** 250ms - Transições padrão
- **Slow:** 350ms - Modais, grandes mudanças

### Easing

- **Ease In:** cubic-bezier(0.4, 0, 1, 1) - Começar lentamente
- **Ease Out:** cubic-bezier(0, 0, 0.2, 1) - Terminar lentamente
- **Ease In Out:** cubic-bezier(0.4, 0, 0.2, 1) - Ambos

---

## 🎯 Temas

### Light Theme (Padrão)

```css
--color-bg: #edf3ef
--color-surface: #ffffff
--color-border: #d2ddd6
--color-text: #0e1726
--color-text-muted: #5b6e63
```

### Dark Theme

```css
--color-bg: #08110f
--color-surface: #101d1a
--color-border: #22342f
--color-text: #d9eee5
--color-text-muted: #88a79a
```

---

## 📦 Componentes Prioritários (Fase 1)

### Página de Autenticação

1. **Container de Logo**
   - Avatar com "NM"
   - Título "Norte MT Sistemas"
   - Subtítulo "Whats Auto"

2. **Card de Login**
   - Border Radius: 12px
   - Shadow: md
   - Padding: 24px (32px em desktop)

3. **Formulário de Login**
   - Campo Email (Size: MD)
   - Campo Senha (Size: MD)
   - Toggle "Mostrar Senha"
   - Botão "Entrar" (Variant: Primary, Size: MD/LG)
   - Link "Esqueci a senha"

4. **Formulário de Registro**
   - Campo Nome (Size: MD)
   - Campo Email (Size: MD)
   - Campo Senha (Size: MD)
   - Campo Confirmar Senha (Size: MD)
   - Campo Nome da Empresa (Size: MD)
   - Campo Subdomínio (Size: MD)
   - Campo Telefone (Size: MD - Opcional)
   - Botão "Registrar" (Variant: Primary, Size: MD/LG)

5. **Alertas**
   - Error (Fundo vermelho claro, ícone vermelho)
   - Success (Fundo verde claro, ícone verde)
   - Info (Fundo azul claro, ícone azul)
   - Warning (Fundo âmbar claro, ícone âmbar)

---

## 🚀 Como Usar no Figma

### 1. Criar Estilos de Cores

**Menu → Figma → Assets → Colors**
```
🎨 Primary / 50
🎨 Primary / 100
...
🎨 Status / Success
🎨 Status / Error
```

### 2. Criar Estilos de Tipografia

**Menu → Figma → Assets → Typography**
```
📝 Display / 5XL
📝 Display / 4XL
📝 Heading / 3XL
📝 Heading / 2XL
📝 Heading / XL
📝 Body / Large
📝 Body / Base
📝 Small
📝 Extra Small
```

### 3. Criar Componentes

**Assets → Components**
```
🔘 Button
  ├── Primary
  │   ├── Small
  │   ├── Medium
  │   └── Large
  ├── Secondary
  ├── Outline
  ├── Ghost
  └── Danger

📝 Input
  ├── Small
  ├── Medium
  └── Large

🎴 Card
📦 Modal
```

### 4. Usar Design Tokens

Cada componente deve:
- ✅ Usar as cores definidas
- ✅ Usar espaçamento do sistema (múltiplos de 4px)
- ✅ Usar tipografia predefinida
- ✅ Respeitar border radius do sistema
- ✅ Aplicar sombras conforme especificado

---

## 📋 Checklist para Implementação

### Fase 1: Temas e Cores
- [ ] Criar todas as paletas de cores como estilos
- [ ] Configurar light theme
- [ ] Configurar dark theme
- [ ] Testar contraste de acessibilidade

### Fase 2: Tipografia
- [ ] Importar fonte Inter
- [ ] Criar estilos para cada escala
- [ ] Definir font weights
- [ ] Testar legibilidade

### Fase 3: Componentes Básicos
- [ ] Criar componente Button (5 variantes × 3 tamanhos)
- [ ] Criar componente Input (3 variantes × 3 tamanhos)
- [ ] Criar componente Card
- [ ] Criar componente Alert

### Fase 4: Página de Autenticação
- [ ] Criar layout de login
- [ ] Criar layout de registro
- [ ] Criar componentes de formulário
- [ ] Adicionar validações visuais

### Fase 5: Documentação
- [ ] Criar página de documentação
- [ ] Adicionar guidelines de uso
- [ ] Criar exemplos de uso
- [ ] Documentar padrões

---

## 🔗 Recursos

- **Design Tokens:** `/design-tokens/design-tokens.json`
- **Estilos Atuais:** `frontend/src/style.css`
- **Componentes Vue:** `frontend/src/components/`
- **Figma:** [Link do Arquivo a Compartilhar]

---

## 📞 Próximos Passos

1. ✅ Criar arquivo Figma com estrutura de biblioteca
2. ✅ Adicionar todas as cores e estilos
3. ✅ Criar componentes principais
4. ✅ Preparar para exportação de design tokens
5. ✅ Sincronizar com projeto Vue

---

**Versão:** 1.0.0  
**Última atualização:** 25 de abril de 2026  
**Status:** 🟢 Pronto para Implementação
