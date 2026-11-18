# syntax=docker/dockerfile:1

# ==============================================================================
# Stage 1: Install dependencies & build Vite production bundle
# ==============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --no-fund

# Build-time variables for Vite (Coolify injects Build Variables automatically)
ARG VITE_SAP_API_KEY=""
ARG VITE_SAP_API_URL="https://sapapi.red.com.sv/api"
ARG VITE_WORKFLOW_API_KEY=""
ARG VITE_WORKFLOW_API_URL="https://workflow.red.com.gt/api/integraciones/dashboard/preofertas"
ARG VITE_MARKETING_SUPABASE_URL="https://wciyhyyjdpaavbzlwikl.supabase.co"
ARG VITE_MARKETING_SUPABASE_KEY=""
ARG VITE_MARKETING_RRSS_URL="https://dashboard-marketing-ks6o.onrender.com/api/rrss/excel"
ARG VITE_FX_URL="https://excel-parser-m9q8.onrender.com/api/tipo-cambio"
ARG VITE_CLIENTES_SUPABASE_URL="https://grultaxaxbcruzoeljld.supabase.co"
ARG VITE_CLIENTES_SUPABASE_KEY=""
ARG VITE_SAC_VIVO_URL="https://erjmqjcjggxbktxcogkm.supabase.co/functions/v1/sac-vivo-publico"
ARG VITE_SAC_CORTE_URL="https://erjmqjcjggxbktxcogkm.supabase.co/functions/v1/sac-corte-publico"
ARG VITE_SAC_HIST_URL="https://erjmqjcjggxbktxcogkm.supabase.co/functions/v1/sac-historico-semanal"
ARG VITE_RRHH_VIVO_URL="https://alkaqpxcrmbzhgcwpynj.supabase.co/functions/v1/rrhh-vivo-publico"
ARG VITE_SIMS_API_BASE="https://mso-api-proxy-sims.onrender.com/api/mso"
ARG VITE_BREVO_API_KEY=""
ARG VITE_MAKE_WEBHOOK_URL="https://hook.eu2.make.com/uf2f68usry02c9ljgb8wcoy634ymbkcf"
ARG VITE_HISTORY_WEBHOOK_URL="https://hook.eu2.make.com/fa2xcbqi6a9aupb9bby5wqp5wuelk9ea"
ARG VITE_FIREBASE_API_KEY=""
ARG VITE_FIREBASE_AUTH_DOMAIN="reportes-bancarios.firebaseapp.com"
ARG VITE_FIREBASE_DATABASE_URL="https://reportes-bancarios-default-rtdb.firebaseio.com"
ARG VITE_FIREBASE_PROJECT_ID="reportes-bancarios"
ARG VITE_FIREBASE_STORAGE_BUCKET="reportes-bancarios.firebasestorage.app"
ARG VITE_FIREBASE_MESSAGING_SENDER_ID="457368392091"
ARG VITE_FIREBASE_APP_ID=""
ARG VITE_FIREBASE_MEASUREMENT_ID=""
ARG VITE_EXCHANGE_RATE_GTQ_USD="7.75"
ARG VITE_MASTER_PASSWORD=""
ARG VITE_MASTER_GT_PASSWORD=""
ARG VITE_MASTER_SV_PASSWORD=""

ENV VITE_SAP_API_KEY=$VITE_SAP_API_KEY \
    VITE_SAP_API_URL=$VITE_SAP_API_URL \
    VITE_WORKFLOW_API_KEY=$VITE_WORKFLOW_API_KEY \
    VITE_WORKFLOW_API_URL=$VITE_WORKFLOW_API_URL \
    VITE_MARKETING_SUPABASE_URL=$VITE_MARKETING_SUPABASE_URL \
    VITE_MARKETING_SUPABASE_KEY=$VITE_MARKETING_SUPABASE_KEY \
    VITE_MARKETING_RRSS_URL=$VITE_MARKETING_RRSS_URL \
    VITE_FX_URL=$VITE_FX_URL \
    VITE_CLIENTES_SUPABASE_URL=$VITE_CLIENTES_SUPABASE_URL \
    VITE_CLIENTES_SUPABASE_KEY=$VITE_CLIENTES_SUPABASE_KEY \
    VITE_SAC_VIVO_URL=$VITE_SAC_VIVO_URL \
    VITE_SAC_CORTE_URL=$VITE_SAC_CORTE_URL \
    VITE_SAC_HIST_URL=$VITE_SAC_HIST_URL \
    VITE_RRHH_VIVO_URL=$VITE_RRHH_VIVO_URL \
    VITE_SIMS_API_BASE=$VITE_SIMS_API_BASE \
    VITE_BREVO_API_KEY=$VITE_BREVO_API_KEY \
    VITE_MAKE_WEBHOOK_URL=$VITE_MAKE_WEBHOOK_URL \
    VITE_HISTORY_WEBHOOK_URL=$VITE_HISTORY_WEBHOOK_URL \
    VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN \
    VITE_FIREBASE_DATABASE_URL=$VITE_FIREBASE_DATABASE_URL \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET \
    VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID \
    VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID \
    VITE_FIREBASE_MEASUREMENT_ID=$VITE_FIREBASE_MEASUREMENT_ID \
    VITE_EXCHANGE_RATE_GTQ_USD=$VITE_EXCHANGE_RATE_GTQ_USD \
    VITE_MASTER_PASSWORD=$VITE_MASTER_PASSWORD \
    VITE_MASTER_GT_PASSWORD=$VITE_MASTER_GT_PASSWORD \
    VITE_MASTER_SV_PASSWORD=$VITE_MASTER_SV_PASSWORD

COPY . .

RUN npm run build && npm prune --omit=dev

# ==============================================================================
# Stage 2: Production runtime (Node 22 native TypeScript execution)
# ==============================================================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/server ./server
COPY --from=builder /app/server.ts ./server.ts

RUN chown -R node:node /app
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.ts"]
