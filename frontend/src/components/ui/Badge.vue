<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'neutral'
  size?: 'sm' | 'base' | 'lg'
  dot?: boolean
  pulse?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'base',
  dot: false,
  pulse: false
})

const badgeClasses = computed(() => {
  const classes = ['nm-badge']
  
  classes.push(`nm-badge--${props.variant}`)
  classes.push(`nm-badge--${props.size}`)
  
  if (props.pulse) {
    classes.push('nm-badge--pulse')
  }
  
  return classes.join(' ')
})
</script>

<template>
  <span :class="badgeClasses">
    <span v-if="dot" class="nm-badge__dot" />
    <slot />
  </span>
</template>

<style scoped>
.nm-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-family: var(--font-family-base);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
  border-radius: var(--radius-full);
  transition: all var(--duration-fast) var(--ease-out);
}

.nm-badge--sm {
  padding: var(--space-1) var(--space-2);
  font-size: var(--font-size-xs);
  line-height: 1;
}

.nm-badge--base {
  padding: var(--space-1) var(--space-3);
  font-size: var(--font-size-xs);
  line-height: 1.2;
}

.nm-badge--lg {
  padding: var(--space-2) var(--space-4);
  font-size: var(--font-size-sm);
  line-height: 1.2;
}

.nm-badge--primary {
  background: var(--color-primary-100);
  color: var(--color-primary-700);
}

.nm-badge--secondary {
  background: var(--color-secondary-100);
  color: var(--color-secondary-700);
}

.nm-badge--accent {
  background: var(--color-accent-100);
  color: var(--color-accent-700);
}

.nm-badge--success {
  background: var(--color-success-100);
  color: var(--color-success-700);
}

.nm-badge--warning {
  background: var(--color-warning-100);
  color: var(--color-warning-700);
}

.nm-badge--error {
  background: var(--color-error-100);
  color: var(--color-error-700);
}

.nm-badge--neutral {
  background: var(--color-neutral-100);
  color: var(--color-neutral-700);
}

html.dark .nm-badge--primary {
  background: var(--color-primary-900);
  color: var(--color-primary-200);
}

html.dark .nm-badge--secondary {
  background: var(--color-secondary-900);
  color: var(--color-secondary-200);
}

html.dark .nm-badge--accent {
  background: var(--color-accent-900);
  color: var(--color-accent-200);
}

html.dark .nm-badge--success {
  background: var(--color-success-900);
  color: var(--color-success-200);
}

html.dark .nm-badge--warning {
  background: var(--color-warning-900);
  color: var(--color-warning-200);
}

html.dark .nm-badge--error {
  background: var(--color-error-900);
  color: var(--color-error-200);
}

html.dark .nm-badge--neutral {
  background: var(--color-neutral-800);
  color: var(--color-neutral-200);
}

.nm-badge__dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background: currentColor;
}

.nm-badge--pulse {
  animation: badge-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes badge-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.nm-badge--pulse .nm-badge__dot {
  animation: dot-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes dot-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.3);
    opacity: 0.7;
  }
}
</style>
