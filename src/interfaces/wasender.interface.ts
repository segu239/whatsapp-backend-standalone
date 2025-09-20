export interface WasenderMessage {
  to: string;
  text?: string;
  image?: string;
  document?: string;
  audio?: string;
  video?: string;
  caption?: string;
  filename?: string;
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