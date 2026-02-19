/**
 * Types for household invite functionality
 */

import { HouseholdInvite } from './database';

/** Status types for household invites (re-exported from database types) */
export type InviteStatus = HouseholdInvite['status'];

/** Parameters for sending an invite email */
export interface SendInviteEmailParams {
  to: string;
  inviterName: string;
  token: string;
  acceptUrl?: string;
}

/** Result of sending an invite email */
export interface SendInviteResult {
  sent: boolean;
  error?: string;
}

/** Parameters for generating invite email template */
export interface InviteTemplateParams {
  inviterName: string;
  acceptUrl: string;
}

/** Request body for creating an invite via API */
export interface CreateInviteRequest {
  email: string;
}

/** Response body for invite creation */
export interface CreateInviteResponse {
  invite: HouseholdInvite;
}
