import { createServerClient } from "@/lib/database/supabase-server";
import { logger } from "@/lib/observability/logger";
import type { Database } from "@/lib/database/types";

type ListingRow = Database["public"]["Tables"]["listings"]["Row"];
type ListingFactRow = Database["public"]["Tables"]["listing_facts"]["Row"];

// ─── Input Types ─────────────────────────────────────────────────────────────

export interface ListingSearchCriteria {
  listing_type?: string; // "sale" | "rent"
  property_type?: string; // "single_family" | "condo" | "townhouse" etc.
  min_price_cents?: number;
  max_price_cents?: number;
  min_bedrooms?: number;
  max_bedrooms?: number;
  min_bathrooms?: number;
  city?: string;
  state?: string;
  zip?: string;
  limit?: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Listings older than this many days are considered stale */
const FRESHNESS_THRESHOLD_DAYS = 30;

// ─── Service Functions ───────────────────────────────────────────────────────

/**
 * Search listings by property criteria (type, price range, bedrooms, location).
 */
export async function searchListings(
  tenantId: string,
  criteria: ListingSearchCriteria
): Promise<ListingRow[]> {
  const supabase = await createServerClient();

  let query = supabase
    .from("listings")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .order("price_cents", { ascending: true });

  if (criteria.listing_type) {
    query = query.eq("listing_type", criteria.listing_type);
  }
  if (criteria.property_type) {
    query = query.eq("property_type", criteria.property_type);
  }
  if (criteria.min_price_cents !== undefined) {
    query = query.gte("price_cents", criteria.min_price_cents);
  }
  if (criteria.max_price_cents !== undefined) {
    query = query.lte("price_cents", criteria.max_price_cents);
  }
  if (criteria.min_bedrooms !== undefined) {
    query = query.gte("bedrooms", criteria.min_bedrooms);
  }
  if (criteria.max_bedrooms !== undefined) {
    query = query.lte("bedrooms", criteria.max_bedrooms);
  }
  if (criteria.min_bathrooms !== undefined) {
    query = query.gte("bathrooms", criteria.min_bathrooms);
  }
  if (criteria.city) {
    query = query.ilike("city", `%${criteria.city}%`);
  }
  if (criteria.state) {
    query = query.eq("state", criteria.state);
  }
  if (criteria.zip) {
    query = query.eq("zip", criteria.zip);
  }

  query = query.limit(criteria.limit ?? 25);

  const { data, error } = await query;

  if (error) {
    logger.error("Failed to search listings", { tenantId, error: error.message });
    throw new Error(`Failed to search listings: ${error.message}`);
  }

  return (data ?? []) as ListingRow[];
}

/**
 * Get approved facts for a listing (structured property details).
 */
export async function getListingFacts(
  tenantId: string,
  listingId: string
): Promise<ListingFactRow[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("listing_facts")
    .select("*")
    .eq("listing_id", listingId)
    .eq("tenant_id", tenantId)
    .order("sort_order", { ascending: true });

  if (error) {
    logger.error("Failed to get listing facts", { tenantId, listingId, error: error.message });
    throw new Error(`Failed to get listing facts: ${error.message}`);
  }

  return (data ?? []) as ListingFactRow[];
}

/**
 * Check if listing data is still fresh (updated within threshold).
 */
export async function checkListingFreshness(
  tenantId: string,
  listingId: string
): Promise<{ is_fresh: boolean; last_updated: string; days_since_update: number }> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("listings")
    .select("updated_at")
    .eq("id", listingId)
    .eq("tenant_id", tenantId)
    .single();

  if (error || !data) {
    throw new Error("Listing not found");
  }

  const updatedAt = new Date(data.updated_at);
  const now = new Date();
  const diffMs = now.getTime() - updatedAt.getTime();
  const daysSinceUpdate = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return {
    is_fresh: daysSinceUpdate <= FRESHNESS_THRESHOLD_DAYS,
    last_updated: data.updated_at,
    days_since_update: daysSinceUpdate,
  };
}

/**
 * Get a listing with its assigned agent and showing availability.
 */
export async function getListingForAgent(
  tenantId: string,
  listingId: string
): Promise<ListingRow & { agent: { id: string; first_name: string; last_name: string; phone: string | null } | null }> {
  const supabase = await createServerClient();

  const { data: listing, error: listErr } = await supabase
    .from("listings")
    .select("*")
    .eq("id", listingId)
    .eq("tenant_id", tenantId)
    .single();

  if (listErr || !listing) {
    throw new Error("Listing not found");
  }

  let agent: { id: string; first_name: string; last_name: string; phone: string | null } | null = null;

  if (listing.agent_id) {
    const { data: agentData } = await supabase
      .from("re_agents")
      .select("id, first_name, last_name, phone")
      .eq("id", listing.agent_id)
      .eq("tenant_id", tenantId)
      .single();

    if (agentData) {
      agent = agentData;
    }
  }

  return {
    ...(listing as ListingRow),
    agent,
  };
}
