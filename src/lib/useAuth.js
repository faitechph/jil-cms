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
  await supabase.from("audit_logs").insert([{
    user_id: data.user.id,
    user_name: profile.name,
    action: "login",
    details: "Signed in",
    entity: "user",
    entity_id: data.user.id,
  }]);
  return { ok: true };
};

  const logout = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).maybeSingle();
      await supabase.from("audit_logs").insert([{
        user_id: user.id,
        user_name: profile?.name || user.email || "Unknown",
        action: "logout",
        details: "Signed out",
        entity: "user",
        entity_id: user.id,
      }]);
    }
    await supabase.auth.signOut();
    setAuth(null);
  };

  return { auth, loading, error, loginWithEmail, logout };
}