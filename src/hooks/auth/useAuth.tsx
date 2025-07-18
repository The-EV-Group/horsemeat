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

  // Single function to handle employee fetching/creation
  const handleEmployeeRecord = async (user: User) => {
    try {
      console.log('Handling employee record for user:', user.id);
      
      // First try to fetch by user_id
      let { data: employeeData, error } = await supabase
        .from('internal_employee')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching employee by user_id:', error);
        return;
      }

      if (!employeeData) {
        // Try to fetch by email as fallback
        console.log('No employee found by user_id, trying by email:', user.email);
        const { data: employeeByEmail, error: emailError } = await supabase
          .from('internal_employee')
          .select('*')
          .eq('email', user.email)
          .maybeSingle();

        if (emailError && emailError.code !== 'PGRST116') {
          console.error('Error fetching employee by email:', emailError);
          return;
        }

        if (employeeByEmail) {
          // Found by email, update the user_id
          console.log('Found employee by email, updating user_id');
          const { data: updatedEmployee, error: updateError } = await supabase
            .from('internal_employee')
            .update({ user_id: user.id })
            .eq('id', employeeByEmail.id)
            .select()
            .single();

          if (updateError) {
            console.error('Error updating employee user_id:', updateError);
            setEmployee(employeeByEmail); // Use the original record
          } else {
            setEmployee(updatedEmployee);
          }
        } else {
          // No employee found, create new one
          console.log('No employee found, creating new record');
          const { data: newEmployee, error: insertError } = await supabase
            .from('internal_employee')
            .insert({
              user_id: user.id,
              email: user.email || '',
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown User',
            })
            .select()
            .single();

          if (insertError) {
            console.error('Error creating employee:', insertError);
          } else {
            console.log('Created new employee:', newEmployee);
            setEmployee(newEmployee);
          }
        }
      } else {
        console.log('Found existing employee by user_id:', employeeData);
        setEmployee(employeeData);
      }
    } catch (err) {
      console.error('Error handling employee record:', err);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await handleEmployeeRecord(session.user);
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