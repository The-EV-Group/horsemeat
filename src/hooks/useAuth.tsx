
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/integrations/supabase/types';

type Employee = Tables<'internal_employee'>;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  employee: Employee | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch or create employee record
          setTimeout(async () => {
            try {
              const { data: employeeData, error } = await supabase
                .from('internal_employee')
                .select('*')
                .eq('user_id', session.user.id)
                .maybeSingle();

              if (error && error.code !== 'PGRST116') {
                console.error('Error fetching employee:', error);
                return;
              }

              if (!employeeData) {
                // Create employee record
                const { data: newEmployee, error: insertError } = await supabase
                  .from('internal_employee')
                  .insert({
                    user_id: session.user.id,
                    email: session.user.email,
                    full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
                  })
                  .select()
                  .single();

                if (insertError) {
                  console.error('Error creating employee:', insertError);
                } else {
                  setEmployee(newEmployee);
                }
              } else {
                setEmployee(employeeData);
              }
            } catch (err) {
              console.error('Error handling employee data:', err);
            }
          }, 0);
        } else {
          setEmployee(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/dashboard`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName || email.split('@')[0],
        }
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    employee,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
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
