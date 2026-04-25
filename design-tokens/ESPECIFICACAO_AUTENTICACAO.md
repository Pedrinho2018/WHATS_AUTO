# Especificação de Design - Página de Autenticação

**Projeto:** WhatsAuto  
**Página:** Authentication (Login & Register)  
**Status:** 🟢 Pronto para Design no Figma

---

## 📐 Layout

### Viewport Dimensions

- **Mobile:** 360px × 667px
- **Tablet:** 768px × 1024px
- **Desktop:** 1440px × 900px

### Estrutura Geral

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  ┌────────────────────┐  ┌──────────────────────────┐   │
│  │                    │  │                          │   │
│  │    Left Section    │  │   Right Section          │   │
│  │   (Brand Info)     │  │   (Login/Register Form)  │   │
│  │                    │  │                          │   │
│  └────────────────────┘  └──────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 Left Section - Brand

### Componentes

#### 1. Brand Mark (Topo)
```
┌─────────────────────────────┐
│ [Avatar NM]  Texto          │
│              - Norte MT     │
│              - Whats Auto   │
└─────────────────────────────┘
```

**Avatar:**
- Size: 44px × 44px
- Background: Primary (#10b981)
- Content: "NM" (Bold, 20px, branco)
- Border Radius: full (circular)

**Texto:**
- Title: "Norte MT Sistemas" (Bold, 24px, Primary 900)
- Subtitle: "Whats Auto" (Regular, 14px, Primary 700)
- Spacing: 12px entre título/subtítulo

---

#### 2. Brand Title
```
"Atendimento, automação e
operação em um único painel."
```

**Estilo:**
- Font: 36px Bold (4XL)
- Color: Secondary 900 (#0b1220)
- Line Height: 1.2
- Margin Top: 32px

---

#### 3. Brand Copy
```
"Acompanhe conversas, instâncias
e fluxos com uma interface mais
direta para a rotina da equipe."
```

**Estilo:**
- Font: 16px Regular (Base)
- Color: Secondary 600 (#475569)
- Line Height: 1.6
- Margin Top: 16px
- Max Width: 400px

---

#### 4. Brand Status (Rodapé)
```
┌─────────────────────────────┐
│ ● Sistema online            │
│ Ambiente seguro             │
└─────────────────────────────┘
```

**Estilo:**
- Layout: Vertical stack, 8px spacing
- Status Dot: 8px círculo verde (#10b981)
- Font: 14px Regular, Secondary 700
- Margin Top: Auto (posiciona no rodapé)

---

### Responsive

**Mobile (<640px):**
- Hidden (exibir apenas no desktop)

**Desktop (≥1024px):**
- Width: 50% da tela
- Padding: 48px
- Flex align: center vertically

---

## 📝 Right Section - Formulário

### Estrutura

```
┌──────────────────────────────────┐
│  Form Container (Card)           │
│                                  │
│  1. Heading                      │
│  [8px gap]                       │
│  2. Subheading                   │
│  [20px gap]                      │
│                                  │
│  3. Alert (if error)             │
│  [12px gap]                      │
│                                  │
│  4. Form Fields                  │
│  [12px gap between inputs]       │
│  [16px gap after last input]     │
│                                  │
│  5. Loading State / Button       │
│                                  │
│  [16px gap]                      │
│  6. Footer Link                  │
│                                  │
└──────────────────────────────────┘
```

---

### 1. Card Container

**Estilo:**
- Background: Surface (branco #ffffff)
- Border Radius: 12px
- Padding: 24px (mobile) / 32px (desktop)
- Shadow: md (0 4px 6px -1px rgba(0, 0, 0, 0.1))

---

### 2. Heading

**Texto:** "Entrar" ou "Criar Conta"

**Estilo:**
- Font: 24px Bold (2XL)
- Color: Secondary 900 (#0b1220)
- Margin Bottom: 8px

---

### 3. Subheading

**Texto:** "Use suas credenciais corporativas." ou "Preencha os dados abaixo"

**Estilo:**
- Font: 14px Regular (Small)
- Color: Secondary 600 (#475569)
- Margin Bottom: 20px

---

### 4. Alert (Conditional)

**Condição:** Exibir quando houver erro

```
┌────────────────────────────────────┐
│ ⚠ Erro ao fazer login             │
│                                    │
│ Verify your email and password     │
└────────────────────────────────────┘
```

**Estilo:**
- Background: Error 50 (#fef2f2)
- Border Left: 4px Error (#ef4444)
- Padding: 12px 16px
- Border Radius: 8px
- Icon: Tamanho 20px, Error 500
- Text: 14px, Error 900
- Margin Bottom: 12px

---

### 5. Form Fields - LOGIN

#### Campo Email

```
┌────────────────────────┐
│ Email                  │
│ ┌────────────────────┐ │
│ │ seu@email.com      │ │
│ └────────────────────┘ │
└────────────────────────┘
```

**Label:**
- Font: 14px Medium, Secondary 700
- Margin Bottom: 6px

**Input:**
- Size: MD (40px altura)
- Type: email
- Placeholder: "seu@email.com"
- States: default, hover, focus, error
- Margin Bottom: 12px

---

#### Campo Senha

```
┌────────────────────────┐
│ Senha                  │
│ ┌────────────────────┐ │
│ │ •••••••••••        │ 👁 │
│ └────────────────────┘ │
└────────────────────────┘
```

**Label:**
- Font: 14px Medium, Secondary 700
- Margin Bottom: 6px

**Input:**
- Size: MD (40px altura)
- Type: password (toggle disponível)
- Placeholder: "••••••••"
- Icon Toggle: Eye icon (20px), Secondary 600
- Margin Bottom: 16px

---

#### Botão "Entrar"

```
┌────────────────────────┐
│    ENTRAR              │
└────────────────────────┘
```

**Estilo:**
- Variant: Primary
- Size: MD/LG (40px/48px)
- Width: 100%
- Font: 16px Medium, Branco
- States: default, hover, active, disabled, loading
- Border Radius: 8px
- Margin Bottom: 16px

**Estados:**
- **Hover:** Background Primary 700 (#15803d)
- **Active:** Background Primary 800 (#166534) + shadow
- **Loading:** Ícone spinner, desabilitado
- **Disabled:** Opacity 50%, sem cursor

---

#### Link "Esqueci a senha?"

```
┌────────────────────────────┐
│  Esqueci a senha? →        │
└────────────────────────────┘
```

**Estilo:**
- Font: 14px Medium, Primary (#10b981)
- Text Align: Center
- Cursor: pointer
- Hover: Underline, darker color

---

### 6. Form Fields - REGISTER (quando aplicável)

#### Campos Adicionais

1. **Nome Completo**
   - Label: "Nome"
   - Type: text
   - Placeholder: "João da Silva"

2. **E-mail**
   - Label: "Email"
   - Type: email
   - Placeholder: "seu@email.com"

3. **Senha**
   - Label: "Senha"
   - Type: password
   - Helpers: "Mínimo 8 caracteres"

4. **Nome da Empresa**
   - Label: "Nome da Empresa"
   - Type: text
   - Placeholder: "Empresa LTDA"

5. **Subdomínio**
   - Label: "Subdomínio"
   - Helper: "será usado em: subdomain.nortemtsistemas.com.br"
   - Type: text
   - Placeholder: "empresa"
   - Pattern: apenas letras-números-hífen (lowercase)

6. **Telefone**
   - Label: "Telefone (Opcional)"
   - Type: tel
   - Placeholder: "(11) 99999-9999"
   - States: empty (cinza), filled (preto)

---

## 🎨 Variações de Estado

### Loading State

```
┌────────────────────────┐
│    ENTRANDO...         │
│    [Spinner]           │
└────────────────────────┘
```

- Botão desabilitado
- Spinner animado (150ms rotation)
- Texto é ocultado/exibir apenas em dispositivos com espaço

---

### Error State

```
┌────────────────────────┐
│ ⚠ Erro ao fazer login  │
│                        │
│ Email: [X] Campo       │ (Borda vermelha)
│ Senha: [!] Campo       │ (Borda vermelha)
│                        │
│ [Botão Entrar]         │
│                        │
│ Esqueci a senha?       │
└────────────────────────┘
```

- Alert visível no topo
- Campos com borda vermelha
- Ícone de erro ao lado do campo

---

### Success State

```
✅ Login realizado com sucesso!
Redirecionando...
```

- Alert verde
- Animação fade-out após redirect

---

## 📱 Responsive Design

### Mobile (360px - 640px)

- **Layout:** Single column (full-width)
- **Left Section:** Hidden
- **Right Section:** Padding 16px, full width
- **Card:** Sem shadow (ou minimal)
- **Button:** Full width, 48px altura
- **Font Sizes:** Reduzir 2px em alguns casos

---

### Tablet (640px - 1024px)

- **Layout:** Two columns (50% cada)
- **Left Section:** Visible, menos padding (32px)
- **Right Section:** Visible
- **Card:** Padding 24px

---

### Desktop (1024px+)

- **Layout:** Two columns (50% cada)
- **Left Section:** Visible com padding 48px
- **Right Section:** Visible com padding 48px
- **Card:** Padding 32px
- **Max Width:** 1440px

---

## 🔄 Transições

### Fade In Animation
```css
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

Animation: fadeIn 250ms ease-out
```

---

### Button Hover
```css
Transition: all 150ms ease-in-out
- Background color change
- Shadow increase
```

---

## ♿ Acessibilidade

- ✅ Contrast ratio mínimo 4.5:1 (text)
- ✅ Tamanho de clique mínimo 44px × 44px
- ✅ Labels associados aos inputs
- ✅ States claramente indicavam via cor + ícone (não apenas cor)
- ✅ Feedback de erro em texto (não apenas cor)
- ✅ Loading state com aria-live="polite"
- ✅ Focus visible indicators (outline 2px)

---

## 📋 Componentes para Criar no Figma

### Priority 1 (Essencial)
- [ ] Typography Scale completa
- [ ] Color Palette completa
- [ ] Button (5 variants × 3 sizes)
- [ ] Input Field (3 variants × 3 sizes)
- [ ] Card
- [ ] Alert

### Priority 2 (Importante)
- [ ] Formulário de Login completo
- [ ] Formulário de Registro completo
- [ ] Loading State
- [ ] Error State

### Priority 3 (Adicional)
- [ ] Animations (Lottie preview)
- [ ] Dark Mode variations
- [ ] Mobile previews

---

## 🎬 Próximos Passos

1. ✅ Criar file no Figma: "WhatsAuto Design System v1.0"
2. ✅ Criar página "Design Tokens" com essas especificações
3. ✅ Criar página "Components" com biblioteca
4. ✅ Criar página "Screens" com login/register
5. ✅ Gerar link de compartilhamento
6. ✅ Implementar no Vue baseado no design

---

**Versão:** 1.0.0  
**Última Atualização:** 25 de abril de 2026  
**Status:** 🟢 Pronto para Implementação no Figma
