/**
 * HTML fact extractors — pure functions that extract structured business
 * information from raw HTML using regex and string parsing.
 * No external DOM libraries required.
 */

import { logger } from '@/lib/observability/logger';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface BusinessHours {
  day: string;
  open: string;
  close: string;
}

export interface ExtractedBusinessInfo {
  name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  hours: BusinessHours[];
}

// Healthcare -----------------------------------------------------------------

export interface ProviderInfo {
  name: string;
  title: string | null;
  specialty: string | null;
}

export interface ExtractedHealthcareInfo {
  providers: ProviderInfo[];
  services: string[];
  insurance_accepted: string[];
  specialties: string[];
}

// Restaurant -----------------------------------------------------------------

export interface MenuItem {
  name: string;
  price: string | null;
  description: string | null;
  category: string | null;
}

export interface ExtractedRestaurantInfo {
  menu_items: MenuItem[];
  cuisine_types: string[];
  dietary_options: string[];
  reservation_info: string | null;
}

// Real Estate ----------------------------------------------------------------

export interface ListingInfo {
  address: string;
  price: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  status: string | null;
}

export interface AgentInfo {
  name: string;
  phone: string | null;
  email: string | null;
  title: string | null;
}

export interface ExtractedRealEstateInfo {
  listings: ListingInfo[];
  agents: AgentInfo[];
  services: string[];
  service_areas: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip all HTML tags and collapse whitespace. */
export function stripHtml(html: string): string {
  let text = html
    // Remove script / style blocks entirely
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    // Strip remaining tags
    .replace(/<[^>]+>/g, ' ');

  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(Number(code)));

  // Collapse whitespace
  return text.replace(/\s+/g, ' ').trim();
}

/** Extract the `content` attribute of a <meta> tag by property or name. */
export function extractMetaContent(
  html: string,
  property: string,
): string | null {
  // Match property="..." or name="..."
  const pattern = new RegExp(
    `<meta\\s+[^>]*(?:property|name)=["']${escapeRegex(property)}["'][^>]*content=["']([^"']*)["']` +
      `|<meta\\s+[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${escapeRegex(property)}["']`,
    'i',
  );
  const match = html.match(pattern);
  if (!match) return null;
  return (match[1] ?? match[2] ?? '').trim() || null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Deduplicate an array of strings (case-insensitive), preserving first occurrence casing. */
function dedup(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase().trim();
    if (key && !seen.has(key)) {
      seen.add(key);
      result.push(item.trim());
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// extractBusinessInfo
// ---------------------------------------------------------------------------

export function extractBusinessInfo(html: string): ExtractedBusinessInfo {
  const text = stripHtml(html);

  // --- Business name ---
  let name: string | null = null;

  // Try og:title first
  const ogTitle = extractMetaContent(html, 'og:title');
  if (ogTitle) {
    name = ogTitle;
  }

  // Fallback to <title>
  if (!name) {
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch) {
      name = stripHtml(titleMatch[1]).split(/[|\-–—]/)[0].trim() || null;
    }
  }

  // Fallback to first <h1>
  if (!name) {
    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (h1Match) {
      name = stripHtml(h1Match[1]) || null;
    }
  }

  // --- Phone ---
  const phonePattern =
    /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const phoneMatches = text.match(phonePattern);
  const phone = phoneMatches ? phoneMatches[0].trim() : null;

  // --- Email ---
  const emailPattern =
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emailMatches = text.match(emailPattern);
  const email = emailMatches ? emailMatches[0].trim() : null;

  // --- Address ---
  // Look for patterns like: 123 Main St, City, ST 12345
  const addressPattern =
    /\d{1,5}\s+[\w\s.]+(?:St(?:reet)?|Ave(?:nue)?|Blvd|Boulevard|Dr(?:ive)?|Rd|Road|Ln|Lane|Way|Ct|Court|Pl(?:ace)?|Pkwy|Parkway|Cir(?:cle)?)\b[.,]?\s*[\w\s]*[.,]?\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?/gi;
  const addressMatches = text.match(addressPattern);
  const address = addressMatches
    ? addressMatches[0].replace(/\s+/g, ' ').trim()
    : null;

  // --- Business hours ---
  const hours: BusinessHours[] = [];
  const days =
    '(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)';
  const timePattern = '\\d{1,2}(?::\\d{2})?\\s*(?:AM|PM|am|pm|a\\.m\\.|p\\.m\\.)';
  const hoursPattern = new RegExp(
    `(${days})\\s*[:\\-–—]?\\s*(${timePattern})\\s*[\\-–—to]+\\s*(${timePattern})`,
    'gi',
  );
  let hoursMatch: RegExpExecArray | null;
  while ((hoursMatch = hoursPattern.exec(text)) !== null) {
    hours.push({
      day: hoursMatch[1],
      open: hoursMatch[2].trim(),
      close: hoursMatch[3].trim(),
    });
  }

  logger.debug('extractBusinessInfo completed', {
    hasName: !!name,
    hasPhone: !!phone,
    hasEmail: !!email,
    hasAddress: !!address,
    hoursCount: hours.length,
  });

  return { name, phone, email, address, hours };
}

// ---------------------------------------------------------------------------
// extractHealthcareInfo
// ---------------------------------------------------------------------------

const MEDICAL_TITLES = [
  'MD',
  'M\\.D\\.',
  'DO',
  'D\\.O\\.',
  'NP',
  'N\\.P\\.',
  'PA',
  'P\\.A\\.',
  'PA-C',
  'DDS',
  'DMD',
  'DPM',
  'OD',
  'PharmD',
  'PhD',
  'RN',
  'APRN',
  'DNP',
  'FNP',
  'CRNA',
];

const MEDICAL_SPECIALTIES = [
  'Cardiology',
  'Dermatology',
  'Endocrinology',
  'Family Medicine',
  'Family Practice',
  'Gastroenterology',
  'General Surgery',
  'Hematology',
  'Immunology',
  'Internal Medicine',
  'Nephrology',
  'Neurology',
  'Neurosurgery',
  'Obstetrics',
  'Gynecology',
  'OB/GYN',
  'Oncology',
  'Ophthalmology',
  'Orthopedics',
  'Otolaryngology',
  'ENT',
  'Pathology',
  'Pediatrics',
  'Physical Medicine',
  'Plastic Surgery',
  'Podiatry',
  'Psychiatry',
  'Pulmonology',
  'Radiology',
  'Rheumatology',
  'Sports Medicine',
  'Urology',
  'Urgent Care',
  'Primary Care',
  'Anesthesiology',
  'Emergency Medicine',
  'Pain Management',
  'Allergy',
  'Chiropractic',
  'Physical Therapy',
  'Occupational Therapy',
];

const INSURANCE_COMPANIES = [
  'Aetna',
  'Anthem',
  'Blue Cross',
  'Blue Shield',
  'BCBS',
  'Cigna',
  'Humana',
  'Kaiser',
  'Kaiser Permanente',
  'Medicare',
  'Medicaid',
  'Molina',
  'Oscar',
  'Oxford',
  'UnitedHealthcare',
  'United Healthcare',
  'UHC',
  'WellCare',
  'Centene',
  'Tricare',
  'Ambetter',
  'Bright Health',
  'CareSource',
  'Carefirst',
  'Geisinger',
  'HealthFirst',
  'Highmark',
  'Horizon',
  'Independence Blue Cross',
  'MVP Health Care',
  'Priority Health',
];

export function extractHealthcareInfo(html: string): ExtractedHealthcareInfo {
  const text = stripHtml(html);

  // --- Providers ---
  const providers: ProviderInfo[] = [];

  // "Dr. FirstName LastName" pattern
  const drPattern =
    /Dr\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/g;
  let drMatch: RegExpExecArray | null;
  while ((drMatch = drPattern.exec(text)) !== null) {
    providers.push({
      name: `Dr. ${drMatch[1].trim()}`,
      title: 'Dr.',
      specialty: null,
    });
  }

  // "FirstName LastName, MD/DO/NP/PA..." pattern
  const titlesJoined = MEDICAL_TITLES.join('|');
  const credPattern = new RegExp(
    `([A-Z][a-z]+(?:\\s+[A-Z][a-z]+){1,2}),?\\s+(${titlesJoined})\\b`,
    'g',
  );
  let credMatch: RegExpExecArray | null;
  while ((credMatch = credPattern.exec(text)) !== null) {
    const pName = credMatch[1].trim();
    // Avoid duplicates with the Dr. pattern
    if (!providers.some((p) => p.name.includes(pName))) {
      providers.push({
        name: pName,
        title: credMatch[2].replace(/\\/g, ''),
        specialty: null,
      });
    }
  }

  // --- Specialties ---
  const specialties: string[] = [];
  for (const spec of MEDICAL_SPECIALTIES) {
    const specRe = new RegExp(`\\b${escapeRegex(spec)}\\b`, 'i');
    if (specRe.test(text)) {
      specialties.push(spec);
    }
  }

  // Backfill provider specialties when text has "Dr. X ... specialty" nearby
  for (const provider of providers) {
    const shortName = provider.name.replace(/^Dr\.?\s*/, '');
    for (const spec of specialties) {
      const nearbyRe = new RegExp(
        `${escapeRegex(shortName)}[^.]{0,80}${escapeRegex(spec)}` +
          `|${escapeRegex(spec)}[^.]{0,80}${escapeRegex(shortName)}`,
        'i',
      );
      if (nearbyRe.test(text)) {
        provider.specialty = spec;
        break;
      }
    }
  }

  // --- Services ---
  const services: string[] = [];
  // Look for list items near service-related headings
  const serviceSection =
    html.match(
      /(?:services|treatments|procedures|what we (?:offer|treat))[^<]*<\/(?:h[1-6]|p|div|span)>([\s\S]{0,3000}?)(?=<(?:h[1-6]|footer|section))/i,
    )?.[1] ?? '';
  if (serviceSection) {
    const liPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let liMatch: RegExpExecArray | null;
    while ((liMatch = liPattern.exec(serviceSection)) !== null) {
      const svc = stripHtml(liMatch[1]).trim();
      if (svc.length > 2 && svc.length < 120) {
        services.push(svc);
      }
    }
  }

  // --- Insurance accepted ---
  const insurance: string[] = [];
  for (const ins of INSURANCE_COMPANIES) {
    const insRe = new RegExp(`\\b${escapeRegex(ins)}\\b`, 'i');
    if (insRe.test(text)) {
      insurance.push(ins);
    }
  }

  logger.debug('extractHealthcareInfo completed', {
    providerCount: providers.length,
    serviceCount: services.length,
    insuranceCount: insurance.length,
    specialtyCount: specialties.length,
  });

  return {
    providers,
    services: dedup(services),
    insurance_accepted: dedup(insurance),
    specialties: dedup(specialties),
  };
}

// ---------------------------------------------------------------------------
// extractRestaurantInfo
// ---------------------------------------------------------------------------

const CUISINE_TYPES = [
  'Italian',
  'Mexican',
  'Chinese',
  'Japanese',
  'Thai',
  'Indian',
  'French',
  'Mediterranean',
  'Greek',
  'Korean',
  'Vietnamese',
  'American',
  'Southern',
  'Cajun',
  'Creole',
  'BBQ',
  'Barbecue',
  'Seafood',
  'Steakhouse',
  'Sushi',
  'Pizza',
  'Tapas',
  'Latin',
  'Caribbean',
  'Middle Eastern',
  'Ethiopian',
  'Peruvian',
  'Brazilian',
  'Turkish',
  'Spanish',
  'Asian Fusion',
  'Farm-to-Table',
  'Gastropub',
  'Bistro',
  'Diner',
  'Ramen',
  'Dim Sum',
  'Pho',
  'Tex-Mex',
];

const DIETARY_OPTIONS = [
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Gluten Free',
  'Dairy-Free',
  'Dairy Free',
  'Nut-Free',
  'Nut Free',
  'Halal',
  'Kosher',
  'Organic',
  'Paleo',
  'Keto',
  'Low-Carb',
  'Sugar-Free',
  'Plant-Based',
  'Pescatarian',
  'Whole30',
  'Raw',
  'Farm Fresh',
  'Locally Sourced',
];

export function extractRestaurantInfo(html: string): ExtractedRestaurantInfo {
  const text = stripHtml(html);

  // --- Menu items ---
  const menuItems: MenuItem[] = [];

  // Pattern: item name followed by a price like $12.99 or $12
  const pricePattern =
    /([A-Z][A-Za-z\s&',()-]{2,60})\s*[–—-]?\s*\$(\d{1,4}(?:\.\d{2})?)/g;
  let priceMatch: RegExpExecArray | null;
  while ((priceMatch = pricePattern.exec(text)) !== null) {
    const itemName = priceMatch[1].trim();
    // Filter out obviously non-menu things
    if (
      !/\b(?:copyright|reserved|phone|fax|address|hours|contact)\b/i.test(
        itemName,
      )
    ) {
      menuItems.push({
        name: itemName,
        price: `$${priceMatch[2]}`,
        description: null,
        category: null,
      });
    }
  }

  // Also try "$XX.XX ItemName" pattern
  const reversePricePattern =
    /\$(\d{1,4}(?:\.\d{2})?)\s+([A-Z][A-Za-z\s&',()-]{2,60})/g;
  let revMatch: RegExpExecArray | null;
  while ((revMatch = reversePricePattern.exec(text)) !== null) {
    const itemName = revMatch[2].trim();
    const alreadyFound = menuItems.some(
      (mi) => mi.name.toLowerCase() === itemName.toLowerCase(),
    );
    if (
      !alreadyFound &&
      !/\b(?:copyright|reserved|phone|fax|address|hours|contact)\b/i.test(
        itemName,
      )
    ) {
      menuItems.push({
        name: itemName,
        price: `$${revMatch[1]}`,
        description: null,
        category: null,
      });
    }
  }

  // Try to assign categories from nearby headings in the HTML
  const categoryHeadings =
    html.match(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/gi) ?? [];
  const categoryNames = categoryHeadings.map((h) => stripHtml(h));

  for (const item of menuItems) {
    for (const cat of categoryNames) {
      if (
        cat.length > 2 &&
        cat.length < 50 &&
        /\b(?:appetizer|starter|entre|main|dessert|drink|beverage|side|salad|soup|sandwich|burger|pasta|pizza|breakfast|lunch|dinner|brunch|special)/i.test(
          cat,
        )
      ) {
        item.category = cat;
        break;
      }
    }
  }

  // --- Cuisine types ---
  const cuisines: string[] = [];
  for (const cuisine of CUISINE_TYPES) {
    const cuisineRe = new RegExp(`\\b${escapeRegex(cuisine)}\\b`, 'i');
    if (cuisineRe.test(text)) {
      cuisines.push(cuisine);
    }
  }

  // --- Dietary options ---
  const dietary: string[] = [];
  for (const option of DIETARY_OPTIONS) {
    const optRe = new RegExp(`\\b${escapeRegex(option)}\\b`, 'i');
    if (optRe.test(text)) {
      dietary.push(option);
    }
  }

  // --- Reservation info ---
  let reservationInfo: string | null = null;
  const reservationPatterns = [
    /(?:reservations?|book(?:ing)?s?|reserve)\s*[:\-–—]?\s*([^.!?\n]{10,150})/i,
    /(?:call|phone|contact)\s+(?:us\s+)?(?:to|for)\s+(?:make\s+)?(?:a\s+)?reservations?\s*[:\-–—]?\s*([^.!?\n]{5,100})/i,
  ];
  for (const rp of reservationPatterns) {
    const rMatch = text.match(rp);
    if (rMatch) {
      reservationInfo = rMatch[0].trim();
      break;
    }
  }

  // Check for reservation platform mentions
  if (!reservationInfo) {
    const platforms = ['OpenTable', 'Resy', 'Yelp Reservations', 'Tock'];
    for (const platform of platforms) {
      if (text.toLowerCase().includes(platform.toLowerCase())) {
        reservationInfo = `Reservations available via ${platform}`;
        break;
      }
    }
  }

  logger.debug('extractRestaurantInfo completed', {
    menuItemCount: menuItems.length,
    cuisineCount: cuisines.length,
    dietaryCount: dietary.length,
    hasReservationInfo: !!reservationInfo,
  });

  return {
    menu_items: menuItems,
    cuisine_types: dedup(cuisines),
    dietary_options: dedup(dietary),
    reservation_info: reservationInfo,
  };
}

// ---------------------------------------------------------------------------
// extractRealEstateInfo
// ---------------------------------------------------------------------------

const RE_SERVICES = [
  'Buying',
  'Selling',
  'Renting',
  'Leasing',
  'Property Management',
  'Commercial Real Estate',
  'Residential Real Estate',
  'Investment Properties',
  'Luxury Homes',
  'Foreclosures',
  'Short Sales',
  'New Construction',
  'Relocation',
  'Home Staging',
  'Home Valuation',
  'Market Analysis',
  'Mortgage',
  'Title Services',
  'Home Inspection',
  'Appraisal',
  'First-Time Buyers',
  'Vacation Homes',
  'Land',
  'Lots',
  'Condos',
  'Townhomes',
  'Multi-Family',
];

export function extractRealEstateInfo(html: string): ExtractedRealEstateInfo {
  const text = stripHtml(html);

  // --- Listings ---
  const listings: ListingInfo[] = [];

  // Price pattern: $123,456 or $1,234,567
  const listingPattern =
    /\$(\d{1,3}(?:,\d{3})+(?:\.\d{2})?)\s[\s\S]{0,300}?(\d+)\s*(?:bed(?:room)?s?|br|BD)\b[\s\S]{0,100}?(\d+(?:\.\d)?)\s*(?:bath(?:room)?s?|ba|BA)\b/gi;
  let listingMatch: RegExpExecArray | null;
  while ((listingMatch = listingPattern.exec(text)) !== null) {
    const surroundingText = text.slice(
      Math.max(0, listingMatch.index - 100),
      listingMatch.index + listingMatch[0].length + 200,
    );

    // Try to extract address from surrounding text
    const addrMatch = surroundingText.match(
      /\d{1,5}\s+[\w\s.]+(?:St(?:reet)?|Ave(?:nue)?|Blvd|Dr(?:ive)?|Rd|Road|Ln|Lane|Way|Ct|Court)/i,
    );

    // Try to extract sqft
    const sqftMatch = surroundingText.match(
      /(\d{1,2},?\d{3})\s*(?:sq\.?\s*ft\.?|square\s*feet|SF)/i,
    );

    // Try to extract status
    let status: string | null = null;
    const statusPatterns = [
      'For Sale',
      'Sold',
      'Pending',
      'Under Contract',
      'Active',
      'Coming Soon',
      'For Rent',
      'Price Reduced',
    ];
    for (const sp of statusPatterns) {
      if (surroundingText.toLowerCase().includes(sp.toLowerCase())) {
        status = sp;
        break;
      }
    }

    listings.push({
      address: addrMatch ? addrMatch[0].trim() : 'Address not found',
      price: `$${listingMatch[1]}`,
      bedrooms: parseInt(listingMatch[2], 10),
      bathrooms: parseFloat(listingMatch[3]),
      sqft: sqftMatch
        ? parseInt(sqftMatch[1].replace(',', ''), 10)
        : null,
      status,
    });
  }

  // --- Agents ---
  const agents: AgentInfo[] = [];
  const agentTitles = [
    'Realtor',
    'Real Estate Agent',
    'Broker',
    'Associate Broker',
    'Sales Associate',
    'Managing Broker',
    'Team Lead',
    'Listing Agent',
    'Buyer.?s? Agent',
  ];
  const agentTitlePattern = agentTitles.join('|');

  // "Name, Title" or "Name | Title" pattern
  const agentPattern = new RegExp(
    `([A-Z][a-z]+(?:\\s+[A-Z][a-z]+){1,2})\\s*[,|–—-]\\s*(${agentTitlePattern})`,
    'gi',
  );
  let agentMatch: RegExpExecArray | null;
  while ((agentMatch = agentPattern.exec(text)) !== null) {
    const agentName = agentMatch[1].trim();

    // Look for contact info nearby
    const nearby = text.slice(
      agentMatch.index,
      agentMatch.index + 300,
    );

    const phoneMatch = nearby.match(
      /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
    );
    const emailMatch = nearby.match(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
    );

    agents.push({
      name: agentName,
      phone: phoneMatch ? phoneMatch[0].trim() : null,
      email: emailMatch ? emailMatch[0].trim() : null,
      title: agentMatch[2].trim(),
    });
  }

  // --- Services ---
  const services: string[] = [];
  for (const svc of RE_SERVICES) {
    const svcRe = new RegExp(`\\b${escapeRegex(svc)}\\b`, 'i');
    if (svcRe.test(text)) {
      services.push(svc);
    }
  }

  // --- Service areas ---
  const serviceAreas: string[] = [];
  const areaPatterns = [
    /(?:serving|areas?\s+(?:we\s+)?serv(?:e|ed|ing)|service\s+areas?|communities|neighborhoods?)\s*[:\-–—]?\s*([\s\S]{10,500}?)(?:\.|<|$)/gi,
  ];
  for (const ap of areaPatterns) {
    let areaMatch: RegExpExecArray | null;
    while ((areaMatch = ap.exec(text)) !== null) {
      // Split by commas, "and", bullet points
      const areas = areaMatch[1]
        .split(/[,•·]|\band\b/i)
        .map((a) => a.trim())
        .filter((a) => a.length > 2 && a.length < 60 && /[A-Z]/.test(a));
      serviceAreas.push(...areas);
    }
  }

  logger.debug('extractRealEstateInfo completed', {
    listingCount: listings.length,
    agentCount: agents.length,
    serviceCount: services.length,
    serviceAreaCount: serviceAreas.length,
  });

  return {
    listings,
    agents,
    services: dedup(services),
    service_areas: dedup(serviceAreas),
  };
}
