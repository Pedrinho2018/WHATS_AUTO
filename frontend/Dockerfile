# ═══════════════════════════════════════════════════════════════
# Frontend Dockerfile - Norte MT Sistemas
# Vue.js 3 + Tailwind CSS + Vite
# ═══════════════════════════════════════════════════════════════

# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Instala dependências
COPY package*.json ./
RUN npm install

# Copia código fonte
COPY . .

# Build de produção
RUN npm run build

# ═══════════════════════════════════════════════════════════════
# Production Image - Nginx
# ═══════════════════════════════════════════════════════════════

FROM nginx:alpine

# Copia arquivos buildados
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia configuração do nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.d/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh

# Permissões
RUN chmod +x /docker-entrypoint.d/40-runtime-config.sh && \
    chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:80 || exit 1

CMD ["nginx", "-g", "daemon off;"]
