import { getEffectivePlan } from '@/lib/admin';

/**
 * Returns true if the user has any paid plan (pro, lifetime, or override).
 */
export function hasPaidPlan(userId: string): boolean {
  const { plan } = getEffectivePlan(userId);
  return plan === 'pro' || plan === 'lifetime';
}

/**
 * Returns true if the user has a lifetime deal.
 */
export function isLifetime(userId: string): boolean {
  const { plan } = getEffectivePlan(userId);
  return plan === 'lifetime';
}
