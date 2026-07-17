import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database/types";

export interface ToolHandlerContext {
  supabase: SupabaseClient<Database>;
  tenantId: string;
  callId: string;
  input: Record<string, unknown>;
  isTest: boolean;
}

export type ToolHandler = (ctx: ToolHandlerContext) => Promise<Record<string, unknown>>;

export type ToolHandlerMap = Record<string, ToolHandler>;
