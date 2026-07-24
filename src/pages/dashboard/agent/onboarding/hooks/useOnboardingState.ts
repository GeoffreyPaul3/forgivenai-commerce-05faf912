import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// ── Types ────────────────────────────────────────────────────────────────────

export type AgentLevel = "L1" | "Silver" | "Gold" | "Platinum" | "Diamond";

export interface OnboardingState {
  phase: number; // 1–6
  // Phase 2 — Profile
  profileData: {
    fullName?: string;
    phone?: string;
    district?: string;
    area?: string;
    landmark?: string;
    nationalId?: string;
    bankName?: string;
    bankAccount?: string;
    mobileMoney?: string;
    mobileMoneyName?: string;
    photoUrl?: string;
  };
  profileCompletion: number; // 0–100
  // Phase 3 — Preferences
  preferredCategories: string[];
  salesChannels: string[];
  estimatedCustomers: string;
  // Phase 4 — Training
  trainingProgress: Record<string, "locked" | "watching" | "practicing" | "quizzing" | "complete">;
  quizScores: Record<string, number>; // 0–100
  totalXp: number;
  // Phase 5 — Assessment
  assessmentScore: number | null;
  assessmentAttempts: number;
  // Phase 6 — Certification
  salesReadinessScore: number; // 0–100
  level: AgentLevel;
  certified: boolean;
  certifiedAt: string | null;
}

const DEFAULT_STATE: OnboardingState = {
  phase: 1,
  profileData: {},
  profileCompletion: 0,
  preferredCategories: [],
  salesChannels: [],
  estimatedCustomers: "",
  trainingProgress: {},
  quizScores: {},
  totalXp: 0,
  assessmentScore: null,
  assessmentAttempts: 0,
  salesReadinessScore: 0,
  level: "L1",
  certified: false,
  certifiedAt: null,
};

// ── Storage helpers ──────────────────────────────────────────────────────────

const storageKey = (userId: string) => `fsc_agent_onboarding_${userId}`;

export function getOnboardingState(userId: string): OnboardingState | null {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return null;
  }
}

export function saveOnboardingState(
  userId: string,
  partial: Partial<OnboardingState>
): OnboardingState {
  try {
    const existing = getOnboardingState(userId) || DEFAULT_STATE;
    const merged = { ...existing, ...partial };
    localStorage.setItem(storageKey(userId), JSON.stringify(merged));
    return merged;
  } catch {
    return DEFAULT_STATE;
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useOnboardingState(userId: string) {
  const [state, setState] = useState<OnboardingState>(
    () => getOnboardingState(userId) || DEFAULT_STATE
  );

  useEffect(() => {
    setState(getOnboardingState(userId) || DEFAULT_STATE);
  }, [userId]);

  const update = useCallback((partial: Partial<OnboardingState>) => {
    setState((prev) => {
      const next = { ...prev, ...partial };
      saveOnboardingState(userId, next);
      
      // Async sync to Supabase (fire and forget)
      supabase
        .from("agents")
        .update({ onboarding_state: next as any })
        .eq("user_id", userId)
        .then(({ error }) => {
          if (error) console.error("Failed to sync onboarding state to Supabase:", error);
        });

      return next;
    });
  }, [userId]);

  const advancePhase = useCallback(() => {
    update({ phase: Math.min(6, state.phase + 1) });
  }, [state.phase, update]);

  const retreatPhase = useCallback(() => {
    update({ phase: Math.max(1, state.phase - 1) });
  }, [state.phase, update]);

  const addXp = (amount: number) => {
    update({ totalXp: state.totalXp + amount });
  };

  const completeCertification = useCallback(() => {
    update({
      certified: true,
      certifiedAt: new Date().toISOString(),
      phase: 6,
    });
  }, [update]);

  // Optionally fetch from DB on mount to hydrate local storage if empty/outdated
  useEffect(() => {
    async function fetchRemote() {
      if (!userId || userId === "guest") return;
      const { data } = await supabase
        .from("agents")
        .select("onboarding_state")
        .eq("user_id", userId)
        .maybeSingle();
        
      if (data?.onboarding_state) {
        const remoteState = data.onboarding_state as unknown as OnboardingState;
        // Simple merge: remote wins for now, but could be smarter
        setState(prev => {
          const next = { ...DEFAULT_STATE, ...prev, ...remoteState };
          localStorage.setItem(storageKey(userId), JSON.stringify(next));
          return next;
        });
      }
    }
    fetchRemote();
  }, [userId]);

  return { state, update, advancePhase, retreatPhase, addXp, completeCertification };
}

// ── Profile completion calculator ────────────────────────────────────────────

export function calcProfileCompletion(
  pd: OnboardingState["profileData"],
  categories: string[],
  channels: string[],
  estimatedCustomers: string
): number {
  const fields: (boolean | string | undefined)[] = [
    pd.fullName,
    pd.phone,
    pd.district,
    pd.area,
    pd.nationalId,
    pd.bankName || pd.mobileMoney,
    categories.length > 0,
    channels.length > 0,
    !!estimatedCustomers,
  ];
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
}
