import { Inject, Injectable } from '@nestjs/common';
import { loadApiEnvironment } from '@unicom/config';
import nodemailer from 'nodemailer';

export type TransactionalEmail = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export type EmailSendResult = {
  outcome: 'sent' | 'disabled' | 'retryable_failure' | 'permanent_failure';
  code?: string;
};

@Injectable()
export class TestEmailInbox {
  private static readonly messages: TransactionalEmail[] = [];

  record(message: TransactionalEmail): void {
    TestEmailInbox.messages.push({ ...message });
  }

  all(): readonly TransactionalEmail[] {
    return TestEmailInbox.messages.map((message) => ({ ...message }));
  }

  clear(): void {
    TestEmailInbox.messages.length = 0;
  }
}

@Injectable()
export class TransactionalEmailService {
  private readonly testAttemptCounts = new Map<string, number>();

  constructor(@Inject(TestEmailInbox) private readonly testInbox: TestEmailInbox) {}

  async send(message: TransactionalEmail): Promise<EmailSendResult> {
    this.assertHeaderSafe(message.to);
    this.assertHeaderSafe(message.subject);
    const environment = loadApiEnvironment();
    if (environment.EMAIL_PROVIDER === 'disabled')
      return { outcome: 'disabled', code: 'EMAIL_DISABLED' };
    if (environment.EMAIL_PROVIDER === 'test') {
      const fingerprint = `${message.to}\u0000${message.subject}\u0000${message.text}`;
      const attempts = (this.testAttemptCounts.get(fingerprint) ?? 0) + 1;
      this.testAttemptCounts.set(fingerprint, attempts);
      if (environment.EMAIL_TEST_PROVIDER_MODE === 'permanent_failure') {
        return { outcome: 'permanent_failure', code: 'TEST_PERMANENT_FAILURE' };
      }
      if (environment.EMAIL_TEST_PROVIDER_MODE === 'transient_once' && attempts === 1) {
        return { outcome: 'retryable_failure', code: 'TEST_TRANSIENT_FAILURE' };
      }
      this.testInbox.record(message);
      return { outcome: 'sent' };
    }
    try {
      const transport = nodemailer.createTransport({
        host: environment.SMTP_HOST!,
        port: environment.SMTP_PORT,
        secure: environment.SMTP_SECURE,
        auth: { user: environment.SMTP_USERNAME!, pass: environment.SMTP_PASSWORD! },
        connectionTimeout: environment.SMTP_TIMEOUT_SECONDS * 1_000,
        greetingTimeout: environment.SMTP_TIMEOUT_SECONDS * 1_000,
        socketTimeout: environment.SMTP_TIMEOUT_SECONDS * 1_000,
      });
      await transport.sendMail({
        from: `${this.headerValue(environment.EMAIL_FROM_NAME)} <${environment.EMAIL_FROM_ADDRESS!}>`,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
        ...(environment.EMAIL_REPLY_TO ? { replyTo: environment.EMAIL_REPLY_TO } : {}),
      });
      return { outcome: 'sent' };
    } catch (error) {
      const code =
        error instanceof Error && 'code' in error ? String(error.code) : 'SMTP_SEND_FAILED';
      return { outcome: this.isRetryable(code) ? 'retryable_failure' : 'permanent_failure', code };
    }
  }

  private isRetryable(code: string): boolean {
    return !['EENVELOPE', 'EMESSAGE', 'EAUTH'].includes(code) && !code.startsWith('5');
  }

  private assertHeaderSafe(value: string): void {
    if (/\r|\n/.test(value)) throw new Error('Unsafe email header value.');
  }

  private headerValue(value: string): string {
    this.assertHeaderSafe(value);
    return value.replace(/[<>]/g, '');
  }
}
