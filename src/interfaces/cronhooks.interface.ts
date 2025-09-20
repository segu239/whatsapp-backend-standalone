export interface CronhookSchedule {
  id?: string;
  title: string;
  description: string;
  url: string;
  timezone: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  payload?: any;
  contentType: string;
  isRecurring: boolean;
  runAt?: string;
  cronExpression?: string;
  startsAt?: string;
  endsAt?: string;
  sendCronhookObject: boolean;
  sendFailureAlert: boolean;
  retryCount?: string;
  retryIntervalSeconds?: string;
  status?: 'active' | 'paused' | 'completed';
}

export interface CronhookResponse {
  success: boolean;
  data?: any;
  error?: string;
  id?: string;
}

export interface CronhookListResponse {
  data: CronhookSchedule[];
  pagination: {
    skip: number;
    limit: number;
    total: number;
  };
}

export interface CronhookWebhookPayload {
  _cronhook_id: string;
  _random: string;
  _uuid: string;
  _timestamp: string;
  phoneNumber: string;
  message: string;
  contactName: string;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterEnabled: boolean;
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