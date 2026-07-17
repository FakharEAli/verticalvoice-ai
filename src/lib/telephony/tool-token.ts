import jwt from "jsonwebtoken";
import type { NextRequest } from "next/server";
import type { IndustryId } from "@/industries/core/industry-pack";

export interface ToolTokenPayload {
  call_id: string;
  tenant_id: string;
  industry: IndustryId;
  is_test: boolean;
}

/**
 * Short-lived token scoping a single Ultravox tool call to the call/tenant
 * that created it. Passed to Ultravox as a static Authorization header at
 * call-creation time, so it must outlive the entire call — 2 hours covers
 * every plan's maxDurationSeconds with room to spare.
 */
export function signToolToken(payload: ToolTokenPayload): string {
  const secret = process.env.TOOL_TOKEN_SECRET;
  if (!secret) throw new Error("TOOL_TOKEN_SECRET is not configured");
  return jwt.sign(payload, secret, { algorithm: "HS256", expiresIn: "2h" });
}

export function verifyToolToken(request: NextRequest): ToolTokenPayload | null {
  const secret = process.env.TOOL_TOKEN_SECRET;
  if (!secret) {
    console.error("[tool-token] TOOL_TOKEN_SECRET is not configured — rejecting all tool calls");
    return null;
  }

  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;

  try {
    const decoded = jwt.verify(auth.slice(7), secret) as jwt.JwtPayload;
    if (
      typeof decoded.call_id !== "string" ||
      typeof decoded.tenant_id !== "string" ||
      typeof decoded.industry !== "string"
    ) {
      return null;
    }
    return {
      call_id: decoded.call_id,
      tenant_id: decoded.tenant_id,
      industry: decoded.industry as IndustryId,
      is_test: decoded.is_test === true,
    };
  } catch {
    return null;
  }
}
