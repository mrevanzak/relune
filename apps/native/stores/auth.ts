import type { Session } from "@supabase/supabase-js";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createSelectors } from "@/lib/utils";
import { zustandStorage } from "@/lib/zustand-storage";

interface AuthState {
  session: Session | null;
  setSession: (session: Session | null) => void;
  signOut: () => void;
}

const authStoreBase = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      setSession: (session) => set({ session }),
      signOut: () => set({ session: null }),
    }),
    {
      name: "auth-store",
      storage: createJSONStorage(() => zustandStorage),
      skipHydration: true,
    }
  )
);

export const authStore = createSelectors(authStoreBase);
