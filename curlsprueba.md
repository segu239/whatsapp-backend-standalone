# Colección de CURLs de Prueba (API WhatsApp Scheduler)

Este documento reúne comandos `curl` listos para copiar y pegar y validar el funcionamiento completo del API REST.

Variables sugeridas (puedes exportarlas en tu shell para simplificar):

```bash
API_BASE="https://web-production-6e3a.up.railway.app/api/v1"
WEBHOOK_BASE="https://web-production-6e3a.up.railway.app"
API_KEY="segu239"
PHONE="+1234567890"
ANOTHER_PHONE="+10987654321"
SESSION_ID="REEMPLAZA_CON_SESSION_ID"
MESSAGE_ID="REEMPLAZA_CON_MESSAGE_ID"
```

En PowerShell (Windows):
```powershell
$API_BASE = "https://web-production-6e3a.up.railway.app/api/v1"
$WEBHOOK_BASE = "https://web-production-6e3a.up.railway.app"
$API_KEY = "segu239"
$PHONE = "+1234567890"
$ANOTHER_PHONE = "+10987654321"
$SESSION_ID = "REEMPLAZA_CON_SESSION_ID"
$MESSAGE_ID = "REEMPLAZA_CON_MESSAGE_ID"
```

> Dominio fijado a entorno Railway: `https://web-production-6e3a.up.railway.app`.
> Si migras a Render actualizar aquí.
>
> Si el servicio Wasender está deshabilitado (sin token), los endpoints relacionados fallarán pero el backend seguirá vivo.

### ⚠️ Advertencia de Seguridad
No publiques ni comprometas en repositorios públicos los valores reales de:
`WASENDER_API_TOKEN`, `CRONHOOKS_API_TOKEN`, `API_KEY`. Usa variables de entorno en CI/CD y `.env` local ignorado por git.

---
## 1. Mensajes Inmediatos

### 1.1 Texto
```bash
curl -X POST "$API_BASE/messages/send" \
  -H "X-API-Key: $API_KEY" -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "'$PHONE'",
    "messageType": "text",
    "message": "Hola mundo desde API"
  }'
```

### 1.2 Imagen
```bash
curl -X POST "$API_BASE/messages/send" \
  -H "X-API-Key: $API_KEY" -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "'$PHONE'",
    "messageType": "image",
    "imageUrl": "https://via.placeholder.com/300x200.png",
    "caption": "Imagen de prueba"
  }'
```

### 1.3 Documento
```bash
curl -X POST "$API_BASE/messages/send" \
  -H "X-API-Key: $API_KEY" -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "'$PHONE'",
    "messageType": "document",
    "documentUrl": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    "fileName": "dummy.pdf",
    "caption": "Documento demo"
  }'
```

### 1.4 Audio
```bash
curl -X POST "$API_BASE/messages/send" \
  -H "X-API-Key: $API_KEY" -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "'$PHONE'",
    "messageType": "audio",
    "audioUrl": "https://www2.cs.uic.edu/~i101/SoundFiles/StarWars3.wav"
  }'
```

### 1.5 Video
```bash
curl -X POST "$API_BASE/messages/send" \
  -H "X-API-Key: $API_KEY" -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "'$PHONE'",
    "messageType": "video",
    "videoUrl": "https://samplelib.com/lib/preview/mp4/sample-5s.mp4",
    "caption": "Video corto"
  }'
```

---
## 2. Schedules (Programaciones)

### 2.1 Crear schedule (único)
```bash
curl -X POST "$API_BASE/messages/schedule" \
  -H "X-API-Key: $API_KEY" -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "'$PHONE'",
    "message": "Recordatorio único",
    "contactName": "Contacto Demo",
    "isRecurring": false,
    "scheduledDateTime": "2025-01-01T12:00:00Z"
  }'
```

### 2.2 Crear schedule recurrente (cron cada minuto ejemplo)
```bash
curl -X POST "$API_BASE/messages/schedule-recurring" \
  -H "X-API-Key: $API_KEY" -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "'$PHONE'",
    "message": "Mensaje recurrente",
    "contactName": "Contacto Demo",
    "isRecurring": true,
    "cronExpression": "*/1 * * * *",
    "timezone": "UTC"
  }'
```

### 2.3 Listar schedules
```bash
curl -X GET "$API_BASE/messages/schedules?skip=0&limit=20" \
  -H "X-API-Key: $API_KEY"
```

### 2.4 Obtener estadísticas de schedules
```bash
curl -X GET "$API_BASE/messages/schedules/stats" \
  -H "X-API-Key: $API_KEY"
```

### 2.5 Obtener schedule por ID
```bash
curl -X GET "$API_BASE/messages/schedules/REPLACE_SCHEDULE_ID" \
  -H "X-API-Key: $API_KEY"
```

### 2.6 Actualizar schedule (ej. cambiar mensaje)
```bash
curl -X PUT "$API_BASE/messages/schedules/REPLACE_SCHEDULE_ID" \
  -H "X-API-Key: $API_KEY" -H "Content-Type: application/json" \
  -d '{
    "description": "Actualizado desde curl",
    "cronExpression": "*/5 * * * *"
  }'
```

### 2.7 Pausar schedule
```bash
curl -X POST "$API_BASE/messages/schedules/REPLACE_SCHEDULE_ID/pause" \
  -H "X-API-Key: $API_KEY"
```

### 2.8 Reanudar schedule
```bash
curl -X POST "$API_BASE/messages/schedules/REPLACE_SCHEDULE_ID/resume" \
  -H "X-API-Key: $API_KEY"
```

### 2.9 Ejecutar manualmente schedule
```bash
curl -X POST "$API_BASE/messages/schedules/REPLACE_SCHEDULE_ID/trigger" \
  -H "X-API-Key: $API_KEY"
```

### 2.10 Eliminar schedule
```bash
curl -X DELETE "$API_BASE/messages/schedules/REPLACE_SCHEDULE_ID" \
  -H "X-API-Key: $API_KEY"
```

---
## 3. Wasender (Sesiones y Mensajes)

### 3.1 Listar sesiones
```bash
curl -X GET "$API_BASE/wasender/sessions" \
  -H "X-API-Key: $API_KEY"
```

### 3.2 Obtener sesión por ID
```bash
curl -X GET "$API_BASE/wasender/sessions/$SESSION_ID" \
  -H "X-API-Key: $API_KEY"
```

### 3.3 Conectar sesión
```bash
curl -X POST "$API_BASE/wasender/sessions/$SESSION_ID/connect" \
  -H "X-API-Key: $API_KEY"
```

### 3.4 Desconectar sesión
```bash
curl -X POST "$API_BASE/wasender/sessions/$SESSION_ID/disconnect" \
  -H "X-API-Key: $API_KEY"
```

### 3.5 Crear sesión nueva
```bash
curl -X POST "$API_BASE/wasender/sessions" \
  -H "X-API-Key: $API_KEY" -H "Content-Type: application/json" \
  -d '{
    "name": "session_demo"
  }'
```

### 3.6 Actualizar sesión
```bash
curl -X PUT "$API_BASE/wasender/sessions/$SESSION_ID" \
  -H "X-API-Key: $API_KEY" -H "Content-Type: application/json" \
  -d '{
    "name": "session_actualizada"
  }'
```

### 3.7 Estado de conexión global
```bash
curl -X GET "$API_BASE/wasender/connection-status" \
  -H "X-API-Key: $API_KEY"
```

### 3.8 Información de cuenta
```bash
curl -X GET "$API_BASE/wasender/account" \
  -H "X-API-Key: $API_KEY"
```

### 3.9 Validar configuración
```bash
curl -X GET "$API_BASE/wasender/validate-config" \
  -H "X-API-Key: $API_KEY"
```

### 3.10 Estadísticas del servicio Wasender
```bash
curl -X GET "$API_BASE/wasender/stats" \
  -H "X-API-Key: $API_KEY"
```

### 3.11 Health Wasender
```bash
curl -X GET "$API_BASE/wasender/health" \
  -H "X-API-Key: $API_KEY"
```

### 3.12 Obtener información de un mensaje (Wasender)
```bash
curl -X GET "$API_BASE/wasender/messages/$MESSAGE_ID" \
  -H "X-API-Key: $API_KEY"
```

---
## 4. Webhooks (Simulación)

### 4.1 Disparo manual de webhook principal (Cronhooks simulación)
```bash
curl -X POST "$WEBHOOK_BASE/webhook/message-trigger" \
  -H "X-Webhook-Secret: REEMPLAZA_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "_cronhook_id": "demo_trigger",
    "phoneNumber": "'$PHONE'",
    "message": "Mensaje disparado desde webhook",
    "contactName": "Webhook Contact"
  }'
```

### 4.2 Webhook test
```bash
curl -X POST "$WEBHOOK_BASE/webhook/test" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Test webhook"
  }'
```

### 4.3 Webhook info
```bash
curl -X GET "$WEBHOOK_BASE/webhook/info"
```

---
## 5. Sistema y Salud

### 5.1 Health básico
```bash
curl -X GET "$WEBHOOK_BASE/healthz"
```

### 5.2 Health completo
```bash
curl -X GET "$WEBHOOK_BASE/health"
```

### 5.3 Métricas (si implementado)
```bash
curl -X GET "$WEBHOOK_BASE/metrics"
```

---
## 6. Notas Operativas

- Si recibes 401: revisa `X-API-Key`.
- Si recibes 400 en envío media: confirma que la URL es accesible y válida.
- Si Wasender está deshabilitado, los endpoints del grupo `/wasender` devolverán error controlado.
- Los horarios deben ser en UTC o asegurarte de ajustar `timezone` en recurrentes.
- Para cron: formato `m h dom mon dow`.

---
## 6.1 Pruebas Directas Wasender API (Opcional)

Usa directamente la API oficial si quieres aislar problemas del backend. Requiere `WASENDER_API_TOKEN`.

Variables rápidas:
```bash
WASENDER_API_URL="https://www.wasenderapi.com/api"
WASENDER_API_TOKEN="1072|50wGp0IwMHkjUkHg0SjJ4o69L2u7N5vOZ1dT63cV96e2c777"
PHONE="+1234567890"
```

### Crear / listar sesiones Wasender directamente
```bash
curl -X GET "$WASENDER_API_URL/whatsapp-sessions" \
  -H "Authorization: Bearer $WASENDER_API_TOKEN"
```

### Enviar mensaje texto directo (endpoint oficial /send-message)
```bash
curl -X POST "$WASENDER_API_URL/send-message" \
  -H "Authorization: Bearer $WASENDER_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "'$PHONE'",
    "text": "Prueba directa Wasender"
  }'
```

### Obtener info de mensaje directo
```bash
curl -X GET "$WASENDER_API_URL/messages/REEMPLAZA_MESSAGE_ID/info" \
  -H "Authorization: Bearer $WASENDER_API_TOKEN"
```

> Si aquí funciona pero vía backend no, revisar logs del servicio (`WasenderService`).

---
## 6.2 Pruebas Directas Cronhooks (Opcional)

Variables:
```bash
CRONHOOKS_API_URL="https://api.cronhooks.io"
CRONHOOKS_API_TOKEN="key_fabf8f07289e4161bc4ed304a4d8dc52"
```

### Listar cronhooks existentes
```bash
curl -X GET "$CRONHOOKS_API_URL/hooks" \
  -H "Authorization: Bearer $CRONHOOKS_API_TOKEN"
```

### Crear cronhook simple
```bash
curl -X POST "$CRONHOOKS_API_URL/hooks" \
  -H "Authorization: Bearer $CRONHOOKS_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "demo-backend-whatsapp",
    "schedule": "*/5 * * * *",
    "timezone": "UTC",
    "request": {
      "url": "https://web-production-6e3a.up.railway.app/webhook/message-trigger",
      "method": "POST",
      "headers": {"Content-Type": "application/json", "X-Webhook-Secret": "REEMPLAZA_WEBHOOK_SECRET"},
      "body": {
        "_cronhook_id": "demo_cronhook_external",
        "phoneNumber": "+1234567890",
        "message": "Mensaje desde Cronhooks",
        "contactName": "CronContact"
      }
    }
  }'
```

> Cronhooks enviará el POST según el schedule. Asegúrate de que el backend responde 2xx.

---
## 7. Checklist de Prueba Recomendada

1. Enviar mensaje de texto.
2. Enviar cada tipo de media.
3. Crear schedule único y verificar en listado.
4. Crear recurrente y pausar/reanudar.
5. Trigger manual.
6. Obtener stats y health.
7. Crear sesión Wasender, conectarla (si aplica) y obtener info.
8. Simular webhook.
9. Obtener info de un mensaje real (captura el ID de la respuesta de envío si Wasender devuelve ID).
10. Validar envío directo Wasender vs backend.
11. Crear un cronhook real y confirmar recepción en logs.

---
## 8. Próximos Pasos (Opcional)

- Automatizar estos curls con una colección Postman / Hoppscotch.
- Añadir scripts npm para pruebas rápidas.
- Incorporar tests de integración con jest + nock.

---
Fin del documento.
