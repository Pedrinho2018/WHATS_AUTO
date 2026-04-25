# Mapeamento de Componentes - Vuetify para Design System

**Objetivo:** Mapear componentes Vuetify com Design Tokens  
**Framework:** Vue 3 + Vuetify 3  
**Data:** 25 de abril de 2026

---

## 📋 Tabela de Mapeamento

| Design Token | Vuetify | Implementação CSS |
|---|---|---|
| Color Primary | `color="primary"` | `--color-primary: #10b981` |
| Color Secondary | `color="secondary"` | `--color-secondary: #0b1220` |
| Spacing MD | `px-3` (12px) | `padding: var(--spacing-md)` |
| Text 2XL Bold | `class="text-h5"` | `font-size: 24px; font-weight: 700` |

---

## 🎨 Componentes Principais

### 1. Button (v-btn)

**Design Token:** Button/[variants]/[sizes]/[states]

#### Implementação Primária

```vue
<template>
  <!-- Primary Button -->
  <v-btn
    color="primary"
    size="large"
    class="text-none font-weight-600"
  >
    ENTRAR
  </v-btn>
</template>

<style scoped>
.v-btn {
  border-radius: var(--border-radius-md);
  padding: var(--spacing-lg) var(--spacing-xl);
  transition: all var(--timing-normal);
}

.v-btn:hover {
  opacity: 0.9;
  box-shadow: var(--shadow-md);
}
</style>
```

#### Variantes

```vue
<!-- Primary (Verde) -->
<v-btn color="primary" size="large">Entrar</v-btn>

<!-- Secondary (Cinza) -->
<v-btn color="secondary" size="large" variant="outlined">
  Cancelar
</v-btn>

<!-- Outline -->
<v-btn color="primary" variant="outlined">
  Registrar
</v-btn>

<!-- Ghost -->
<v-btn color="primary" variant="text">
  Esqueci a senha
</v-btn>

<!-- Danger -->
<v-btn color="error" size="large">
  Deletar Conta
</v-btn>
```

#### Tamanhos

```vue
<!-- Small (32px) -->
<v-btn size="small" class="px-2">SM</v-btn>

<!-- Medium (40px) - Default -->
<v-btn size="medium" class="px-3">MD</v-btn>

<!-- Large (48px) -->
<v-btn size="large" class="px-4">LG</v-btn>
```

#### Estados

```vue
<!-- Normal -->
<v-btn>Botão</v-btn>

<!-- Hover (automático) -->

<!-- Active (automático) -->

<!-- Disabled -->
<v-btn disabled>Desabilitado</v-btn>

<!-- Loading -->
<v-btn :loading="isLoading" disabled>
  Carregando...
</v-btn>
```

---

### 2. Text Field (v-text-field)

**Design Token:** Input/[variants]/[sizes]/[states]

#### Implementação Padrão

```vue
<template>
  <v-text-field
    v-model="email"
    label="Email"
    type="email"
    placeholder="seu@email.com"
    variant="outlined"
    density="comfortable"
    class="input-field"
    :error="!!emailError"
    :error-messages="emailError"
  />
</template>

<style scoped>
.input-field {
  /* Usa variáveis CSS do Vuetify */
}

:deep(.v-field) {
  border-radius: var(--border-radius-md);
}

:deep(.v-field--focused) {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

:deep(.v-field.v-field--error) {
  --v-field-border-color: var(--color-error);
}
</style>
```

#### Variantes

```vue
<!-- Outlined (Default) -->
<v-text-field variant="outlined" />

<!-- Filled -->
<v-text-field variant="filled" />

<!-- Underline -->
<v-text-field variant="underlined" />
```

#### Tamanhos

```vue
<!-- Comfortable (40px) - Default -->
<v-text-field density="comfortable" />

<!-- Compact (32px) -->
<v-text-field density="compact" />

<!-- Default (56px) -->
<v-text-field density="default" />
```

#### States

```vue
<!-- Error -->
<v-text-field
  :error="true"
  error-messages="Email inválido"
/>

<!-- Success -->
<v-text-field
  :rules="[isValidEmail]"
  success
/>

<!-- Disabled -->
<v-text-field disabled />

<!-- Loading -->
<v-text-field loading />
```

---

### 3. Card (v-card)

**Design Token:** Card

#### Implementação

```vue
<template>
  <v-card class="login-card">
    <v-card-text class="pa-6 pa-sm-8">
      <!-- Conteúdo -->
    </v-card-text>
  </v-card>
</template>

<style scoped>
.login-card {
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-md);
  background: var(--color-surface);
}

:deep(.v-card-text) {
  padding: var(--spacing-xl);
}
</style>
```

#### Props

```vue
<v-card
  elevation="0"           <!-- Sem shadow padrão -->
  border                  <!-- Com borda -->
  rounded="lg"            <!-- Border radius customizado -->
>
  <!-- Conteúdo -->
</v-card>
```

---

### 4. Alert (v-alert)

**Design Token:** Status colors

#### Implementação

```vue
<template>
  <v-alert
    v-if="error"
    type="error"
    class="mb-5"
    density="comfortable"
    :icon="AlertCircle"
  >
    {{ error }}
  </v-alert>
</template>

<style scoped>
:deep(.v-alert) {
  border-left: 4px solid var(--color-error);
  border-radius: var(--border-radius-md);
}

:deep(.v-alert--error) {
  background-color: var(--color-error-bg);
}
</style>
```

#### Tipos

```vue
<!-- Success -->
<v-alert type="success">Sucesso!</v-alert>

<!-- Error -->
<v-alert type="error">Erro ao fazer login</v-alert>

<!-- Warning -->
<v-alert type="warning">Atenção: campo obrigatório</v-alert>

<!-- Info -->
<v-alert type="info">Informação importante</v-alert>
```

---

### 5. Avatar (v-avatar)

**Design Token:** Components/Avatar

#### Implementação

```vue
<template>
  <v-avatar
    size="44"
    color="primary"
    class="font-weight-bold"
  >
    NM
  </v-avatar>
</template>

<style scoped>
:deep(.v-avatar) {
  border-radius: var(--border-radius-full);
  font-size: 20px;
}
</style>
```

---

### 6. Dialog/Modal (v-dialog)

**Design Token:** Modal

#### Implementação

```vue
<template>
  <v-dialog
    v-model="showDialog"
    max-width="500"
    class="modal-dialog"
  >
    <v-card class="pa-6">
      <!-- Conteúdo -->
    </v-card>
  </v-dialog>
</template>

<style scoped>
:deep(.v-overlay__scrim) {
  opacity: 0.5;
}

.v-card {
  border-radius: var(--border-radius-xl);
  box-shadow: var(--shadow-2xl);
}
</style>
```

---

## 📝 Estilos Globais (CSS)

### Variáveis CSS

Criar `frontend/src/styles/design-tokens.css`:

```css
:root {
  /* Colors */
  --color-primary: #10b981;
  --color-primary-dark: #059669;
  --color-secondary: #0b1220;
  --color-accent: #fb923c;
  --color-error: #ef4444;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-info: #3b82f6;
  --color-surface: #ffffff;
  --color-bg: #edf3ef;
  --color-border: #d2ddd6;
  --color-text: #0e1726;
  --color-text-muted: #5b6e63;

  /* Typography */
  --font-family: Inter, ui-sans-serif, system-ui;
  --font-xs: 12px;
  --font-sm: 14px;
  --font-base: 16px;
  --font-lg: 18px;
  --font-xl: 20px;
  --font-2xl: 24px;
  --font-3xl: 30px;
  --font-4xl: 36px;
  --font-5xl: 48px;

  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  --spacing-xl: 24px;
  --spacing-2xl: 32px;
  --spacing-3xl: 48px;
  --spacing-4xl: 64px;

  /* Border Radius */
  --border-radius-sm: 4px;
  --border-radius-md: 8px;
  --border-radius-lg: 12px;
  --border-radius-xl: 16px;
  --border-radius-2xl: 20px;
  --border-radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  --shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);

  /* Transitions */
  --timing-fast: 150ms;
  --timing-normal: 250ms;
  --timing-slow: 350ms;
  --easing-in: cubic-bezier(0.4, 0, 1, 1);
  --easing-out: cubic-bezier(0, 0, 0.2, 1);
  --easing-in-out: cubic-bezier(0.4, 0, 0.2, 1);
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #08110f;
    --color-surface: #101d1a;
    --color-border: #22342f;
    --color-text: #d9eee5;
    --color-text-muted: #88a79a;
  }
}
```

### Importar em `main.ts`

```typescript
import '@/styles/design-tokens.css'
```

---

## 🎯 Componentes Customizados

### Criar Button Customizado

`frontend/src/components/ui/AppButton.vue`:

```vue
<template>
  <v-btn
    :color="color"
    :size="size"
    :variant="variant"
    :disabled="disabled || loading"
    :loading="loading"
    class="app-button"
    :class="[`app-button--${variant}`, `app-button--${size}`]"
  >
    <slot>{{ label }}</slot>
  </v-btn>
</template>

<script setup lang="ts">
defineProps({
  label: String,
  variant: {
    type: String,
    default: 'primary',
    validator: (v: string) => ['primary', 'secondary', 'outline', 'ghost'].includes(v),
  },
  size: {
    type: String,
    default: 'medium',
    validator: (v: string) => ['small', 'medium', 'large'].includes(v),
  },
  color: {
    type: String,
    default: 'primary',
  },
  disabled: Boolean,
  loading: Boolean,
})
</script>

<style scoped>
.app-button {
  border-radius: var(--border-radius-md);
  font-weight: 600;
  transition: all var(--timing-normal) var(--easing-in-out);
  text-transform: none;
}

.app-button:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.app-button:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: var(--shadow-sm);
}

.app-button--large {
  min-height: 48px;
  padding: var(--spacing-lg) var(--spacing-xl);
}

.app-button--medium {
  min-height: 40px;
  padding: var(--spacing-md) var(--spacing-lg);
}

.app-button--small {
  min-height: 32px;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-sm);
}
</style>
```

---

### Usar Componente Customizado

```vue
<template>
  <div class="login-form">
    <AppButton
      label="Entrar"
      variant="primary"
      size="large"
      :loading="isLoading"
      @click="handleLogin"
    />

    <AppButton
      label="Registrar"
      variant="outline"
      size="large"
    />

    <AppButton
      label="Esqueci a Senha"
      variant="ghost"
      size="medium"
    />
  </div>
</template>

<script setup lang="ts">
import AppButton from '@/components/ui/AppButton.vue'

const isLoading = ref(false)

const handleLogin = async () => {
  isLoading.value = true
  try {
    // Lógica de login
  } finally {
    isLoading.value = false
  }
}
</script>
```

---

## 🌙 Dark Mode

### Configurar em `vuetify.ts`

```typescript
import { ThemeDefinition } from 'vuetify'

const lightTheme: ThemeDefinition = {
  dark: false,
  colors: {
    primary: '#10b981',
    secondary: '#0b1220',
    accent: '#fb923c',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
    success: '#10b981',
    surface: '#ffffff',
    background: '#edf3ef',
  },
}

const darkTheme: ThemeDefinition = {
  dark: true,
  colors: {
    primary: '#10b981',
    secondary: '#d9eee5',
    accent: '#fb923c',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
    success: '#10b981',
    surface: '#101d1a',
    background: '#08110f',
  },
}

export const vuetifyTheme = {
  defaultTheme: 'light',
  themes: {
    light: lightTheme,
    dark: darkTheme,
  },
}
```

---

## 📋 Checklist de Implementação

### Fase 1: Setup
- [ ] Importar design-tokens.css
- [ ] Configurar variáveis CSS
- [ ] Atualizar vuetify.ts

### Fase 2: Componentes Básicos
- [ ] Criar AppButton
- [ ] Criar AppInput
- [ ] Criar AppCard
- [ ] Criar AppAlert

### Fase 3: Página de Login
- [ ] Implementar layout
- [ ] Adicionar formulário
- [ ] Adicionar validações
- [ ] Testar responsividade

### Fase 4: Testes
- [ ] Testar light mode
- [ ] Testar dark mode
- [ ] Testar acessibilidade
- [ ] Testar performance

---

## 🔗 Referências

- [Vuetify Documentation](https://vuetifyjs.com/)
- [Design System](./design-tokens.json)
- [Guia Figma](./GUIA_FIGMA.md)

---

**Versão:** 1.0.0  
**Data:** 25 de abril de 2026  
**Status:** 🟢 Pronto para Implementação
