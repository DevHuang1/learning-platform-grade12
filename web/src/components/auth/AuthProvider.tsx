"use client";

import { type Session, type User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { createClient, hasSupabase } from "@/lib/supabase";
import { fetchProfile } from "@/lib/db";
import type { ProfileRow } from "@/lib/types";

type AuthState = {
  user: User | null;
  profile: ProfileRow | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, role?: "student" | "teacher") => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  loading: true,
  configured: false,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = hasSupabase();

  const refreshProfile = useCallback(async () => {
    if (!configured) return;
    const client = createClient();
    const {
      data: { user: u },
    } = await client.auth.getUser();
    if (!u) {
      setUser(null);
      setProfile(null);
      return;
    }
    setUser(u);
    const p = await fetchProfile(u.id);
    setProfile(p);
  }, [configured]);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    const client = createClient();
    client.auth
      .getSession()
      .then(({ data }) => {
        setUser(data.session?.user ?? null);
        setLoading(false);
        if (data.session?.user) {
          fetchProfile(data.session.user.id).then(setProfile);
        }
      })
      .catch(() => setLoading(false));

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === "SIGNED_OUT") {
        setProfile(null);
      } else if (session?.user) {
        fetchProfile(session.user.id).then(setProfile);
      }
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [configured]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!configured) return { error: "Supabase is not configured." };
      const client = createClient();
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      const { data } = await client.auth.getUser();
      if (data.user) {
        setUser(data.user);
        const p = await fetchProfile(data.user.id);
        setProfile(p);
      }
      return { error: null };
    },
    [configured],
  );

  const signUp = useCallback(
    async (email: string, password: string, fullName: string, role?: "student" | "teacher") => {
      if (!configured) return { error: "Supabase is not configured." };
      const client = createClient();
      const { error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, role: role || "student" },
        },
      });
      if (error) return { error: error.message };
      return { error: null };
    },
    [configured],
  );

  const signOut = useCallback(async () => {
    if (!configured) return;
    const client = createClient();
    await client.auth.signOut();
    setUser(null);
    setProfile(null);
  }, [configured]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        configured,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}