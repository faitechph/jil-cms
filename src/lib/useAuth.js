import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export function useAuth() {
  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProfile = async (user) => {
    if (!user) {
      setAuth(null);
      return;
    }
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*, branches(name)')
      .eq('id', user.id)
      .single();

    if (profileError) {
      setError(profileError.message);
      setAuth(null);
      return;
    }

    setAuth({ user, profile });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      loadProfile(data.session?.user ?? null).finally(() => setLoading(false));
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      loadProfile(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // Login using username — looks up the email from profiles table first
  const loginWithEmail = async (username, password) => {
  setError(null);

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('name')
    .eq('username', username.trim())  // ← eq instead of ilike
    .maybeSingle();

  
  if (profileError || !profile) {
    setError("Username not found.");
    return { ok: false, error: "Username not found." };
  }

  const { data, error: signInError } = await supabase.auth.signInWithPassword({
    email: profile.name,
    password,
  });

  if (signInError) {
    setError(signInError.message);
    return { ok: false, error: signInError.message };
  }

  await loadProfile(data.user);
  return { ok: true };
};

  const logout = async () => {
    await supabase.auth.signOut();
    setAuth(null);
  };

  return { auth, loading, error, loginWithEmail, logout };
}