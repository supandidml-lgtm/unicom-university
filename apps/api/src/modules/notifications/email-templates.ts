import { loadApiEnvironment } from '@unicom/config';

export const EMAIL_TEMPLATE_VERSION = '2026-09-02.v1';

export type RenderedEmail = { subject: string; text: string; html: string };

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
      })[character]!,
  );
}

function link(url: string, label: string): string {
  const safeUrl = escapeHtml(url);
  return `<p><a href="${safeUrl}">${escapeHtml(label)}</a></p><p>${safeUrl}</p>`;
}

export function invitationEmail(name: string, activationUrl: string): RenderedEmail {
  const safeName = escapeHtml(name);
  return {
    subject: 'Activate your UNICOM UNIVERSITY account',
    text: `Hello ${name},\n\nActivate your UNICOM UNIVERSITY account: ${activationUrl}\n\nIf you did not expect this invitation, you can ignore this email.`,
    html: `<p>Hello ${safeName},</p><p>Activate your UNICOM UNIVERSITY account.</p>${link(activationUrl, 'Activate account')}<p>If you did not expect this invitation, you can ignore this email.</p>`,
  };
}

export function passwordResetEmail(name: string, resetUrl: string): RenderedEmail {
  const safeName = escapeHtml(name);
  return {
    subject: 'Reset your UNICOM UNIVERSITY password',
    text: `Hello ${name},\n\nReset your password: ${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
    html: `<p>Hello ${safeName},</p><p>Reset your password.</p>${link(resetUrl, 'Reset password')}<p>If you did not request this, you can ignore this email.</p>`,
  };
}

export function trainingAssignedEmail(name: string, brands: string[]): RenderedEmail {
  const list = brands.map((brand) => escapeHtml(brand)).join(', ');
  return {
    subject: 'New training assignment',
    text: `Hello ${name},\n\nYou have new training assigned for: ${brands.join(', ')}.\n\nOpen ${loadApiEnvironment().WEB_PUBLIC_URL} to begin.`,
    html: `<p>Hello ${escapeHtml(name)},</p><p>You have new training assigned for: ${list}.</p>`,
  };
}

export function trainingCompletedEmail(name: string, brand: string): RenderedEmail {
  return {
    subject: 'Training completed',
    text: `Hello ${name},\n\nYour training for ${brand} is complete.`,
    html: `<p>Hello ${escapeHtml(name)},</p><p>Your training for ${escapeHtml(brand)} is complete.</p>`,
  };
}

export function certificateReadyEmail(name: string, certificateNumber: string): RenderedEmail {
  const url = new URL('/my-training/certificates', loadApiEnvironment().WEB_PUBLIC_URL).toString();
  return {
    subject: 'Your UNICOM UNIVERSITY certificate is ready',
    text: `Hello ${name},\n\nYour certificate (${certificateNumber}) is ready. Sign in to download it: ${url}`,
    html: `<p>Hello ${escapeHtml(name)},</p><p>Your certificate (${escapeHtml(certificateNumber)}) is ready.</p>${link(url, 'Open my certificates')}`,
  };
}
