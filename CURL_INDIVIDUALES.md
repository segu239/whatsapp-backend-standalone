# 🧪 cURLs Individuales - Copy/Paste Ready

**URL Base**: `https://web-production-6e3a.up.railway.app`

---

## 📋 **HEALTH CHECKS (Sin autenticación)**

### 1. Basic Health Check
```bash
curl "https://web-production-6e3a.up.railway.app/healthz"
```

### 2. Complete Health Check
```bash
curl "https://web-production-6e3a.up.railway.app/health"
```

### 3. Service Info
```bash
curl "https://web-production-6e3a.up.railway.app/"
```

### 4. API Documentation
```bash
curl "https://web-production-6e3a.up.railway.app/docs"
```

### 5. Metrics
```bash
curl "https://web-production-6e3a.up.railway.app/metrics"
```

---

## 🔐 **WASENDER (Requieren API Key)**

⚠️ **IMPORTANTE**: Reemplaza `TU_API_KEY` con tu API key real

### 6. Wasender Health
```bash
curl -H "X-API-Key: TU_API_KEY" "https://web-production-6e3a.up.railway.app/api/v1/wasender/health"
```

### 7. Account Info
```bash
curl -H "X-API-Key: TU_API_KEY" "https://web-production-6e3a.up.railway.app/api/v1/wasender/account"
```

### 8. Wasender Stats
```bash
curl -H "X-API-Key: TU_API_KEY" "https://web-production-6e3a.up.railway.app/api/v1/wasender/stats"
```

### 9. Validate Config
```bash
curl -H "X-API-Key: TU_API_KEY" "https://web-production-6e3a.up.railway.app/api/v1/wasender/validate-config"
```

### 10. Connection Status
```bash
curl -H "X-API-Key: TU_API_KEY" "https://web-production-6e3a.up.railway.app/api/v1/wasender/connection-status"
```

### 11. Get Sessions
```bash
curl -H "X-API-Key: TU_API_KEY" "https://web-production-6e3a.up.railway.app/api/v1/wasender/sessions"
```

---

## 📱 **MENSAJES**

### 12. Send Text Message
```bash
curl -X POST -H "X-API-Key: TU_API_KEY" -H "Content-Type: application/json" \
  -d '{"phoneNumber":"+573001234567","messageType":"text","message":"Test from cURL"}' \
  "https://web-production-6e3a.up.railway.app/api/v1/messages/send"
```

### 13. Send Image Message
```bash
curl -X POST -H "X-API-Key: TU_API_KEY" -H "Content-Type: application/json" \
  -d '{"phoneNumber":"+573001234567","messageType":"image","imageUrl":"https://picsum.photos/400/300","caption":"Test image"}' \
  "https://web-production-6e3a.up.railway.app/api/v1/messages/send"
```

---

## 📅 **PROGRAMACIONES**

### 14. Schedule Message
```bash
curl -X POST -H "X-API-Key: TU_API_KEY" -H "Content-Type: application/json" \
  -d '{"phoneNumber":"+573001234567","message":"Scheduled message","contactName":"Test","isRecurring":false,"scheduledDateTime":"2024-12-21T15:30:00.000Z"}' \
  "https://web-production-6e3a.up.railway.app/api/v1/messages/schedule"
```

### 15. Schedule Recurring Message
```bash
curl -X POST -H "X-API-Key: TU_API_KEY" -H "Content-Type: application/json" \
  -d '{"phoneNumber":"+573001234567","message":"Daily message","contactName":"Daily Test","isRecurring":true,"cronExpression":"0 9 * * *","timezone":"America/Bogota"}' \
  "https://web-production-6e3a.up.railway.app/api/v1/messages/schedule-recurring"
```

### 16. Get All Schedules
```bash
curl -H "X-API-Key: TU_API_KEY" "https://web-production-6e3a.up.railway.app/api/v1/messages/schedules"
```

### 17. Get Schedules with Pagination
```bash
curl -H "X-API-Key: TU_API_KEY" "https://web-production-6e3a.up.railway.app/api/v1/messages/schedules?page=1&limit=5"
```

### 18. Get Schedule Stats
```bash
curl -H "X-API-Key: TU_API_KEY" "https://web-production-6e3a.up.railway.app/api/v1/messages/schedules/stats"
```

---

## 🪝 **WEBHOOKS**

### 19. Webhook Health
```bash
curl "https://web-production-6e3a.up.railway.app/webhook/health"
```

### 20. Webhook Info
```bash
curl "https://web-production-6e3a.up.railway.app/webhook/info"
```

### 21. Webhook Stats
```bash
curl "https://web-production-6e3a.up.railway.app/webhook/stats"
```

### 22. Webhook Root
```bash
curl "https://web-production-6e3a.up.railway.app/webhook/"
```

### 23. Test Webhook
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"test":true,"message":"Test webhook"}' \
  "https://web-production-6e3a.up.railway.app/webhook/test"
```

---

## 🔧 **SESIONES**

### 24. Create Session
```bash
curl -X POST -H "X-API-Key: TU_API_KEY" -H "Content-Type: application/json" \
  -d '{"sessionName":"test-session","phoneNumber":"+573001234567","webhook":"https://web-production-6e3a.up.railway.app/webhook/message-trigger"}' \
  "https://web-production-6e3a.up.railway.app/api/v1/wasender/sessions"
```

---

## 🚀 **TESTS RÁPIDOS**

### Test 1: Health básico
```bash
curl "https://web-production-6e3a.up.railway.app/health" | jq '.data.status'
```

### Test 2: Verificar API key funciona
```bash
curl -H "X-API-Key: TU_API_KEY" "https://web-production-6e3a.up.railway.app/api/v1/wasender/health" | jq '.success'
```

### Test 3: Ver si Wasender está configurado
```bash
curl -H "X-API-Key: TU_API_KEY" "https://web-production-6e3a.up.railway.app/api/v1/wasender/validate-config" | jq '.data'
```

---

## ⚠️ **ANTES DE PROBAR:**

1. **Configura API_KEY** en Railway:
   - Ve a Railway Dashboard → Variables
   - Agrega: `API_KEY=tu-valor-aquí`

2. **Reemplaza en los cURLs**:
   - `TU_API_KEY` → tu API key real
   - `+573001234567` → tu número de teléfono real

3. **Verifica tokens externos**:
   - `WASENDER_API_TOKEN=1072|50wGp0IwMHkjUkHg0SjJ4o69L2u7N5vOZ1dT63cV96e2c777`
   - `CRONHOOKS_API_TOKEN=key_fabf8f07289e4161bc4ed304a4d8dc52`

## 📊 **Respuestas esperadas:**

- **200** ✅ = Funciona
- **401** ❌ = API key faltante/incorrecta
- **503** ❌ = Servicios externos no configurados
- **400** ❌ = Datos de request inválidos

¡Empieza con los health checks (#1-5) y luego prueba con API key! 🚀