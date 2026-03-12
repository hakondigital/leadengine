'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Organization, User } from '@/lib/database.types';

interface OrgState {
  organization: Organization | null;
  user: User | null;
  authEmail: string | null;
  loading: boolean;
  error: string | null;
}

let cachedState: OrgState | null = null;

export function useOrganization() {
  const [state, setState] = useState<OrgState>(
    cachedState || {
      organization: null,
      user: null,
      authEmail: null,
      loading: true,
      error: null,
    }
  );

  useEffect(() => {
    if (cachedState && cachedState.organization) {
      setState(cachedState);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const supabase = createClient();

        let authUser = null;
        try {
          // Use getSession() for instant local check (no network request)
          // Middleware already validates the session server-side
          const { data: { session } } = await supabase.auth.getSession();
          authUser = session?.user ?? null;
        } catch {
          // Auth check failed
        }

        if (!authUser || cancelled) {
          if (!cancelled) {
            setState({ organization: null, user: null, authEmail: null, loading: false, error: 'Not authenticated' });
          }
          return;
        }

        // Query user profile
        let userProfile = null;
        try {
          const { data, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('auth_id', authUser.id)
            .maybeSingle();

          if (profileError) {
            console.error('Profile error:', profileError.message, profileError.code, profileError.details);
            if (!cancelled) {
              setState({ organization: null, user: null, authEmail: authUser.email ?? null, loading: false, error: profileError.message });
            }
            return;
          }
          userProfile = data;
        } catch (err) {
          console.error('Profile query failed:', err);
          if (!cancelled) {
            setState({ organization: null, user: null, authEmail: authUser?.email ?? null, loading: false, error: 'Failed to load user profile' });
          }
          return;
        }

        if (!userProfile || cancelled) {
          if (!cancelled) {
            setState({ organization: null, user: null, authEmail: authUser.email ?? null, loading: false, error: 'User profile not found' });
          }
          return;
        }

        // Query organization
        let org = null;
        try {
          const { data, error: orgError } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', userProfile.organization_id)
            .maybeSingle();

          if (orgError) {
            console.error('Org error:', orgError.message, orgError.code, orgError.details);
          }
          org = data;
        } catch (err) {
          console.error('Org query failed:', err);
        }

        if (!cancelled) {
          const s: OrgState = {
            organization: (org as Organization) || null,
            user: userProfile as User,
            authEmail: authUser.email ?? null,
            loading: false,
            error: org ? null : 'Organization not found',
          };
          cachedState = s;
          setState(s);
        }
      } catch (err) {
        console.error('useOrganization load failed:', err);
        if (!cancelled) {
          setState({ organization: null, user: null, authEmail: null, loading: false, error: 'Failed to load organization data' });
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return state;
}
