import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AuthUser } from '@/lib/auth';

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        
        if (session?.user) {
          // Fetch profile data with setTimeout to prevent deadlock
          setTimeout(async () => {
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('username, role')
                .eq('id', session.user.id)
                .single();
              
              if (profile) {
                setUser({
                  id: session.user.id,
                  username: profile.username,
                  role: profile.role as 'user' | 'leader'
                });
              }
            } catch (error) {
              setUser(null);
            } finally {
              setLoading(false);
            }
          }, 0);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      
      if (session?.user) {
        (async () => {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, role')
              .eq('id', session.user.id)
              .single();
            
            if (profile) {
              setUser({
                id: session.user.id,
                username: profile.username,
                role: profile.role as 'user' | 'leader'
              });
            }
          } catch (error) {
            setUser(null);
          } finally {
            setLoading(false);
          }
        })();
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
