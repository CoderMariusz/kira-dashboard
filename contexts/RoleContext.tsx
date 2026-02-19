'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ROLE_PERMISSIONS, NO_PERMISSIONS } from '@/lib/auth/permissions';
import type { Role, User, RoleContextValue, Permission } from '@/types/auth.types';

// Tworzymy context z wartością domyślną undefined (celowo — wykrywamy użycie poza Provider)
const RoleContext = createContext<RoleContextValue | undefined>(undefined);

interface RoleProviderProps {
  children: React.ReactNode;
}

export function RoleProvider({ children }: RoleProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // requestId pattern: onAuthStateChange może odpalić INITIAL_SESSION + SIGNED_IN
    // + TOKEN_REFRESHED w szybkiej sekwencji. Każde wywołanie resetuje isLoading=true.
    // Tylko OSTATNIE wywołanie może ustawić stan — starsze są ignorowane.
    let currentRequestId = 0;

    async function loadUserAndRole() {
      const requestId = ++currentRequestId;
      setIsLoading(true);

      try {
        // Szybka ścieżka: sprawdź lokalną sesję bez network call
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          if (requestId !== currentRequestId) return; // stale
          setUser(null);
          setRole(null);
          return;
        }

        const supabaseUser = session.user;

        if (requestId !== currentRequestId) return; // stale — nowsze wywołanie już działa

        // 2. Ustaw podstawowe dane usera
        setUser({
          id: supabaseUser.id,
          email: supabaseUser.email ?? '',
        });

        // 3. Pobierz rolę z tabeli user_roles
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', supabaseUser.id)
          .single();

        if (requestId !== currentRequestId) return; // stale

        if (roleError || !roleData) {
          console.warn('RoleProvider: user has no role in user_roles table');
          setRole(null);
        } else {
          const validRoles: Role[] = ['ADMIN', 'HELPER_PLUS', 'HELPER'];
          const userRole = roleData.role as Role;
          if (validRoles.includes(userRole)) {
            setRole(userRole);
          } else {
            console.error('RoleProvider: invalid role received from database:', userRole);
            setRole(null);
          }
        }
      } catch (err) {
        if (requestId !== currentRequestId) return;
        console.error('RoleProvider: unexpected error loading user', err);
        setUser(null);
        setRole(null);
      } finally {
        // Tylko najnowsze wywołanie ustawia isLoading=false
        if (requestId === currentRequestId) {
          setIsLoading(false);
        }
      }
    }

    // Załaduj dane przy montowaniu
    loadUserAndRole();

    // Subskrybuj zmiany sesji (login / logout / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          currentRequestId++; // unieważnij wszystkie w toku
          setUser(null);
          setRole(null);
          setIsLoading(false);
          return;
        }
        // SIGNED_IN, TOKEN_REFRESHED, INITIAL_SESSION — przeładuj dane
        await loadUserAndRole();
      }
    );

    return () => {
      currentRequestId = 999999; // unieważnij wszystkie w toku przy unmount
      subscription.unsubscribe();
    };
  }, []);

  const value: RoleContextValue = { user, role, isLoading };

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
}

/** Hook useUser — zwraca usera, rolę i stan ładowania */
export function useUser(): RoleContextValue {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a RoleProvider');
  }
  return context;
}

/** Hook usePermissions — zwraca uprawnienia dla aktualnej roli */
export function usePermissions(): Permission {
  const { role } = useUser();  // rzuci błąd jeśli poza RoleProvider — poprawne zachowanie
  
  if (!role) {
    return NO_PERMISSIONS;
  }
  
  return ROLE_PERMISSIONS[role];
}
