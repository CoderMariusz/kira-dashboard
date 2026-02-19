/**
 * SendGrid email wrapper for invite emails
 */

import sgMail from '@sendgrid/mail';
import { generateInviteTemplate } from './invite-template';
import type {
  SendInviteEmailParams,
  SendInviteResult,
} from '@/lib/types/invite';

export async function sendInviteEmail({
  to,
  inviterName,
  token,
  acceptUrl,
}: SendInviteEmailParams): Promise<SendInviteResult> {
  const apiKey = process.env.SENDGRID_API_KEY;

  if (!apiKey) {
    return { sent: false };
  }

  sgMail.setApiKey(apiKey);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const finalAcceptUrl = acceptUrl || `${appUrl}/invite/accept?token=${token}`;

  const html = generateInviteTemplate({
    inviterName,
    acceptUrl: finalAcceptUrl,
  });

  try {
    await sgMail.send({
      to,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@kira-dashboard.app',
      subject: `${inviterName} invited you to join their household on Kira Dashboard`,
      html,
    });

    return { sent: true };
  } catch (error) {
    console.error('Failed to send invite email:', error);
    return {
      sent: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
