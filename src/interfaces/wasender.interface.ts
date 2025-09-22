export interface WasenderMessage {
  to: string;
  text?: string;
  /**
   * Campos de medios según documentación oficial (send-message):
   * - imageUrl
   * - videoUrl
   * - documentUrl
   * - audioUrl (no siempre documentado pero usado de forma consistente)
   *
   * Se mantienen los campos legacy (image, video, document, audio) por compatibilidad
   * interna ya que el servicio original usaba nombres simples. Al construir el payload
   * se enviarán ambas variantes cuando corresponda para asegurar compatibilidad futura.
   */
  imageUrl?: string;     // URL de imagen (oficial)
  videoUrl?: string;     // URL de video (oficial)
  documentUrl?: string;  // URL de documento (oficial)
  audioUrl?: string;     // URL de audio (oficial / asumido)
  image?: string;        // legacy interno
  video?: string;        // legacy interno
  document?: string;     // legacy interno
  audio?: string;        // legacy interno
  caption?: string;
  /** Nombre de archivo (oficial: fileName). Se mantiene filename para compatibilidad */
  fileName?: string;
  filename?: string; // legacy interno
  /** ID de mensaje al que se responde (reply / quoted messages) */
  replyTo?: string | number;
}

export interface WasenderResponse {
  success: boolean;
  message?: string;
  data?: {
    id: string;
    status: 'sent' | 'pending' | 'failed';
    timestamp: string;
  };
  error?: string;
}

export interface WasenderSession {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'qr_code';
  qr_code?: string;
  phone_number?: string;
  created_at: string;
  updated_at: string;
}

export interface WasenderErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

export interface WasenderAccountInfo {
  id: string;
  name: string;
  email: string;
  phone_number?: string;
  plan: string;
  credits_remaining: number;
  created_at: string;
}

export interface SendMessageRequest {
  phoneNumber: string;
  message?: string;
  imageUrl?: string;
  documentUrl?: string;
  audioUrl?: string;
  videoUrl?: string;
  caption?: string;
  filename?: string;
  fileName?: string; // alias soportado por API oficial
  replyTo?: string | number;
  messageType: 'text' | 'image' | 'document' | 'audio' | 'video';
}

export interface ScheduleMessageRequest {
  phoneNumber: string;
  message: string;
  contactName: string;
  scheduledDateTime?: string;
  cronExpression?: string;
  startsAt?: string;
  endsAt?: string;
  isRecurring: boolean;
  timezone?: string;
}