// lib/auth/index.ts
// Barrel export dla modułu auth

export { ROLE_PERMISSIONS, NO_PERMISSIONS } from './permissions';
export { RoleProvider, useUser, usePermissions } from '@/contexts/RoleContext';
export { PermissionGate } from '@/components/auth/PermissionGate';
export type { Role, Permission, User, RoleContextValue } from '@/types/auth.types';
