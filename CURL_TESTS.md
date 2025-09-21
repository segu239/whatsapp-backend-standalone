# 🧪 cURL Tests para WhatsApp Backend

## 🔧 Variables de entorno (configurar primero)
```bash
export API_URL="https://web-production-6e3a.up.railway.app"
export API_KEY="tu-api-key-principal"
export PHONE_NUMBER="+573001234567"  # Cambia por tu número real
```

---

## 📋 **1. HEALTH CHECKS (Sin autenticación)**

### Basic Health Check
```bash
curl -X GET "$API_URL/healthz" \
  -H "Content-Type: application/json"
```

### Complete Health Check
```bash
curl -X GET "$API_URL/health" \
  -H "Content-Type: application/json"
```

### Service Info
```bash
curl -X GET "$API_URL/" \
  -H "Content-Type: application/json"
```

### API Documentation
```bash
curl -X GET "$API_URL/docs" \
  -H "Content-Type: application/json"
```

### Metrics
```bash
curl -X GET "$API_URL/metrics" \
  -H "Content-Type: application/json"
```

---

## 🔐 **2. WASENDER TESTS (Requieren API Key)**

### Wasender Health
```bash
curl -X GET "$API_URL/api/v1/wasender/health" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json"
```

### Account Info
```bash
curl -X GET "$API_URL/api/v1/wasender/account" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json"
```

### Wasender Stats
```bash
curl -X GET "$API_URL/api/v1/wasender/stats" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json"
```

### Validate Config
```bash
curl -X GET "$API_URL/api/v1/wasender/validate-config" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json"
```

### Connection Status
```bash
curl -X GET "$API_URL/api/v1/wasender/connection-status" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json"
```

### Get Sessions
```bash
curl -X GET "$API_URL/api/v1/wasender/sessions" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json"
```

---

## 📱 **3. MESSAGE TESTS**

### Send Immediate Text Message
```bash
curl -X POST "$API_URL/api/v1/messages/send" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "'$PHONE_NUMBER'",
    "messageType": "text",
    "message": "🧪 Test message from cURL at '$(date)'"
  }'
```

### Send Message with Image
```bash
curl -X POST "$API_URL/api/v1/messages/send" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "'$PHONE_NUMBER'",
    "messageType": "image",
    "imageUrl": "https://picsum.photos/400/300",
    "caption": "Test image from cURL"
  }'
```

---

## 📅 **4. SCHEDULE TESTS**

### Schedule Message (5 minutes from now)
```bash
SCHEDULE_TIME=$(date -u -d '+5 minutes' +"%Y-%m-%dT%H:%M:%S.000Z")
curl -X POST "$API_URL/api/v1/messages/schedule" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "'$PHONE_NUMBER'",
    "message": "📅 Scheduled test message from cURL",
    "contactName": "Test Contact",
    "isRecurring": false,
    "scheduledDateTime": "'$SCHEDULE_TIME'"
  }'
```

### Schedule Recurring Message (daily)
```bash
curl -X POST "$API_URL/api/v1/messages/schedule-recurring" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "'$PHONE_NUMBER'",
    "message": "🔄 Daily test message from cURL",
    "contactName": "Recurring Test",
    "isRecurring": true,
    "cronExpression": "0 9 * * *",
    "timezone": "America/Bogota"
  }'
```

### Get All Schedules
```bash
curl -X GET "$API_URL/api/v1/messages/schedules" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json"
```

### Get Schedules with Pagination
```bash
curl -X GET "$API_URL/api/v1/messages/schedules?page=1&limit=10" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json"
```

### Get Schedule Stats
```bash
curl -X GET "$API_URL/api/v1/messages/schedules/stats" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json"
```

### Get Specific Schedule (replace SCHEDULE_ID)
```bash
SCHEDULE_ID="replace-with-real-id"
curl -X GET "$API_URL/api/v1/messages/schedules/$SCHEDULE_ID" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json"
```

### Pause Schedule
```bash
SCHEDULE_ID="replace-with-real-id"
curl -X POST "$API_URL/api/v1/messages/schedules/$SCHEDULE_ID/pause" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json"
```

### Resume Schedule
```bash
SCHEDULE_ID="replace-with-real-id"
curl -X POST "$API_URL/api/v1/messages/schedules/$SCHEDULE_ID/resume" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json"
```

### Trigger Schedule Manually
```bash
SCHEDULE_ID="replace-with-real-id"
curl -X POST "$API_URL/api/v1/messages/schedules/$SCHEDULE_ID/trigger" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json"
```

### Delete Schedule
```bash
SCHEDULE_ID="replace-with-real-id"
curl -X DELETE "$API_URL/api/v1/messages/schedules/$SCHEDULE_ID" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json"
```

---

## 🪝 **5. WEBHOOK TESTS**

### Webhook Health
```bash
curl -X GET "$API_URL/webhook/health" \
  -H "Content-Type: application/json"
```

### Webhook Info
```bash
curl -X GET "$API_URL/webhook/info" \
  -H "Content-Type: application/json"
```

### Webhook Stats
```bash
curl -X GET "$API_URL/webhook/stats" \
  -H "Content-Type: application/json"
```

### Test Webhook
```bash
curl -X POST "$API_URL/webhook/test" \
  -H "Content-Type: application/json" \
  -d '{
    "test": true,
    "message": "Test webhook call from cURL"
  }'
```

---

## 🔧 **6. SESIONES WASENDER**

### Create New Session
```bash
curl -X POST "$API_URL/api/v1/wasender/sessions" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionName": "test-session-curl",
    "phoneNumber": "'$PHONE_NUMBER'",
    "webhook": "'$API_URL'/webhook/message-trigger"
  }'
```

### Get Session Info
```bash
SESSION_ID="replace-with-session-id"
curl -X GET "$API_URL/api/v1/wasender/sessions/$SESSION_ID" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json"
```

### Connect Session
```bash
SESSION_ID="replace-with-session-id"
curl -X POST "$API_URL/api/v1/wasender/sessions/$SESSION_ID/connect" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json"
```

---

## 🧪 **7. QUICK TEST SCRIPT**

Crea un script bash para probar todo rápidamente:

```bash
#!/bin/bash
# test-backend.sh

# Configuración
export API_URL="https://web-production-6e3a.up.railway.app"
export API_KEY="tu-api-key-principal"
export PHONE_NUMBER="+573001234567"

echo "🧪 Testing WhatsApp Backend..."

echo "1. Health Check:"
curl -s "$API_URL/health" | jq '.data.status' 2>/dev/null || echo "❌ Health check failed"

echo "2. Wasender Health:"
curl -s -H "X-API-Key: $API_KEY" "$API_URL/api/v1/wasender/health" | jq '.data.status' 2>/dev/null || echo "❌ Wasender health failed"

echo "3. Wasender Account:"
curl -s -H "X-API-Key: $API_KEY" "$API_URL/api/v1/wasender/account" | jq '.success' 2>/dev/null || echo "❌ Account check failed"

echo "4. Send Test Message:"
curl -s -X POST -H "X-API-Key: $API_KEY" -H "Content-Type: application/json" \
  -d '{"phoneNumber":"'$PHONE_NUMBER'","messageType":"text","message":"Test from script"}' \
  "$API_URL/api/v1/messages/send" | jq '.success' 2>/dev/null || echo "❌ Message send failed"

echo "5. Get Schedules:"
curl -s -H "X-API-Key: $API_KEY" "$API_URL/api/v1/messages/schedules" | jq '.success' 2>/dev/null || echo "❌ Schedules failed"

echo "✅ Test completed!"
```

---

## 📊 **Códigos de respuesta esperados:**

- **200** ✅ - Success
- **201** ✅ - Created (schedules)
- **400** ❌ - Bad Request (datos inválidos)
- **401** ❌ - Unauthorized (API key incorrecta/faltante)
- **404** ❌ - Not Found (endpoint/recurso no existe)
- **500** ❌ - Internal Server Error
- **503** ❌ - Service Unavailable (servicios externos fallan)

## 🔍 **Troubleshooting:**

### Error 401 - Unauthorized:
```bash
# Verificar que tienes el API_KEY correcto
echo "API_KEY actual: $API_KEY"
```

### Error 503 - Service Unavailable:
```bash
# Verificar tokens de servicios externos
curl -s -H "X-API-Key: $API_KEY" "$API_URL/api/v1/wasender/validate-config"
```

### Ver logs detallados:
```bash
# Agregar -v para ver headers y debugging
curl -v -X GET "$API_URL/health"
```

¡Usa estos cURLs para probar tu backend de forma rápida y completa! 🚀