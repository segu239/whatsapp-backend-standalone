# 🚀 Guía de Deployment en Railway

Este documento contiene las instrucciones para desplegar el WhatsApp Scheduler Backend en Railway.

## ✅ Estado Actual del Proyecto

El proyecto ya está **completamente configurado** para Railway con:

- ✅ **railway.json** - Configuración principal de Railway
- ✅ **railway.toml** - Configuración alternativa con nixpacks
- ✅ **Procfile** - Comando de inicio para Railway
- ✅ **nixpacks.toml** - Configuración del builder Nixpacks
- ✅ **package.json** - Scripts optimizados para deployment
- ✅ **.env.example** - Documentación de variables de entorno

## 🔧 Pasos para Deployment

### 1. Preparar el Proyecto Localmente

```bash
# Verificar que compila correctamente
npm run build

# Verificar que arranca sin errores
npm start
```

### 2. Configurar Railway CLI (Opcional)

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login en Railway
railway login

# Conectar proyecto existente o crear uno nuevo
railway init
```

### 3. Deployment via GitHub (Recomendado)

1. **Push a GitHub**: Sube tu código a un repositorio de GitHub
2. **Conectar en Railway**:
   - Ve a [railway.app](https://railway.app)
   - Crea un nuevo proyecto
   - Conecta tu repositorio de GitHub
   - Railway detectará automáticamente la configuración

### 4. Deployment via Railway CLI

```bash
# Deploy directo desde terminal
railway up

# O especificar servicio
railway up --service backend
```

## 🔐 Variables de Entorno Requeridas

Configura estas variables en Railway Dashboard > Variables:

### Variables Obligatorias
```env
NODE_ENV=production
PORT=3000
WASENDER_API_TOKEN=tu-token-wasender
CRONHOOKS_API_TOKEN=tu-token-cronhooks
API_KEY=tu-api-key-principal
WEBHOOK_BASE_URL=https://tu-app.railway.app
```

### Variables Opcionales
```env
CORS_ORIGIN=https://tu-frontend.com
WEBHOOK_SECRET=tu-webhook-secret
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000
```

### Variables de Notificaciones (Opcionales)
```env
# Email
EMAIL_NOTIFICATIONS_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=tu-app-password

# Slack
SLACK_NOTIFICATIONS_ENABLED=true
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

## 📋 Configuración Automática

Railway utilizará automáticamente:

- **Builder**: Nixpacks (Node.js 18.x)
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Health Check**: `/health`
- **Port**: Variable `PORT` (asignado automáticamente por Railway)

## 🔍 Verificación Post-Deployment

Una vez desplegado, verifica:

1. **Health Check**: `https://tu-app.railway.app/health`
2. **API Status**: `https://tu-app.railway.app/api/status`
3. **Webhook Info**: `https://tu-app.railway.app/webhook/info`

## 🛠️ Troubleshooting

### Error de Build
```bash
# Verificar localmente
npm run build
npm start
```

### Error de Variables de Entorno
- Verifica que todas las variables obligatorias están configuradas
- Revisa el archivo `.env.example` para referencia

### Error de Health Check
- El endpoint `/health` debe responder con código 200
- Verifica que el puerto esté configurado correctamente

### Logs en Railway
```bash
# Ver logs en tiempo real
railway logs

# Ver logs de deployment
railway logs --deployment
```

## 🔄 Actualizaciones

Para actualizar el deployment:

1. **Via GitHub**: Push a la rama conectada
2. **Via CLI**: `railway up`

Railway rebuildeará y desplegará automáticamente.

## 📚 Recursos Adicionales

- [Railway Documentation](https://docs.railway.app/)
- [Nixpacks Documentation](https://nixpacks.com/)
- [Node.js Deployment Guide](https://docs.railway.app/deploy/deployments)

## 🆘 Soporte

Si encuentras problemas:

1. Revisa los logs: `railway logs`
2. Verifica las variables de entorno
3. Confirma que el health check funciona localmente
4. Consulta la documentación de Railway

---

**✨ El proyecto está listo para deployment en Railway!**