import { supabase } from "@/integrations/supabase/client";

export interface AuthUser {
  id: string;
  username: string;
  role: 'user' | 'leader';
}

export const signUp = async (username: string, password: string, role: 'user' | 'leader') => {
  // Validate username format
  if (username.length < 3 || username.length > 30) {
    return { error: new Error("Username must be between 3 and 30 characters") };
  }
  
  if (!/^[a-z0-9._-]+$/.test(username.toLowerCase())) {
    return { error: new Error("Username can only contain lowercase letters, numbers, dots, underscores, and hyphens") };
  }

  // Validate password
  if (password.length < 8) {
    return { error: new Error("Password must be at least 8 characters") };
  }

  // Use username@local.auth as email since Supabase requires email format
  const email = `${username.toLowerCase()}@local.auth`;
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: username.toLowerCase(),
        role
      },
      emailRedirectTo: `${window.location.origin}/`
    }
  });

  if (error) {
    if (error.message.includes("already registered")) {
      return { error: new Error("Username already taken") };
    }
    return { error };
  }

  return { data };
};

export const signIn = async (username: string, password: string) => {
  // Use username@local.auth as email
  const email = `${username.toLowerCase()}@local.auth`;
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    return { error: new Error("Invalid username or password") };
  }

  return { data };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async (): Promise<AuthUser | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, role')
    .eq('id', session.user.id)
    .single();

  if (!profile) return null;

  return {
    id: session.user.id,
    username: profile.username,
    role: profile.role as 'user' | 'leader'
  };
};
