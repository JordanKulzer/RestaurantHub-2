// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "../utils/supabaseClient";

interface AuthContextType {
  session: Session | null;
  loading: boolean;
  user: Session["user"] | null;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
  user: null,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Recover session on app start
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.log("Session recovery error:", error);
        // Session couldn't be recovered, user will need to log in again
      }
      setSession(session);
      setLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{ session, loading, user: session?.user ?? null }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
