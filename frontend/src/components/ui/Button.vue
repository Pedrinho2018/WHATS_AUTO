<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'outline' | 'ghost' | 'gradient'
  size?: 'sm' | 'base' | 'lg'
  rounded?: boolean
  loading?: boolean
  disabled?: boolean
  icon?: boolean
  gradient?: 'primary' | 'secondary' | 'accent' | 'brand' | 'vibrant'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'base',
  rounded: false,
  loading: false,
  disabled: false,
  icon: false,
  gradient: 'primary'
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const buttonClasses = computed(() => {
  const classes = ['nm-btn']
  
  classes.push(`nm-btn--${props.variant}`)
  classes.push(`nm-btn--${props.size}`)
  
  if (props.rounded) {
    classes.push('nm-btn--rounded')
  }
  
  if (props.icon) {
    classes.push('nm-btn--icon')
  }
  
  if (props.loading) {
    classes.push('nm-btn--loading')
  }
  
  if (props.variant === 'gradient') {
    classes.push(`nm-btn--gradient-${props.gradient}`)
  }
  
  return classes.join(' ')
})

const handleClick = (event: MouseEvent) => {
  if (!props.disabled && !props.loading) {
    emit('click', event)
  }
}
</script>

<template>
  <button
    :class="buttonClasses"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <span v-if="loading" class="nm-btn__spinner" />
    <slot v-else />
  </button>
</template>

<style scoped>
.nm-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  font-family: var(--font-family-base);
  font-weight: var(--font-weight-medium);
  border: none;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  white-space: nowrap;
  user-select: none;
  outline: none;
}

.nm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.nm-btn--sm {
  height: var(--button-height-sm);
  padding: 0 var(--space-4);
  font-size: var(--font-size-xs);
  border-radius: var(--radius-base);
}

.nm-btn--base {
  height: var(--button-height-base);
  padding: 0 var(--space-6);
  font-size: var(--font-size-sm);
  border-radius: var(--radius-lg);
}

.nm-btn--lg {
  height: var(--button-height-lg);
  padding: 0 var(--space-8);
  font-size: var(--font-size-base);
  border-radius: var(--radius-lg);
}

.nm-btn--icon.nm-btn--sm {
  width: var(--button-height-sm);
  padding: 0;
}

.nm-btn--icon.nm-btn--base {
  width: var(--button-height-base);
  padding: 0;
}

.nm-btn--icon.nm-btn--lg {
  width: var(--button-height-lg);
  padding: 0;
}

.nm-btn--rounded {
  border-radius: var(--radius-full);
}

.nm-btn--primary {
  background: var(--color-primary-500);
  color: white;
  box-shadow: var(--shadow-sm);
}

.nm-btn--primary:hover:not(:disabled) {
  background: var(--color-primary-600);
  transform: translateY(-2px);
  box-shadow: var(--shadow-primary);
}

.nm-btn--primary:active:not(:disabled) {
  transform: translateY(0);
}

.nm-btn--secondary {
  background: var(--color-secondary-500);
  color: white;
  box-shadow: var(--shadow-sm);
}

.nm-btn--secondary:hover:not(:disabled) {
  background: var(--color-secondary-600);
  transform: translateY(-2px);
  box-shadow: var(--shadow-secondary);
}

.nm-btn--accent {
  background: var(--color-accent-500);
  color: white;
  box-shadow: var(--shadow-sm);
}

.nm-btn--accent:hover:not(:disabled) {
  background: var(--color-accent-600);
  transform: translateY(-2px);
  box-shadow: var(--shadow-accent);
}

.nm-btn--success {
  background: var(--color-success-500);
  color: white;
}

.nm-btn--success:hover:not(:disabled) {
  background: var(--color-success-600);
  transform: translateY(-2px);
}

.nm-btn--warning {
  background: var(--color-warning-500);
  color: white;
}

.nm-btn--warning:hover:not(:disabled) {
  background: var(--color-warning-600);
  transform: translateY(-2px);
}

.nm-btn--error {
  background: var(--color-error-500);
  color: white;
}

.nm-btn--error:hover:not(:disabled) {
  background: var(--color-error-600);
  transform: translateY(-2px);
}

.nm-btn--outline {
  background: transparent;
  color: var(--color-primary-500);
  border: 2px solid var(--color-primary-500);
  box-shadow: none;
}

.nm-btn--outline:hover:not(:disabled) {
  background: var(--color-primary-50);
  border-color: var(--color-primary-600);
  color: var(--color-primary-600);
}

html.dark .nm-btn--outline:hover:not(:disabled) {
  background: var(--color-primary-900);
}

.nm-btn--ghost {
  background: transparent;
  color: var(--color-text-primary);
  box-shadow: none;
}

.nm-btn--ghost:hover:not(:disabled) {
  background: var(--color-hover);
}

.nm-btn--gradient {
  color: white;
  border: none;
  box-shadow: var(--shadow-md);
}

.nm-btn--gradient:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.nm-btn--gradient-primary {
  background: var(--gradient-primary);
}

.nm-btn--gradient-secondary {
  background: var(--gradient-secondary);
}

.nm-btn--gradient-accent {
  background: var(--gradient-accent);
}

.nm-btn--gradient-brand {
  background: var(--gradient-brand);
}

.nm-btn--gradient-vibrant {
  background: var(--gradient-vibrant);
}

.nm-btn--loading {
  pointer-events: none;
}

.nm-btn__spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: var(--radius-full);
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.nm-btn:focus-visible {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
}
</style>
