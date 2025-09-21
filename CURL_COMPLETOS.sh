#!/bin/bash
# 🧪 cURLs COMPLETOS para WhatsApp Backend
# URL: https://web-production-6e3a.up.railway.app

echo "🧪 Testing WhatsApp Backend - https://web-production-6e3a.up.railway.app"
echo "=================================================="

# ⚠️ NECESITAS CONFIGURAR ESTO:
API_KEY="PENDIENTE_CONFIGURAR"  # ← CAMBIAR POR TU API_KEY REAL
PHONE_NUMBER="+573001234567"    # ← CAMBIAR POR TU NÚMERO REAL

echo "⚠️  IMPORTANTE: Configura API_KEY y PHONE_NUMBER antes de ejecutar"
echo "API_KEY actual: $API_KEY"
echo "PHONE_NUMBER: $PHONE_NUMBER"
echo ""

# =============================================================================
# 1. HEALTH CHECKS (Sin autenticación)
# =============================================================================

echo "📋 1. HEALTH CHECKS (Sin autenticación)"
echo "----------------------------------------"

echo "1.1 Basic Health Check:"
curl -X GET "https://web-production-6e3a.up.railway.app/healthz" \
  -H "Content-Type: application/json"
echo -e "\n"

echo "1.2 Complete Health Check:"
curl -X GET "https://web-production-6e3a.up.railway.app/health" \
  -H "Content-Type: application/json"
echo -e "\n"

echo "1.3 Service Info:"
curl -X GET "https://web-production-6e3a.up.railway.app/" \
  -H "Content-Type: application/json"
echo -e "\n"

echo "1.4 API Documentation:"
curl -X GET "https://web-production-6e3a.up.railway.app/docs" \
  -H "Content-Type: application/json"
echo -e "\n"

echo "1.5 Metrics:"
curl -X GET "https://web-production-6e3a.up.railway.app/metrics" \
  -H "Content-Type: application/json"
echo -e "\n"

# =============================================================================
# 2. WASENDER TESTS (Requieren API Key)
# =============================================================================

echo "🔐 2. WASENDER TESTS (Requieren API Key)"
echo "----------------------------------------"

echo "2.1 Wasender Health:"
curl -X GET "https://web-production-6e3a.up.railway.app/api/v1/wasender/health" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json"
echo -e "\n"

echo "2.2 Account Info:"
curl -X GET "https://web-production-6e3a.up.railway.app/api/v1/wasender/account" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json"
echo -e "\n"

echo "2.3 Wasender Stats:"
curl -X GET "https://web-production-6e3a.up.railway.app/api/v1/wasender/stats" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json"
echo -e "\n"

echo "2.4 Validate Config:"
curl -X GET "https://web-production-6e3a.up.railway.app/api/v1/wasender/validate-config" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json"
echo -e "\n"

echo "2.5 Connection Status:"
curl -X GET "https://web-production-6e3a.up.railway.app/api/v1/wasender/connection-status" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json"
echo -e "\n"

echo "2.6 Get Sessions:"
curl -X GET "https://web-production-6e3a.up.railway.app/api/v1/wasender/sessions" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json"
echo -e "\n"

# =============================================================================
# 3. MESSAGE TESTS
# =============================================================================

echo "📱 3. MESSAGE TESTS"
echo "-------------------"

echo "3.1 Send Immediate Text Message:"
curl -X POST "https://web-production-6e3a.up.railway.app/api/v1/messages/send" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "'$PHONE_NUMBER'",
    "messageType": "text",
    "message": "🧪 Test message from cURL at '$(date)'"
  }'
echo -e "\n"

echo "3.2 Send Message with Image:"
curl -X POST "https://web-production-6e3a.up.railway.app/api/v1/messages/send" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "'$PHONE_NUMBER'",
    "messageType": "image",
    "imageUrl": "https://picsum.photos/400/300",
    "caption": "Test image from cURL"
  }'
echo -e "\n"

# =============================================================================
# 4. SCHEDULE TESTS
# =============================================================================

echo "📅 4. SCHEDULE TESTS"
echo "--------------------"

SCHEDULE_TIME=$(date -u -d '+5 minutes' +"%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null || date -u -v+5M +"%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null || echo "2024-12-21T10:30:00.000Z")

echo "4.1 Schedule Message (5 minutes from now):"
curl -X POST "https://web-production-6e3a.up.railway.app/api/v1/messages/schedule" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "'$PHONE_NUMBER'",
    "message": "📅 Scheduled test message from cURL",
    "contactName": "Test Contact",
    "isRecurring": false,
    "scheduledDateTime": "'$SCHEDULE_TIME'"
  }'
echo -e "\n"

echo "4.2 Schedule Recurring Message (daily):"
curl -X POST "https://web-production-6e3a.up.railway.app/api/v1/messages/schedule-recurring" \
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
echo -e "\n"

echo "4.3 Get All Schedules:"
curl -X GET "https://web-production-6e3a.up.railway.app/api/v1/messages/schedules" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json"
echo -e "\n"

echo "4.4 Get Schedules with Pagination:"
curl -X GET "https://web-production-6e3a.up.railway.app/api/v1/messages/schedules?page=1&limit=10" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json"
echo -e "\n"

echo "4.5 Get Schedule Stats:"
curl -X GET "https://web-production-6e3a.up.railway.app/api/v1/messages/schedules/stats" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json"
echo -e "\n"

# =============================================================================
# 5. WEBHOOK TESTS
# =============================================================================

echo "🪝 5. WEBHOOK TESTS"
echo "-------------------"

echo "5.1 Webhook Health:"
curl -X GET "https://web-production-6e3a.up.railway.app/webhook/health" \
  -H "Content-Type: application/json"
echo -e "\n"

echo "5.2 Webhook Info:"
curl -X GET "https://web-production-6e3a.up.railway.app/webhook/info" \
  -H "Content-Type: application/json"
echo -e "\n"

echo "5.3 Webhook Stats:"
curl -X GET "https://web-production-6e3a.up.railway.app/webhook/stats" \
  -H "Content-Type: application/json"
echo -e "\n"

echo "5.4 Webhook Root:"
curl -X GET "https://web-production-6e3a.up.railway.app/webhook/" \
  -H "Content-Type: application/json"
echo -e "\n"

echo "5.5 Test Webhook:"
curl -X POST "https://web-production-6e3a.up.railway.app/webhook/test" \
  -H "Content-Type: application/json" \
  -d '{
    "test": true,
    "message": "Test webhook call from cURL"
  }'
echo -e "\n"

# =============================================================================
# 6. SESIONES WASENDER
# =============================================================================

echo "🔧 6. SESIONES WASENDER"
echo "------------------------"

echo "6.1 Create New Session:"
curl -X POST "https://web-production-6e3a.up.railway.app/api/v1/wasender/sessions" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionName": "test-session-curl",
    "phoneNumber": "'$PHONE_NUMBER'",
    "webhook": "https://web-production-6e3a.up.railway.app/webhook/message-trigger"
  }'
echo -e "\n"

# =============================================================================
# RESUMEN FINAL
# =============================================================================

echo "✅ TESTING COMPLETADO"
echo "====================="
echo "Si ves errores 401, configura tu API_KEY en Railway y actualiza la variable API_KEY en este script"
echo "Si ves errores 503, verifica que WASENDER_API_TOKEN y CRONHOOKS_API_TOKEN estén configurados"
echo ""
echo "Variables de entorno necesarias en Railway:"
echo "- API_KEY=tu-api-key-principal"
echo "- WASENDER_API_TOKEN=1072|50wGp0IwMHkjUkHg0SjJ4o69L2u7N5vOZ1dT63cV96e2c777"
echo "- CRONHOOKS_API_TOKEN=key_fabf8f07289e4161bc4ed304a4d8dc52"
echo "- NODE_ENV=production"
echo "- PORT=3000"
echo "- FAST_START=true"