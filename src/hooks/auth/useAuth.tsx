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
          // Simple employee fetch - no creation, no updates
          try {
            console.log('Fetching employee for user:', session.user.id, 'email:', session.user.email);

            // Add timeout to prevent hanging
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Employee fetch timeout')), 10000)
            );

            const fetchPromise = supabase
              .from('internal_employee')
              .select('*')
              .eq('user_id', session.user.id)
              .maybeSingle();

            const { data: employeeData, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

            console.log('Employee query result:', { employeeData, error });

            if (error && error.code !== 'PGRST116') {
              console.error('Error fetching employee:', error);
              setEmployee(null);
            } else if (employeeData) {
              console.log('Found employee:', employeeData);
              setEmployee(employeeData);
            } else {
              console.log('No employee found for user_id, trying email');
              // Try by email as fallback with timeout
              const emailFetchPromise = supabase
                .from('internal_employee')
                .select('*')
                .eq('email', session.user.email)
                .maybeSingle();

              const { data: employeeByEmail, error: emailError } = await Promise.race([emailFetchPromise, timeoutPromise]) as any;

              console.log('Email query result:', { employeeByEmail, emailError });

              if (employeeByEmail) {
                console.log('Found employee by email:', employeeByEmail);
                setEmployee(employeeByEmail);
              } else {
                console.log('No employee found by email either');
                setEmployee(null);
              }
            }
          } catch (err) {
            console.error('Error fetching employee:', err);
            setEmployee(null);
          }
        } else {
          setEmployee(null);
        }

        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Simple employee fetch for initial session
        try {
          console.log('Initial: Fetching employee for user:', session.user.id, 'email:', session.user.email);

          // Add timeout to prevent hanging
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Initial employee fetch timeout')), 10000)
          );

          const fetchPromise = supabase
            .from('internal_employee')
            .select('*')
            .eq('user_id', session.user.id)
            .maybeSingle();

          const { data: employeeData, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

          console.log('Initial: Employee query result:', { employeeData, error });

          if (error && error.code !== 'PGRST116') {
            console.error('Initial: Error fetching employee:', error);
            setEmployee(null);
          } else if (employeeData) {
            console.log('Initial: Found employee:', employeeData);
            setEmployee(employeeData);
          } else {
            console.log('Initial: No employee found for user_id, trying email');
            // Try by email as fallback with timeout
            const emailFetchPromise = supabase
              .from('internal_employee')
              .select('*')
              .eq('email', session.user.email)
              .maybeSingle();

            const { data: employeeByEmail, error: emailError } = await Promise.race([emailFetchPromise, timeoutPromise]) as any;

            console.log('Initial: Email query result:', { employeeByEmail, emailError });

            if (employeeByEmail) {
              console.log('Initial: Found employee by email:', employeeByEmail);
              setEmployee(employeeByEmail);
            } else {
              console.log('Initial: No employee found by email either');
              setEmployee(null);
            }
          }
        } catch (err) {
          console.error('Initial: Error fetching employee:', err);
          setEmployee(null);
        }
      }

      setLoading(false);
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