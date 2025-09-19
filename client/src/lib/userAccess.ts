// client/src/lib/userAccess.ts
import type { Database } from '@/lib/database.types';
import { toBool } from '@/utils/normalize';

type UsersRow = Database['public']['Tables']['users']['Row'];
type ProfilesRow = Database['public']['Tables']['profiles']['Row'];
type SubscriptionPlanRow = Database['public']['Tables']['subscription_plans']['Row'];
type EntitlementRow = Database['public']['Tables']['entitlements']['Row'];

export type AccessFeatureKey = 'habits' | 'training' | 'nutrition' | 'meditation' | 'active_breaks';

export type AccessFeatures = Record<AccessFeatureKey, boolean>;

export interface AccessModel {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: 'admin' | 'user';
  plan: {
    id: string | null;
    name: string | null;
    price: number | null;
  };
  entitlement: {
    plan: string | null;
    active: boolean;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
  } | null;
  features: AccessFeatures;
  raw: {
    user: UsersRow | null;
    profile: ProfilesRow | null;
    plan: SubscriptionPlanRow | null;
    entitlement: EntitlementRow | null;
  };
}

interface BuildAccessModelOptions {
  user: UsersRow | null;
  profile?: ProfilesRow | null;
  plan?: SubscriptionPlanRow | null;
  entitlement?: EntitlementRow | null;
  fallbackEmail?: string;
  fallbackId?: string;
}

const coalesceName = (user: UsersRow | null, profile: ProfilesRow | null): string => {
  const candidates = [
    profile?.full_name,
    profile?.nombre,
    profile?.name,
    user?.full_name,
    user?.name,
  ];

  return (candidates.find((value) => typeof value === 'string' && value.trim().length > 0) ?? '').trim();
};

const resolveAvatarUrl = (user: UsersRow | null, profile: ProfilesRow | null): string | null => {
  return (
    profile?.profile_picture_url ??
    profile?.avatar_url ??
    user?.profile_picture_url ??
    null
  );
};

const planFeature = (
  plan: SubscriptionPlanRow | null | undefined,
  keys: string[],
): boolean | undefined => {
  if (!plan?.features) return undefined;
  const record = plan.features as Record<string, unknown>;
  for (const key of keys) {
    if (record && key in record) {
      return toBool(record[key]);
    }
  }
  return undefined;
};

const prioritizeFeature = (
  userFlag: boolean | null | undefined,
  plan: SubscriptionPlanRow | null | undefined,
  planKeys: string[],
  fallback: boolean,
): boolean => {
  if (typeof userFlag === 'boolean') {
    return userFlag;
  }
  const fromPlan = planFeature(plan, planKeys);
  if (typeof fromPlan === 'boolean') {
    return fromPlan;
  }
  return fallback;
};

export const buildAccessModel = ({
  user,
  profile = null,
  plan = null,
  entitlement = null,
  fallbackEmail,
  fallbackId,
}: BuildAccessModelOptions): AccessModel => {
  const id = user?.id ?? fallbackId ?? '';
  const email = user?.email ?? fallbackEmail ?? '';
  const displayName = coalesceName(user, profile) || (user?.email ?? fallbackEmail ?? '');
  const avatarUrl = resolveAvatarUrl(user, profile);
  const role: 'admin' | 'user' = user?.is_admin ? 'admin' : 'user';

  const features: AccessFeatures = {
    habits: prioritizeFeature(undefined, plan, ['habits'], true),
    training: prioritizeFeature(user?.has_training_access, plan, ['training'], false),
    nutrition: prioritizeFeature(user?.has_nutrition_access, plan, ['nutrition'], false),
    meditation: prioritizeFeature(user?.has_meditation_access, plan, ['meditation'], false),
    active_breaks: prioritizeFeature(user?.has_pause_access, plan, ['active_breaks', 'pause'], false),
  };

  const planName = plan?.name ?? entitlement?.plan ?? null;
  const planId = plan?.id ?? user?.subscription_plan_id ?? null;
  const planPrice = typeof plan?.price === 'number' ? plan.price : null;

  const normalizedEntitlement = entitlement
    ? {
        plan: entitlement.plan,
        active: entitlement.active === true,
        stripeCustomerId: entitlement.stripe_customer_id ?? null,
        stripeSubscriptionId: entitlement.stripe_subscription_id ?? null,
      }
    : null;

  return {
    id,
    email,
    displayName,
    avatarUrl,
    role,
    plan: {
      id: planId,
      name: planName,
      price: planPrice,
    },
    entitlement: normalizedEntitlement,
    features,
    raw: {
      user,
      profile,
      plan,
      entitlement,
    },
  };
};
