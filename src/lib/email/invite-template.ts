/**
 * Email template for household invite
 */

import type { InviteTemplateParams } from '@/lib/types/invite';

export function generateInviteTemplate({
  inviterName,
  acceptUrl
}: InviteTemplateParams): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Household Invitation</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f8f9fa; border-radius: 8px; padding: 30px;">
    <h1 style="color: #4a5568; margin-top: 0;">You're Invited!</h1>
    
    <p>Hello,</p>
    
    <p><strong>${inviterName}</strong> has invited you to join their household on Kira Dashboard.</p>
    
    <p>With Kira Dashboard, you can:</p>
    <ul>
      <li>Share tasks and shopping lists</li>
      <li>Collaborate on household planning</li>
      <li>Stay organized together</li>
    </ul>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${acceptUrl}" style="background: #4299e1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
        Accept Invitation
      </a>
    </div>
    
    <p style="color: #718096; font-size: 14px; margin-top: 20px;">
      <strong>Note:</strong> This invitation expires in 7 days.
    </p>
    
    <p style="color: #718096; font-size: 14px;">
      If you didn't expect this invitation, you can safely ignore this email.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
    
    <p style="color: #a0aec0; font-size: 12px;">
      Kira Dashboard - Family task management made simple.
    </p>
  </div>
</body>
</html>`;
}
