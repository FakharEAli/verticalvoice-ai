import { createServerClient } from "@/lib/database/supabase-server";
import { logger } from "@/lib/observability/logger";
import type { Database } from "@/lib/database/types";

type MenuRow = Database["public"]["Tables"]["restaurant_menus"]["Row"];
type CategoryRow = Database["public"]["Tables"]["menu_categories"]["Row"];
type ItemRow = Database["public"]["Tables"]["menu_items"]["Row"];
type ModifierGroupRow = Database["public"]["Tables"]["menu_modifier_groups"]["Row"];
type ModifierRow = Database["public"]["Tables"]["menu_modifiers"]["Row"];

// ─── Result Types ────────────────────────────────────────────────────────────

export interface MenuWithCategories extends MenuRow {
  categories: (CategoryRow & { items: ItemRow[] })[];
}

export interface ItemWithModifiers extends ItemRow {
  modifier_groups: (ModifierGroupRow & { modifiers: ModifierRow[] })[];
}

export interface AllergenInfo {
  item_id: string;
  item_name: string;
  allergens: string[];
  dietary_tags: string[];
}

// ─── Service Functions ───────────────────────────────────────────────────────

/**
 * Get the full active menu with categories and items for a tenant.
 */
export async function getMenu(tenantId: string): Promise<MenuWithCategories[]> {
  const supabase = await createServerClient();

  // Fetch active menus
  const { data: menus, error: menuErr } = await supabase
    .from("restaurant_menus")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (menuErr) {
    logger.error("Failed to fetch menus", { tenantId, error: menuErr.message });
    throw new Error(`Failed to fetch menus: ${menuErr.message}`);
  }

  if (!menus || menus.length === 0) {
    return [];
  }

  const menuIds = menus.map((m) => m.id);

  // Fetch categories for these menus
  const { data: categories, error: catErr } = await supabase
    .from("menu_categories")
    .select("*")
    .eq("tenant_id", tenantId)
    .in("menu_id", menuIds)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (catErr) {
    logger.error("Failed to fetch menu categories", { tenantId, error: catErr.message });
    throw new Error(`Failed to fetch menu categories: ${catErr.message}`);
  }

  const categoryIds = (categories ?? []).map((c) => c.id);

  // Fetch items for these categories
  const { data: items, error: itemErr } = await supabase
    .from("menu_items")
    .select("*")
    .eq("tenant_id", tenantId)
    .in("category_id", categoryIds.length > 0 ? categoryIds : ["__none__"])
    .order("sort_order", { ascending: true });

  if (itemErr) {
    logger.error("Failed to fetch menu items", { tenantId, error: itemErr.message });
    throw new Error(`Failed to fetch menu items: ${itemErr.message}`);
  }

  // Assemble the hierarchy
  const itemsByCategory = new Map<string, ItemRow[]>();
  for (const item of items ?? []) {
    const list = itemsByCategory.get(item.category_id) ?? [];
    list.push(item as ItemRow);
    itemsByCategory.set(item.category_id, list);
  }

  const categoriesByMenu = new Map<string, (CategoryRow & { items: ItemRow[] })[]>();
  for (const cat of categories ?? []) {
    const list = categoriesByMenu.get(cat.menu_id) ?? [];
    list.push({
      ...(cat as CategoryRow),
      items: itemsByCategory.get(cat.id) ?? [],
    });
    categoriesByMenu.set(cat.menu_id, list);
  }

  return menus.map((menu) => ({
    ...(menu as MenuRow),
    categories: categoriesByMenu.get(menu.id) ?? [],
  }));
}

/**
 * Get a single menu item with its modifier groups and modifiers.
 */
export async function getItem(
  tenantId: string,
  itemId: string
): Promise<ItemWithModifiers> {
  const supabase = await createServerClient();

  const { data: item, error: itemErr } = await supabase
    .from("menu_items")
    .select("*")
    .eq("id", itemId)
    .eq("tenant_id", tenantId)
    .single();

  if (itemErr || !item) {
    throw new Error("Menu item not found");
  }

  // Fetch modifier groups for this tenant
  const { data: groups, error: groupErr } = await supabase
    .from("menu_modifier_groups")
    .select("*")
    .eq("tenant_id", tenantId);

  if (groupErr) {
    logger.error("Failed to fetch modifier groups", { tenantId, error: groupErr.message });
    throw new Error(`Failed to fetch modifier groups: ${groupErr.message}`);
  }

  const groupIds = (groups ?? []).map((g) => g.id);

  // Fetch modifiers
  const { data: modifiers, error: modErr } = await supabase
    .from("menu_modifiers")
    .select("*")
    .eq("tenant_id", tenantId)
    .in("group_id", groupIds.length > 0 ? groupIds : ["__none__"])
    .eq("is_available", true)
    .order("sort_order", { ascending: true });

  if (modErr) {
    logger.error("Failed to fetch modifiers", { tenantId, error: modErr.message });
    throw new Error(`Failed to fetch modifiers: ${modErr.message}`);
  }

  const modifiersByGroup = new Map<string, ModifierRow[]>();
  for (const mod of modifiers ?? []) {
    const list = modifiersByGroup.get(mod.group_id) ?? [];
    list.push(mod as ModifierRow);
    modifiersByGroup.set(mod.group_id, list);
  }

  return {
    ...(item as ItemRow),
    modifier_groups: (groups ?? []).map((g) => ({
      ...(g as ModifierGroupRow),
      modifiers: modifiersByGroup.get(g.id) ?? [],
    })),
  };
}

/**
 * Check if a menu item is currently available.
 */
export async function checkAvailability(
  tenantId: string,
  itemId: string
): Promise<boolean> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("menu_items")
    .select("is_available")
    .eq("id", itemId)
    .eq("tenant_id", tenantId)
    .single();

  if (error || !data) {
    logger.warn("Menu item not found for availability check", { tenantId, itemId });
    return false;
  }

  return data.is_available;
}

/**
 * Search menu items by name or description.
 */
export async function searchMenu(
  tenantId: string,
  query: string
): Promise<ItemRow[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("is_available", true)
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    .order("sort_order", { ascending: true })
    .limit(20);

  if (error) {
    logger.error("Failed to search menu", { tenantId, query, error: error.message });
    throw new Error(`Failed to search menu: ${error.message}`);
  }

  return (data ?? []) as ItemRow[];
}

/**
 * Get allergen and dietary information for a menu item.
 */
export async function getAllergenInfo(
  tenantId: string,
  itemId: string
): Promise<AllergenInfo> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("menu_items")
    .select("id, name, allergens, dietary_tags")
    .eq("id", itemId)
    .eq("tenant_id", tenantId)
    .single();

  if (error || !data) {
    throw new Error("Menu item not found");
  }

  return {
    item_id: data.id,
    item_name: data.name,
    allergens: data.allergens ?? [],
    dietary_tags: data.dietary_tags ?? [],
  };
}
