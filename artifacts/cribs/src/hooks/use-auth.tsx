import { useState, useEffect, createContext, useContext } from 'react';
import { createClient, User as SupabaseUser, Session } from '@supabase/supabase-js';
import { useSyncUser, setExtraHeadersGetter } from '@workspace/api-client-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

type AuthContextType = {
  user: SupabaseUser | null;
  session: Session | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const syncUser = useSyncUser();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setExtraHeadersGetter(() => () => ({ 'x-user-id': session.user!.id }));
        handleSyncUser(session.user);
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setExtraHeadersGetter(() => () => ({ 'x-user-id': session.user!.id }));
        handleSyncUser(session.user);
      } else {
        setExtraHeadersGetter(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSyncUser = async (user: SupabaseUser) => {
    try {
      await syncUser.mutateAsync({
        data: {
          supabaseId: user.id,
          email: user.email,
          avatarUrl: user.user_metadata?.avatar_url,
          username: user.user_metadata?.full_name || user.email?.split('@')[0],
        }
      });
    } catch (e) {
      console.error('Failed to sync user', e);
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}