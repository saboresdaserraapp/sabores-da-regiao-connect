import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { OFFICIAL_ADMIN_EMAIL } from "@/lib/constants";

export type AppRole = Database["public"]["Enums"]["app_role"];

interface AuthCtx {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  loading: boolean;
  signOut: () => Promise<void>;
  hasRole: (r: AppRole | AppRole[]) => boolean;
  isAdmin: boolean;
  canManage: boolean;
  isOfficialAdmin: boolean;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => loadRoles(s.user.id), 0);
      } else {
        setRoles([]);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) loadRoles(data.session.user.id);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadRoles = async (uid: string) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    setRoles((data ?? []).map((r) => r.role as AppRole));
  };

  const adminRoles: AppRole[] = ["super_admin", "admin_operacional", "analista_comercial", "suporte"];
  const manageRoles: AppRole[] = ["super_admin", "admin_operacional"];

  const isOfficialAdmin = !!user?.email && user.email.toLowerCase() === OFFICIAL_ADMIN_EMAIL.toLowerCase();
  const rawIsAdmin = roles.some((r) => adminRoles.includes(r));
  const value: AuthCtx = {
    user, session, roles, loading,
    signOut: async () => { await supabase.auth.signOut(); },
    hasRole: (r) => {
      const arr = Array.isArray(r) ? r : [r];
      return arr.some((x) => roles.includes(x));
    },
    // Defesa em profundidade: o painel admin é exclusivo da conta oficial.
    isAdmin: rawIsAdmin && isOfficialAdmin,
    canManage: roles.some((r) => manageRoles.includes(r)) && isOfficialAdmin,
    isOfficialAdmin,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
};

export const ROLE_LABEL: Record<AppRole, string> = {
  super_admin: "Super Admin",
  admin_operacional: "Admin Operacional",
  analista_comercial: "Analista Comercial",
  suporte: "Suporte",
  establishment_owner: "Dono de Estabelecimento",
};
