import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase";
import type { PlanId } from "@/lib/payments";

export type PricingSettings = {
  movie: number; series: number; vertical: number; adult: number; vip: number;
  planDays: number; defaultRentalPrice: number; rentalHours: number;
};

export const defaultPricing: PricingSettings = {
  movie: 5900, series: 5900, vertical: 5900, adult: 5900, vip: 12900,
  planDays: 30, defaultRentalPrice: 5900, rentalHours: 72,
};

export async function getPricingSettings(): Promise<PricingSettings> {
  const { data, error } = await createSupabaseAdminClient().from("pricing_settings").select("*").eq("id", true).maybeSingle();
  if (error || !data) return defaultPricing;
  return {
    movie: data.movie_price, series: data.series_price, vertical: data.vertical_price,
    adult: data.adult_price, vip: data.vip_price, planDays: data.plan_days,
    defaultRentalPrice: data.default_rental_price, rentalHours: data.rental_hours,
  };
}

export function planPrice(settings: PricingSettings, plan: PlanId) { return settings[plan]; }
