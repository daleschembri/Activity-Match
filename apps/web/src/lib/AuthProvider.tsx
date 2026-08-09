import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { hasCompletedWelcome } from "@/lib/welcomeStorage";
import { GathereLogo } from "@/components/GathereLogo";

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  loading: true,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

function isPublicPath(pathname: string) {
  if (pathname === "/splash" || pathname === "/welcome") return true;
  if (pathname === "/auth" || pathname.startsWith("/auth/")) return true;
  if (pathname === "/a" || pathname.startsWith("/a/")) return true;
  return false;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || loading) return;
    if (!session && !isPublicPath(location.pathname)) {
      const entry = hasCompletedWelcome() ? "/auth" : "/splash";
      navigate(entry, { replace: true, state: { from: location.pathname } });
    }
  }, [session, loading, location.pathname, navigate]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (isSupabaseConfigured && loading) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-surface text-on-surface">
        <GathereLogo variant="symbolSimplified" size="lg" className="animate-pulse" />
        <p className="text-body-md text-on-surface-variant">Loading...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
