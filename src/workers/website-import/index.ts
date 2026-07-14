import { z } from 'zod';
import { logger } from '@/lib/observability/logger';
import { createClient } from '@/lib/database/supabase-server';
import type { IndustryId } from '@/industries/core/industry-pack';
import {
  extractBusinessInfo,
  extractHealthcareInfo,
  extractRestaurantInfo,
  extractRealEstateInfo,
  type ExtractedBusinessInfo,
  type ExtractedHealthcareInfo,
  type ExtractedRestaurantInfo,
  type ExtractedRealEstateInfo,
} from './extractors';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WebsiteImportResult {
  tenantId: string;
  url: string;
  pagesProcessed: number;
  factsExtracted: number;
  conflicts: FactConflict[];
  importedAt: string;
}

export interface ExtractedFact {
  category: string;
  key: string;
  value: string;
  confidence: number;
  source_url: string;
}

export interface FactConflict {
  key: string;
  existing_value: string;
  new_value: string;
  resolution: 'keep_existing' | 'use_new' | 'needs_review';
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_PAGES = 10;
const FETCH_TIMEOUT_MS = 15_000;
const USER_AGENT = 'VerticalVoice-Importer/1.0';
const BATCH_SIZE = 50;

// ─── Validation ─────────────────────────────────────────────────────────────

const importRequestSchema = z.object({
  tenantId: z.string().uuid('tenantId must be a valid UUID'),
  url: z.string().url('Must be a valid URL'),
  industryId: z.enum(['healthcare', 'restaurant', 'real_estate'] as const),
});

// ─── URL Discovery ──────────────────────────────────────────────────────────

/**
 * Extract internal links from HTML. Returns unique absolute URLs
 * belonging to the same origin.
 */
function extractLinks(html: string, baseUrl: string): string[] {
  const links = new Set<string>();
  const baseOrigin = new URL(baseUrl).hostname;

  const hrefPattern = /href=["']([^"'#]+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = hrefPattern.exec(html)) !== null) {
    const href = match[1];
    try {
      const resolved = new URL(href, baseUrl);
      if (resolved.hostname === baseOrigin) {
        // Skip non-page resources
        const ext = resolved.pathname.split('.').pop()?.toLowerCase();
        if (!ext || ['html', 'htm', 'php', 'asp', 'aspx', ''].includes(ext)) {
          // Strip fragment and query for dedup
          resolved.hash = '';
          const normalized = resolved.href.replace(/\/$/, '');
          links.add(normalized);
        }
      }
    } catch {
      // Skip malformed URLs
    }
  }

  return Array.from(links);
}

/**
 * Attempt to find and fetch sitemap.xml for additional URLs.
 */
async function fetchSitemapUrls(baseUrl: string): Promise<string[]> {
  try {
    const origin = new URL(baseUrl).origin;
    const sitemapUrl = `${origin}/sitemap.xml`;

    const response = await fetch(sitemapUrl, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok) return [];

    const xml = await response.text();
    const urls: string[] = [];

    const locPattern = /<loc>\s*([^<]+)\s*<\/loc>/gi;
    let match: RegExpExecArray | null;
    while ((match = locPattern.exec(xml)) !== null) {
      urls.push(match[1].trim());
    }

    return urls;
  } catch {
    logger.debug('website-import: sitemap fetch failed', { baseUrl });
    return [];
  }
}

/**
 * Prioritize pages likely to contain business information.
 */
function prioritizePages(urls: string[]): string[] {
  const priorityKeywords = [
    'about', 'contact', 'services', 'team', 'staff', 'providers', 'doctors',
    'menu', 'hours', 'location', 'listings', 'agents', 'insurance', 'faq',
    'pricing', 'specialties', 'appointments',
  ];

  const scored = urls.map((url) => {
    const lower = url.toLowerCase();
    const keywordScore = priorityKeywords.reduce(
      (score, kw) => score + (lower.includes(kw) ? 1 : 0),
      0,
    );
    return { url, score: keywordScore };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, MAX_PAGES).map((s) => s.url);
}

// ─── Page Fetching ──────────────────────────────────────────────────────────

async function fetchPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      logger.warn('website-import: page fetch failed', { url, status: response.status });
      return null;
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html')) {
      logger.debug('website-import: skipping non-HTML', { url, contentType });
      return null;
    }

    return await response.text();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn('website-import: page fetch error', { url, error: message });
    return null;
  }
}

// ─── Fact Extraction ────────────────────────────────────────────────────────

/**
 * Extract facts from HTML based on the industry type.
 * Delegates to extractors module for the actual parsing.
 */
function extractFacts(html: string, industryId: IndustryId, sourceUrl: string): ExtractedFact[] {
  const facts: ExtractedFact[] = [];

  // Always extract basic business info
  const businessInfo = extractBusinessInfo(html);
  facts.push(...businessInfoToFacts(businessInfo, sourceUrl));

  // Extract industry-specific information
  switch (industryId) {
    case 'healthcare': {
      const info = extractHealthcareInfo(html);
      facts.push(...healthcareInfoToFacts(info, sourceUrl));
      break;
    }
    case 'restaurant': {
      const info = extractRestaurantInfo(html);
      facts.push(...restaurantInfoToFacts(info, sourceUrl));
      break;
    }
    case 'real_estate': {
      const info = extractRealEstateInfo(html);
      facts.push(...realEstateInfoToFacts(info, sourceUrl));
      break;
    }
  }

  return facts;
}

// ─── Fact Converters ────────────────────────────────────────────────────────

function businessInfoToFacts(info: ExtractedBusinessInfo, sourceUrl: string): ExtractedFact[] {
  const facts: ExtractedFact[] = [];

  if (info.name) {
    facts.push({ category: 'business', key: 'business_name', value: info.name, confidence: 0.9, source_url: sourceUrl });
  }
  if (info.phone) {
    facts.push({ category: 'business', key: 'phone', value: info.phone, confidence: 0.95, source_url: sourceUrl });
  }
  if (info.email) {
    facts.push({ category: 'business', key: 'email', value: info.email, confidence: 0.95, source_url: sourceUrl });
  }
  if (info.address) {
    facts.push({ category: 'business', key: 'address', value: info.address, confidence: 0.8, source_url: sourceUrl });
  }
  for (const hours of info.hours) {
    facts.push({
      category: 'hours',
      key: `hours_${hours.day.toLowerCase()}`,
      value: `${hours.open}-${hours.close}`,
      confidence: 0.85,
      source_url: sourceUrl,
    });
  }

  return facts;
}

function healthcareInfoToFacts(info: ExtractedHealthcareInfo, sourceUrl: string): ExtractedFact[] {
  const facts: ExtractedFact[] = [];

  for (const provider of info.providers) {
    const key = `provider_${provider.name.replace(/\s+/g, '_').toLowerCase()}`;
    facts.push({
      category: 'healthcare_providers',
      key,
      value: JSON.stringify(provider),
      confidence: 0.85,
      source_url: sourceUrl,
    });
  }

  for (const service of info.services) {
    facts.push({
      category: 'healthcare_services',
      key: `service_${service.replace(/\s+/g, '_').toLowerCase()}`,
      value: service,
      confidence: 0.8,
      source_url: sourceUrl,
    });
  }

  for (const ins of info.insurance_accepted) {
    facts.push({
      category: 'insurance',
      key: `insurance_${ins.replace(/\s+/g, '_').toLowerCase()}`,
      value: ins,
      confidence: 0.75,
      source_url: sourceUrl,
    });
  }

  for (const specialty of info.specialties) {
    facts.push({
      category: 'specialties',
      key: `specialty_${specialty.replace(/\s+/g, '_').toLowerCase()}`,
      value: specialty,
      confidence: 0.85,
      source_url: sourceUrl,
    });
  }

  return facts;
}

function restaurantInfoToFacts(info: ExtractedRestaurantInfo, sourceUrl: string): ExtractedFact[] {
  const facts: ExtractedFact[] = [];

  for (const item of info.menu_items) {
    facts.push({
      category: 'menu',
      key: `menu_${item.name.replace(/\s+/g, '_').toLowerCase()}`,
      value: JSON.stringify(item),
      confidence: 0.85,
      source_url: sourceUrl,
    });
  }

  for (const cuisine of info.cuisine_types) {
    facts.push({
      category: 'cuisine',
      key: `cuisine_${cuisine.toLowerCase()}`,
      value: cuisine,
      confidence: 0.8,
      source_url: sourceUrl,
    });
  }

  for (const option of info.dietary_options) {
    facts.push({
      category: 'dietary',
      key: `dietary_${option.replace(/\s+/g, '_').toLowerCase()}`,
      value: option,
      confidence: 0.8,
      source_url: sourceUrl,
    });
  }

  if (info.reservation_info) {
    facts.push({
      category: 'reservations',
      key: 'reservation_info',
      value: info.reservation_info,
      confidence: 0.8,
      source_url: sourceUrl,
    });
  }

  return facts;
}

function realEstateInfoToFacts(info: ExtractedRealEstateInfo, sourceUrl: string): ExtractedFact[] {
  const facts: ExtractedFact[] = [];

  for (const listing of info.listings) {
    facts.push({
      category: 'listings',
      key: `listing_${listing.address.replace(/\s+/g, '_').toLowerCase().slice(0, 50)}`,
      value: JSON.stringify(listing),
      confidence: 0.8,
      source_url: sourceUrl,
    });
  }

  for (const agent of info.agents) {
    facts.push({
      category: 'agents',
      key: `agent_${agent.name.replace(/\s+/g, '_').toLowerCase()}`,
      value: JSON.stringify(agent),
      confidence: 0.85,
      source_url: sourceUrl,
    });
  }

  for (const service of info.services) {
    facts.push({
      category: 'services',
      key: `service_${service.replace(/\s+/g, '_').toLowerCase()}`,
      value: service,
      confidence: 0.8,
      source_url: sourceUrl,
    });
  }

  for (const area of info.service_areas) {
    facts.push({
      category: 'service_areas',
      key: `area_${area.replace(/\s+/g, '_').toLowerCase()}`,
      value: area,
      confidence: 0.75,
      source_url: sourceUrl,
    });
  }

  return facts;
}

// ─── Schema Mapping ─────────────────────────────────────────────────────────

/**
 * Map extracted facts to the industry's knowledge schema.
 * Filters facts to those relevant for the industry.
 */
function mapToIndustrySchema(facts: ExtractedFact[], industryId: IndustryId): ExtractedFact[] {
  const validCategories: Record<IndustryId, string[]> = {
    healthcare: ['business', 'hours', 'healthcare_providers', 'healthcare_services', 'insurance', 'specialties'],
    restaurant: ['business', 'hours', 'menu', 'cuisine', 'dietary', 'reservations'],
    real_estate: ['business', 'hours', 'listings', 'agents', 'services', 'service_areas'],
  };

  const allowed = validCategories[industryId] ?? [];
  return facts.filter((f) => allowed.includes(f.category));
}

// ─── Deduplication ──────────────────────────────────────────────────────────

function deduplicateFacts(facts: ExtractedFact[]): ExtractedFact[] {
  const byKey = new Map<string, ExtractedFact>();

  for (const fact of facts) {
    const existing = byKey.get(fact.key);
    if (!existing || fact.confidence > existing.confidence) {
      byKey.set(fact.key, fact);
    }
  }

  return Array.from(byKey.values());
}

// ─── Conflict Detection ─────────────────────────────────────────────────────

/**
 * Detect conflicts between existing DB facts and newly extracted facts.
 * Higher-confidence new facts override lower-confidence existing ones.
 */
function detectConflicts(
  existingFacts: Array<{ fact_text: string; category: string | null; confidence: number }>,
  newFacts: ExtractedFact[],
): { toInsert: ExtractedFact[]; conflicts: FactConflict[] } {
  // Build a lookup from existing facts by parsing "key: value" format
  const existingByKey = new Map<string, { value: string; confidence: number }>();
  for (const ef of existingFacts) {
    // Our facts are stored as "key: value" in fact_text
    const colonIdx = ef.fact_text.indexOf(':');
    if (colonIdx > 0) {
      const key = ef.fact_text.slice(0, colonIdx).trim();
      const value = ef.fact_text.slice(colonIdx + 1).trim();
      existingByKey.set(key, { value, confidence: ef.confidence });
    }
  }

  const toInsert: ExtractedFact[] = [];
  const conflicts: FactConflict[] = [];

  for (const nf of newFacts) {
    const existing = existingByKey.get(nf.key);

    if (!existing) {
      // No conflict -- new fact
      toInsert.push(nf);
      continue;
    }

    if (existing.value === nf.value) {
      // Same value, skip
      continue;
    }

    // Values differ -- determine resolution
    let resolution: FactConflict['resolution'];
    if (nf.confidence > existing.confidence + 0.1) {
      resolution = 'use_new';
      toInsert.push(nf);
    } else if (existing.confidence > nf.confidence + 0.1) {
      resolution = 'keep_existing';
    } else {
      resolution = 'needs_review';
    }

    conflicts.push({
      key: nf.key,
      existing_value: existing.value,
      new_value: nf.value,
      resolution,
    });
  }

  return { toInsert, conflicts };
}

// ─── Main Worker ────────────────────────────────────────────────────────────

export async function importWebsite(
  tenantId: string,
  url: string,
  industryId: IndustryId,
): Promise<WebsiteImportResult> {
  const validated = importRequestSchema.parse({ tenantId, url, industryId });

  logger.info('website-import: starting import', {
    tenantId: validated.tenantId,
    url: validated.url,
    industryId: validated.industryId,
  });

  const supabase = await createClient();

  try {
    // 1. Fetch the main page
    const mainHtml = await fetchPage(validated.url);
    if (!mainHtml) {
      throw new Error(`Failed to fetch main page: ${validated.url}`);
    }

    // 2. Discover pages (links from main page + sitemap)
    const linkedUrls = extractLinks(mainHtml, validated.url);
    const sitemapUrls = await fetchSitemapUrls(validated.url);

    // Merge, deduplicate, and prioritize
    const allUrls = Array.from(new Set([validated.url, ...linkedUrls, ...sitemapUrls]));
    const pagesToProcess = prioritizePages(allUrls);

    logger.info('website-import: pages discovered', {
      linkedCount: linkedUrls.length,
      sitemapCount: sitemapUrls.length,
      totalUnique: allUrls.length,
      processing: pagesToProcess.length,
    });

    // 3. Fetch and extract facts from each page
    const allFacts: ExtractedFact[] = [];
    let pagesProcessed = 0;

    for (const pageUrl of pagesToProcess) {
      // Reuse main page HTML if it's the first URL
      const html = pageUrl === validated.url ? mainHtml : await fetchPage(pageUrl);
      if (!html) continue;

      const pageFacts = extractFacts(html, validated.industryId, pageUrl);
      allFacts.push(...pageFacts);
      pagesProcessed++;

      logger.debug('website-import: page processed', { pageUrl, factsExtracted: pageFacts.length });
    }

    // 4. Map to industry schema and deduplicate
    const mappedFacts = mapToIndustrySchema(allFacts, validated.industryId);
    const dedupedFacts = deduplicateFacts(mappedFacts);

    // 5. Load existing facts for conflict detection
    const { data: existingFacts } = await supabase
      .from('knowledge_facts')
      .select('fact_text, category, confidence')
      .eq('tenant_id', validated.tenantId);

    const { toInsert, conflicts } = detectConflicts(existingFacts ?? [], dedupedFacts);

    // 6. Save non-conflicting facts to knowledge_facts
    if (toInsert.length > 0) {
      const rows = toInsert.map((f) => ({
        tenant_id: validated.tenantId,
        fact_text: `${f.key}: ${f.value}`,
        category: f.category,
        confidence: f.confidence,
        is_verified: false,
      }));

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const { error: insertError } = await supabase
          .from('knowledge_facts')
          .insert(batch);

        if (insertError) {
          logger.warn('website-import: failed to insert facts batch', {
            batchIndex: i,
            error: insertError.message,
          });
        }
      }
    }

    // 7. Log the import to audit_events
    const { error: auditError } = await supabase
      .from('audit_events')
      .insert({
        tenant_id: validated.tenantId,
        action: 'website_imported',
        resource_type: 'knowledge_fact',
        metadata: {
          url: validated.url,
          industryId: validated.industryId,
          pagesProcessed,
          totalFactsExtracted: dedupedFacts.length,
          factsImported: toInsert.length,
          conflictsDetected: conflicts.length,
        },
      });

    if (auditError) {
      logger.warn('website-import: failed to log audit event', { error: auditError.message });
    }

    const importedAt = new Date().toISOString();

    logger.info('website-import: import complete', {
      tenantId: validated.tenantId,
      url: validated.url,
      pagesProcessed,
      factsExtracted: toInsert.length,
      conflicts: conflicts.length,
    });

    return {
      tenantId: validated.tenantId,
      url: validated.url,
      pagesProcessed,
      factsExtracted: toInsert.length,
      conflicts,
      importedAt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('website-import: import failed', {
      tenantId: validated.tenantId,
      url: validated.url,
      error: message,
    });
    throw error;
  }
}
