// components/auth/PermissionGate.tsx
// Komponent warunkowego renderowania na podstawie uprawnień

'use client';

import React from 'react';
import { usePermissions } from '@/contexts/RoleContext';
import type { Permission } from '@/types/auth.types';

interface PermissionGateProps {
  /** Klucz z interfejsu Permission (np. "canManageUsers") */
  require: keyof Permission;
  /** Co renderować gdy uprawnienie spełnione */
  children: React.ReactNode;
  /** Co renderować gdy brak uprawnienia (domyślnie null) */
  fallback?: React.ReactNode;
}

export function PermissionGate({ require: permission, children, fallback = null }: PermissionGateProps) {
  const permissions = usePermissions();
  
  if (!permissions[permission]) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}
