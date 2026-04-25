# Design Tokens - WhatsAuto

**Plataforma Multi-tenant de Atendimento WhatsApp**  
**Design System v1.0.0**  
**Data:** 25 de abril de 2026

---

## 📌 Sobre este Diretório

Este diretório contém o **Design System completo** para o WhatsAuto. Ele inclui:

- **Design Tokens** em formato JSON e CSS
- **Documentação de Componentes**
- **Guias de Implementação no Figma**
- **Especificações de Páginas**

---

## 📂 Estrutura

```
design-tokens/
├── design-tokens.json              # Tokens em JSON
├── design-tokens.css               # Tokens em CSS Variables
├── GUIA_FIGMA.md                   # Como usar no Figma
├── ESPECIFICACAO_AUTENTICACAO.md   # Spec página auth
├── COMPONENTES_VUETIFY.md          # Mapeamento Vue
└── README.md                        # Este arquivo
```

---

## 🎨 Design Tokens

### O que são Design Tokens?

Design tokens são **valores de design reutilizáveis** que garantem consistência visual em todo o projeto:

- 🎨 **Cores:** Paleta primária, secundária, status
- 📝 **Tipografia:** Estilos, pesos, tamanhos
- 📏 **Espaçamento:** Dimensões de padding/margin
- 🔘 **Componentes:** Border radius, shadows, animações

### Arquivos Disponíveis

#### `design-tokens.json`
JSON estruturado com todos os tokens. Use para:
- Exportação para ferramentas (Figma, Storybook)
- Documentação
- Referência centralizada

**Estrutura:**
```json
{
  "colors": {
    "primary": { "50": "#f0fdf4", ... },
    "status": { "success": "#10b981", ... }
  },
  "typography": { ... },
  "spacing": { ... },
  "components": { ... }
}
```

---

## 🚀 Como Usar

### 1. No Vue 3 (Frontend)

#### Importar Design Tokens

```typescript
// esrc/config/design-tokens.ts
import tokens from '../../design-tokens/design-tokens.json'

export const designTokens = tokens
export const colors = tokens.colors
export const typography = tokens.typography
```

#### Usar em Componentes

```vue
<script setup lang="ts">
import { colors } from '@/config/design-tokens'

const primaryColor = colors.primary.main // '#10b981'
</script>

<template>
  <button :style="{ backgroundColor: primaryColor }">
    Entrar
  </button>
</template>
```

#### Usar em CSS

```css
:root {
  --color-primary: #10b981;
  --color-primary-dark: #059669;
  --spacing-md: 12px;
  --border-radius-md: 8px;
}

.button {
  background-color: var(--color-primary);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
}
```

---

### 2. No Figma

#### Passo 1: Criar Estilos de Cores

1. Abrir Figma
2. Menu → Assets (sidebar direita)
3. Clicar em "+" → "Color"
4. Nomear: `Primary/50`, `Primary/100`, etc.
5. Definir valor do `design-tokens.json`

#### Passo 2: Criar Estilos de Tipografia

1. Menu → Assets
2. Clicar em "+" → "Typography"
3. Nomear: `Display/5XL`, `Body/Base`, etc.
4. Configurar fontSize, lineHeight, fontWeight

#### Passo 3: Criar Componentes

1. Desenhar componente (ex: Button)
2. Clicar botão direito → "Create Component"
3. Usar estilos criados nos passos anteriores
4. Criar variantes (primary, secondary, states)

#### Passo 4: Exportar Tokens

1. Usar plugin "Design Tokens" no Figma
2. Configurar para exportar como JSON
3. Sincronizar com projeto Vue

---

### 3. Sincronização Proyecto ↔ Figma

#### Opção A: Manual
1. Atualizar `design-tokens.json` localmente
2. Importar no Figma manualmente
3. Atualizar estilos CSS conforme necessário

#### Opção B: Automatizado (Recomendado)
```bash
# Instalar plugin de sincronização
npm install @tokens-studio/figma-plugin --save-dev

# Configurar token-set.json
# Usar GitHub Actions para sincronizar
```

---

## 📋 Guias

### Para Designers

👉 **Leia:** [GUIA_FIGMA.md](./GUIA_FIGMA.md)

Inclui:
- Como estruturar design no Figma
- Paleta de cores completa
- Escala de tipografia
- Componentes principais
- Variantes e states
- Checklist de implementação

---

### Para Desenvolvedores

👉 **Leia:** [COMPONENTES_VUETIFY.md](./COMPONENTES_VUETIFY.md)

Inclui:
- Mapeamento tokens → CSS
- Implementação em Vue 3
- Componentes Vuetify
- Props e variantes
- Exemplos de código
- Dark mode

---

### Para Especificações

👉 **Leia:** [ESPECIFICACAO_AUTENTICACAO.md](./ESPECIFICACAO_AUTENTICACAO.md)

Inclui:
- Layout detalhado
- Componentes da página
- Dimensões e spacing
- Estados e transições
- Acessibilidade
- Responsive design

---

## 🎯 Roadmap de Implementação

### Fase 1: Setup (Semana 1)
- [x] Criar design tokens em JSON
- [x] Documentar design system
- [ ] Criar arquivo Figma base
- [ ] Compartilhar com time de design

### Fase 2: Design System Figma (Semana 2)
- [ ] Criar todas as cores
- [ ] Criar tipografia
- [ ] Criar componentes básicos
- [ ] Criar página de autenticação

### Fase 3: Implementação Vue (Semana 3)
- [ ] Importar tokens em CSS
- [ ] Refatorar componentes existentes
- [ ] Implementar página de login
- [ ] Testar responsividade

### Fase 4: Sincronização (Semana 4)
- [ ] Configurar automação Figma ↔ Repo
- [ ] Criar CI/CD para validação
- [ ] Documentar para team
- [ ] Treinar time

### Fase 5: Expansão (Contínuo)
- [ ] Adicionar mais páginas
- [ ] Criar componentes avançados
- [ ] Implementar dark mode
- [ ] Criar documentação interativa

---

## 📐 Escala de Tamanhos

### Cores

```
Primary:     #10b981 (verde)
Secondary:   #0b1220 (cinza escuro)
Accent:      #fb923c (laranja)
WhatsApp:    #25d366 (verde WA)
Success:     #10b981 (verde)
Error:       #ef4444 (vermelho)
Warning:     #f59e0b (âmbar)
Info:        #3b82f6 (azul)
```

### Tipografia

```
XS:  12px / 400
SM:  14px / 400
Base: 16px / 400
LG:  18px / 500
XL:  20px / 600
2XL: 24px / 700
3XL: 30px / 700
4XL: 36px / 700
5XL: 48px / 700
```

### Espaçamento

```
4px   (xs)
8px   (sm)
12px  (md)
16px  (lg)
24px  (xl)
32px  (2xl)
48px  (3xl)
64px  (4xl)
```

---

## 🔗 Referências

- **Design Tokens:** [design-tokens.json](./design-tokens.json)
- **Figma Guide:** [GUIA_FIGMA.md](./GUIA_FIGMA.md)
- **Auth Spec:** [ESPECIFICACAO_AUTENTICACAO.md](./ESPECIFICACAO_AUTENTICACAO.md)
- **Frontend Code:** `frontend/src/style.css`
- **Vue Repo:** `frontend/src/`

---

## 🎨 Tema Atual (v1.0.0)

### Light Mode (Padrão)
```
Background:     #edf3ef (cinza-verde claro)
Surface:        #ffffff (branco)
Text Primary:   #0e1726 (quase preto)
Text Secondary: #5b6e63 (cinza)
Border:         #d2ddd6 (cinza claro)
```

### Dark Mode (Futuro)
```
Background:     #08110f (quase preto)
Surface:        #101d1a (cinza escuro)
Text Primary:   #d9eee5 (quase branco)
Text Secondary: #88a79a (cinza claro)
Border:         #22342f (cinza escuro)
```

---

## ✅ Checklist de Implementação

### Antes de Começar
- [ ] Entender design tokens
- [ ] Revisar `design-tokens.json`
- [ ] Ler `GUIA_FIGMA.md`
- [ ] Ler `ESPECIFICACAO_AUTENTICACAO.md`

### Setup Local
- [ ] Copiar `design-tokens` para projeto
- [ ] Importar JSON em CSS
- [ ] Testar variáveis CSS
- [ ] Atualizar componentes

### Figma
- [ ] Criar file no Figma
- [ ] Importar paleta de cores
- [ ] Criar estilos de tipografia
- [ ] Compartilhar link com time

### Validação
- [ ] Testar light mode
- [ ] Testar dark mode
- [ ] Verificar acessibilidade
- [ ] Testar responsividade

---

## 📞 Suporte

### Dúvidas sobre Design Tokens
Consulte `design-tokens.json` e `GUIA_FIGMA.md`

### Dúvidas sobre Implementação Vue
Consulte `COMPONENTES_VUETIFY.md`

### Dúvidas sobre Especificações
Consulte `ESPECIFICACAO_AUTENTICACAO.md`

---

## 📈 Histórico de Versões

### v1.0.0 - 25 de abril de 2026
- ✅ Design System inicial
- ✅ Tokens completos (cores, tipografia, spacing)
- ✅ Especificação página autenticação
- ✅ Guia Figma

**Próximas versões:**
- Dark mode completo
- Componentes avançados
- Animações
- Documentação interativa

---

## 📜 Licença

Este design system é parte do projeto **WhatsAuto** desenvolvido por **Norte MT Sistemas**.

---

**Mantido por:** Equipe de Design e Desenvolvimento  
**Última atualização:** 25 de abril de 2026  
**Status:** 🟢 Pronto para Uso
