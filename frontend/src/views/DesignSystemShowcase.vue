<script setup lang="ts">
import { ref } from 'vue'
import Card from '../components/ui/Card.vue'
import Button from '../components/ui/Button.vue'
import Badge from '../components/ui/Badge.vue'

const isLoading = ref(false)

const simulateLoading = () => {
  isLoading.value = true
  setTimeout(() => {
    isLoading.value = false
  }, 2000)
}
</script>

<template>
  <div class="showcase">
    <!-- Hero Section with Gradient Mesh -->
    <section class="hero gradient-mesh">
      <div class="hero-content">
        <h1 class="hero-title gradient-text">NorteMT Design System 2.0</h1>
        <p class="hero-subtitle">
          Design moderno, profissional e escalável para o futuro do atendimento
        </p>
        <div class="hero-actions">
          <Button variant="gradient" gradient="brand" size="lg">
            Começar Agora
          </Button>
          <Button variant="outline" size="lg">
            Documentação
          </Button>
        </div>
      </div>
    </section>

    <div class="container" style="padding: var(--space-12) var(--space-6);">
      
      <!-- Color Palette -->
      <section class="section">
        <h2 class="section-title">🎨 Paleta de Cores</h2>
        
        <div class="color-grid">
          <div class="color-item">
            <div class="color-swatch" style="background: var(--color-primary-500);" />
            <span class="color-name">Primary</span>
          </div>
          <div class="color-item">
            <div class="color-swatch" style="background: var(--color-secondary-500);" />
            <span class="color-name">Secondary</span>
          </div>
          <div class="color-item">
            <div class="color-swatch" style="background: var(--color-accent-500);" />
            <span class="color-name">Accent</span>
          </div>
          <div class="color-item">
            <div class="color-swatch" style="background: var(--color-success-500);" />
            <span class="color-name">Success</span>
          </div>
          <div class="color-item">
            <div class="color-swatch" style="background: var(--color-warning-500);" />
            <span class="color-name">Warning</span>
          </div>
          <div class="color-item">
            <div class="color-swatch" style="background: var(--color-error-500);" />
            <span class="color-name">Error</span>
          </div>
        </div>
      </section>

      <!-- Gradients -->
      <section class="section">
        <h2 class="section-title">🌈 Gradientes</h2>
        
        <div class="gradient-grid">
          <div class="gradient-item gradient-primary">
            <span>Primary</span>
          </div>
          <div class="gradient-item gradient-secondary">
            <span>Secondary</span>
          </div>
          <div class="gradient-item gradient-accent">
            <span>Accent</span>
          </div>
          <div class="gradient-item gradient-brand">
            <span>Brand</span>
          </div>
          <div class="gradient-item gradient-vibrant">
            <span>Vibrant</span>
          </div>
          <div class="gradient-item gradient-ocean">
            <span>Ocean</span>
          </div>
          <div class="gradient-item gradient-sunset">
            <span>Sunset</span>
          </div>
        </div>
      </section>

      <!-- Cards -->
      <section class="section">
        <h2 class="section-title">🎴 Cards</h2>
        
        <div class="cards-grid">
          <Card>
            <h3 style="margin-bottom: var(--space-2);">Card Padrão</h3>
            <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">
              Card básico com borda e sombra sutil
            </p>
          </Card>

          <Card variant="elevated">
            <h3 style="margin-bottom: var(--space-2);">Card Elevado</h3>
            <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">
              Card com sombra mais pronunciada
            </p>
          </Card>

          <Card variant="glass">
            <h3 style="margin-bottom: var(--space-2);">Card Glass</h3>
            <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">
              Efeito glassmorphism com blur
            </p>
          </Card>

          <Card variant="gradient" gradient="brand" hover>
            <h3 style="margin-bottom: var(--space-2); color: white;">Card Gradiente</h3>
            <p style="color: rgba(255,255,255,0.9); font-size: var(--font-size-sm);">
              Gradiente de marca com hover
            </p>
          </Card>
        </div>
      </section>

      <!-- Buttons -->
      <section class="section">
        <h2 class="section-title">🔘 Botões</h2>
        
        <div class="buttons-showcase">
          <div class="button-group">
            <h4>Variantes</h4>
            <div class="button-row">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="accent">Accent</Button>
              <Button variant="success">Success</Button>
              <Button variant="warning">Warning</Button>
              <Button variant="error">Error</Button>
            </div>
          </div>

          <div class="button-group">
            <h4>Gradientes</h4>
            <div class="button-row">
              <Button variant="gradient" gradient="primary">Primary</Button>
              <Button variant="gradient" gradient="secondary">Secondary</Button>
              <Button variant="gradient" gradient="accent">Accent</Button>
              <Button variant="gradient" gradient="brand">Brand</Button>
              <Button variant="gradient" gradient="vibrant">Vibrant</Button>
            </div>
          </div>

          <div class="button-group">
            <h4>Estilos</h4>
            <div class="button-row">
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button :loading="isLoading" @click="simulateLoading">
                {{ isLoading ? 'Carregando...' : 'Com Loading' }}
              </Button>
              <Button disabled>Disabled</Button>
            </div>
          </div>

          <div class="button-group">
            <h4>Tamanhos</h4>
            <div class="button-row">
              <Button size="sm">Pequeno</Button>
              <Button size="base">Base</Button>
              <Button size="lg">Grande</Button>
            </div>
          </div>

          <div class="button-group">
            <h4>Ícone</h4>
            <div class="button-row">
              <Button icon rounded size="sm">+</Button>
              <Button icon rounded>✓</Button>
              <Button icon rounded size="lg">❤️</Button>
            </div>
          </div>
        </div>
      </section>

      <!-- Badges -->
      <section class="section">
        <h2 class="section-title">🏷️ Badges</h2>
        
        <div class="badges-showcase">
          <div class="badge-group">
            <h4>Variantes de Cor</h4>
            <div class="badge-row">
              <Badge variant="primary">Primary</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="accent">Accent</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="error">Error</Badge>
              <Badge variant="neutral">Neutral</Badge>
            </div>
          </div>

          <div class="badge-group">
            <h4>Com Indicadores</h4>
            <div class="badge-row">
              <Badge dot variant="success">Online</Badge>
              <Badge dot variant="warning">Ausente</Badge>
              <Badge dot variant="error">Offline</Badge>
            </div>
          </div>

          <div class="badge-group">
            <h4>Com Animação Pulse</h4>
            <div class="badge-row">
              <Badge pulse dot variant="error">3 Notificações</Badge>
              <Badge pulse dot variant="success">Ativo</Badge>
              <Badge pulse variant="warning">Novo</Badge>
            </div>
          </div>

          <div class="badge-group">
            <h4>Tamanhos</h4>
            <div class="badge-row">
              <Badge size="sm">Pequeno</Badge>
              <Badge size="base">Base</Badge>
              <Badge size="lg">Grande</Badge>
            </div>
          </div>
        </div>
      </section>

      <!-- Dashboard Preview -->
      <section class="section">
        <h2 class="section-title">📊 Preview de Dashboard</h2>
        
        <div class="dashboard-preview">
          <Card variant="glass">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div>
                <p style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">
                  Total de Conversas
                </p>
                <h1 class="gradient-text" style="font-size: var(--font-size-5xl); margin: var(--space-2) 0;">
                  1,234
                </h1>
              </div>
              <Badge variant="success" dot pulse>
                +12% este mês
              </Badge>
            </div>
          </Card>

          <div class="stats-grid">
            <Card hover>
              <h4 style="color: var(--color-text-secondary); font-size: var(--font-size-sm); margin-bottom: var(--space-2);">
                Atendimentos Ativos
              </h4>
              <div style="display: flex; align-items: center; gap: var(--space-2);">
                <span style="font-size: var(--font-size-3xl); font-weight: var(--font-weight-bold); color: var(--color-primary-500);">
                  42
                </span>
                <Badge variant="primary" size="sm">Online</Badge>
              </div>
            </Card>

            <Card hover>
              <h4 style="color: var(--color-text-secondary); font-size: var(--font-size-sm); margin-bottom: var(--space-2);">
                Tempo Médio
              </h4>
              <div style="display: flex; align-items: center; gap: var(--space-2);">
                <span style="font-size: var(--font-size-3xl); font-weight: var(--font-weight-bold); color: var(--color-accent-500);">
                  3.5m
                </span>
                <Badge variant="accent" size="sm">-8%</Badge>
              </div>
            </Card>

            <Card hover>
              <h4 style="color: var(--color-text-secondary); font-size: var(--font-size-sm); margin-bottom: var(--space-2);">
                Satisfação
              </h4>
              <div style="display: flex; align-items: center; gap: var(--space-2);">
                <span style="font-size: var(--font-size-3xl); font-weight: var(--font-weight-bold); color: var(--color-success-500);">
                  98%
                </span>
                <Badge variant="success" size="sm">Excelente</Badge>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <!-- Typography -->
      <section class="section">
        <h2 class="section-title">✍️ Tipografia</h2>
        
        <Card>
          <h1>Título H1 - Display</h1>
          <h2>Título H2 - Seção</h2>
          <h3>Título H3 - Subseção</h3>
          <h4>Título H4 - Card</h4>
          <h5>Título H5 - Pequeno</h5>
          <h6>Título H6 - Menor</h6>
          <p>Parágrafo padrão com texto de exemplo. Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
          <p style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">
            Texto secundário menor para descrições e metadados.
          </p>
        </Card>
      </section>

    </div>
  </div>
</template>

<style scoped>
.showcase {
  min-height: 100vh;
  background: var(--color-background);
}

/* Hero Section */
.hero {
  position: relative;
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-12) var(--space-6);
}

.hero-content {
  text-align: center;
  max-width: 800px;
  animation: fade-in var(--duration-slow) var(--ease-out);
}

.hero-title {
  font-size: clamp(2.5rem, 8vw, 4rem);
  font-weight: var(--font-weight-extrabold);
  margin-bottom: var(--space-4);
  letter-spacing: var(--letter-spacing-tight);
}

.hero-subtitle {
  font-size: var(--font-size-xl);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-8);
  font-weight: var(--font-weight-regular);
}

.hero-actions {
  display: flex;
  gap: var(--space-4);
  justify-content: center;
  flex-wrap: wrap;
}

/* Sections */
.section {
  margin-bottom: var(--space-16);
  animation: fade-in var(--duration-normal) var(--ease-out);
}

.section-title {
  font-size: var(--font-size-3xl);
  margin-bottom: var(--space-8);
  font-weight: var(--font-weight-bold);
}

/* Color Grid */
.color-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--space-4);
}

.color-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.color-swatch {
  height: 80px;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.color-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}

/* Gradient Grid */
.gradient-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-4);
}

.gradient-item {
  height: 120px;
  border-radius: var(--radius-xl);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-lg);
  box-shadow: var(--shadow-lg);
  transition: transform var(--duration-fast) var(--ease-out);
}

.gradient-item:hover {
  transform: scale(1.05);
}

/* Cards Grid */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--space-6);
}

/* Buttons Showcase */
.buttons-showcase {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.button-group h4 {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wide);
}

.button-row {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
}

/* Badges Showcase */
.badges-showcase {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.badge-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.badge-group h4 {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wide);
}

.badge-row {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
}

/* Dashboard Preview */
.dashboard-preview {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-4);
}

/* Responsive */
@media (max-width: 768px) {
  .hero-title {
    font-size: var(--font-size-4xl);
  }
  
  .hero-subtitle {
    font-size: var(--font-size-base);
  }
  
  .button-row,
  .badge-row {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
