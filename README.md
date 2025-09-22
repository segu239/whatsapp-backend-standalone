# WhatsApp Scheduler Backend

Backend API for WhatsApp message scheduling with Wasender and Cronhooks integration.

## Features

- **Message Sending**: Immediate WhatsApp message delivery via Wasender API
- **Message Scheduling**: One-time and recurring message scheduling via Cronhooks
- **Session Management**: WhatsApp session management and monitoring
- **Webhook Integration**: Receive and process Cronhooks triggers
- **Robust Error Handling**: Comprehensive error handling and retry logic
- **Logging & Monitoring**: Structured logging with Winston
- **Security**: API key authentication and webhook secret validation
- **Rate Limiting**: Built-in rate limiting protection
- **Health Checks**: Comprehensive health monitoring endpoints

## Tech Stack

- **Node.js** + **TypeScript**
- **Express.js** - Web framework
- **Axios** - HTTP client for external APIs
- **Winston** - Logging
- **Joi** - Request validation
- **Helmet** - Security middleware
- **CORS** - Cross-origin resource sharing

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

4. Configure environment variables in `.env`:
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:8100

   # Wasender API Configuration
   WASENDER_API_URL=https://www.wasenderapi.com/api
   WASENDER_API_TOKEN=your_wasender_token_here

   # Cronhooks API Configuration
   CRONHOOKS_API_URL=https://api.cronhooks.io
   CRONHOOKS_API_TOKEN=your_cronhooks_token_here

   # Webhook Configuration
   WEBHOOK_SECRET=your_webhook_secret_here
   WEBHOOK_BASE_URL=https://your-backend.railway.app

   # Security
   API_KEY=your_api_key_for_frontend_access
   ```

## Development

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test

# Lint code
npm run lint
```

## API Endpoints

### Authentication

All API endpoints require an API key sent via the `X-API-Key` header.

### Messages

- `POST /api/v1/messages/send` - Send immediate message
- `POST /api/v1/messages/schedule` - Schedule one-time message
- `POST /api/v1/messages/schedule-recurring` - Schedule recurring message
- `GET /api/v1/messages/schedules` - List all schedules
- `GET /api/v1/messages/schedules/:id` - Get specific schedule
- `PUT /api/v1/messages/schedules/:id` - Update schedule
- `DELETE /api/v1/messages/schedules/:id` - Delete schedule
- `POST /api/v1/messages/schedules/:id/pause` - Pause schedule
- `POST /api/v1/messages/schedules/:id/resume` - Resume schedule
- `POST /api/v1/messages/schedules/:id/trigger` - Trigger schedule manually

### WhatsApp Sessions

- `GET /api/v1/wasender/sessions` - Get all sessions
- `GET /api/v1/wasender/sessions/:id` - Get session info
- `POST /api/v1/wasender/sessions/:id/connect` - Connect session
- `POST /api/v1/wasender/sessions/:id/disconnect` - Disconnect session
- `POST /api/v1/wasender/sessions` - Create new session
- `PUT /api/v1/wasender/sessions/:id` - Update session
- `GET /api/v1/wasender/connection-status` - Check connection status
- `GET /api/v1/wasender/account` - Get account info
- `GET /api/v1/wasender/messages/:id` - Get Wasender message info

### Webhooks

- `POST /webhook/message-trigger` - Main webhook for Cronhooks triggers
- `POST /webhook/test` - Test webhook
- `GET /webhook/info` - Webhook documentation

### System

- `GET /health` - Health check
- `GET /metrics` - System metrics
- `GET /docs` - API documentation

## Webhook Configuration

Configure the following URL in Cronhooks for message triggers:

```
URL: https://your-backend.railway.app/webhook/message-trigger
Method: POST
Headers:
  - Content-Type: application/json
  - X-Webhook-Secret: your_webhook_secret
```

## Example Usage

### Send Immediate Message

```bash
curl -X POST https://your-backend.railway.app/api/v1/messages/send \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "messageType": "text",
    "message": "Hello World!"
  }'
```

### Send Image Message

```bash
curl -X POST https://your-backend.railway.app/api/v1/messages/send \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "messageType": "image",
    "imageUrl": "https://example.com/image.jpg",
    "caption": "Optional caption"
  }'
```

### Send Document Message

```bash
curl -X POST https://your-backend.railway.app/api/v1/messages/send \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "messageType": "document",
    "documentUrl": "https://example.com/file.pdf",
    "fileName": "file.pdf",
    "caption": "Optional caption"
  }'
```

### Send Audio Message

```bash
curl -X POST https://your-backend.railway.app/api/v1/messages/send \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "messageType": "audio",
    "audioUrl": "https://example.com/audio.mp3"
  }'
```

### Send Video Message

```bash
curl -X POST https://your-backend.railway.app/api/v1/messages/send \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "messageType": "video",
    "videoUrl": "https://example.com/video.mp4",
    "caption": "Optional caption"
  }'
```

### Schedule Message

```bash
curl -X POST https://your-backend.railway.app/api/v1/messages/schedule \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "message": "Scheduled message",
    "contactName": "John Doe",
    "isRecurring": false,
    "scheduledDateTime": "2024-01-01T12:00:00Z"
  }'
```

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "requestId": "req_123456789"
}
```

## Monitoring

- Health check: `GET /health`
- Metrics: `GET /metrics`
- Logs are structured and include request IDs for tracing

## Security

- API key authentication for all API endpoints
- Webhook secret validation for webhook endpoints
- Rate limiting (100 requests per 15 minutes by default)
- CORS protection
- Security headers via Helmet
- Input validation via Joi schemas

## Deployment (Render)

Render es ahora la plataforma recomendada para este proyecto. Se incluye `render.yaml` para desplegar como Blueprint.

Steps:
1. Push the repo to GitHub.
2. Go to https://dashboard.render.com -> New + -> Blueprint -> select your repo.
3. Render will detect `render.yaml` and create a Web Service.
4. Confirm the following detected settings:
  - Build Command: `npm install && npm run build`
  - Start Command: `node dist/app.js`
  - Health Check Path: `/healthz`
5. Add environment variables (Settings -> Environment):
  - `WASENDER_API_TOKEN` (required for Wasender)
  - `CRONHOOKS_API_TOKEN` (required for Cronhooks)
  - `API_KEY` (optional for your frontend)
  - `CORS_ORIGIN` (comma separated origins)
  - `WEBHOOK_BASE_URL` (the public Render URL once deployed)
  - `FAST_START=true` (already default in render.yaml but can override)
6. Deploy.

Health Endpoints:
```
/healthz  -> liveness (returns OK even if external services disabled)
/health   -> full health (reports degraded if tokens missing)
```

Blueprint File Overview (`render.yaml`):
```yaml
services:
  - type: web
   name: whatsapp-scheduler-backend
   env: node
   buildCommand: npm install && npm run build
   startCommand: node dist/app.js
   healthCheckPath: /healthz
```

After first deploy, set `WEBHOOK_BASE_URL` to the assigned public URL and trigger a redeploy so Cronhooks schedules point correctly.

### Variables de Entorno (Resumen)
| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| WASENDER_API_TOKEN | Sí* | Token Wasender (si no se provee, servicio queda disabled) |
| CRONHOOKS_API_TOKEN | Sí* | Token Cronhooks (si no se provee, servicio queda disabled) |
| API_KEY | Recomendado | API key para llamadas desde frontend (stats de auth) |
| CORS_ORIGIN | Recomendado | Lista de orígenes permitidos separados por coma |
| WEBHOOK_BASE_URL | Recomendado | URL pública base para construir webhooks |
| FAST_START | Opcional (default true) | Arranca antes de validar servicios externos |
| LOG_LEVEL | Opcional | Nivel de log (info, debug, warn) |

*Sin los tokens la app sigue viva pero `/health` mostrará estado degraded y endpoints Wasender/Cronhooks fallarán.

### Estado de Salud
| Endpoint | Propósito |
|----------|----------|
| /healthz | Liveness simple (Render healthcheck) |
| /health  | Estado completo (verifica servicios externos) |

### Troubleshooting Rápido
- Build falla: revisa logs por error de TypeScript; ejecuta local `npm run build`.
- 404 /healthz: asegúrate de usar la última versión con endpoint implementado.
- Degraded permanente: verifica tokens y conectividad externa (firewall/región).
- Timeout en cronhooks/wasender: aumentar `DEFAULT_TIMEOUT_MS` si es necesario.

### Notas sobre Railway (Histórico)
Anteriormente se usaba Railway; se removieron archivos de configuración (`railway.toml`, `nixpacks.toml`). Puedes consultar commits previos si deseas restaurar soporte.

Troubleshooting on Render:
- Stuck in “Starting”: check logs for build errors or missing `dist/`.
- 404 on `/healthz`: ensure you pulled latest code with the healthz endpoint.
- External service errors: confirm tokens and that services are reachable from Render region.

## License

MIT License

---

## Wasender Integration Notes

The service now uses the official Wasender endpoint `POST /send-message` (previously `/messages` in earlier internal code). Media field names follow the official documentation:

- imageUrl
- videoUrl
- documentUrl
- audioUrl
- fileName (instead of legacy `filename`)

Backward compatibility: the payload builder maps legacy keys (image, video, document, audio, filename) to the new *Url / fileName variants so existing scheduled data or older clients keep working. Prefer using the new names in all future integrations.

Added endpoints:

- `POST /api/v1/wasender/sessions/:id/disconnect`
- `GET /api/v1/wasender/messages/:id`

New internal methods in `WasenderService`:
- `disconnectSession(sessionId)`
- `getMessageInfo(messageId)`

Validation: The request schema (`ValidationSchemas.sendMessage`) accepts both `filename` and `fileName`, normalizing them before sending to Wasender.

Reply Support: Field `replyTo` is available at the interface level (future enhancement: add controller exposure if quoting messages is required).

If you experience 404 or validation errors from Wasender, ensure the token is valid and that you are not blocked by IP/location; the new logging will record the endpoint `/send-message` usage and payload keys for diagnosis.