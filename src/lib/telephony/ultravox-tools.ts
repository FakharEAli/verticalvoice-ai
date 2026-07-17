import type { IndustryPack, ToolBinding, ToolParameter } from "@/industries/core/industry-pack";
import { signToolToken } from "./tool-token";

interface BuildSelectedToolsOptions {
  callId: string;
  tenantId: string;
  industry: IndustryPack["id"];
  isTest?: boolean;
}

function jsonSchemaType(type: ToolParameter["type"]): string {
  switch (type) {
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "object":
      return "object";
    case "array":
      return "array";
    default:
      return "string";
  }
}

function toUltravoxTool(binding: ToolBinding, baseUrl: string, token: string) {
  return {
    temporaryTool: {
      modelToolName: binding.id,
      description: binding.description,
      dynamicParameters: binding.parameters.map((param) => ({
        name: param.name,
        location: "PARAMETER_LOCATION_BODY",
        schema: { type: jsonSchemaType(param.type), description: param.description },
        required: param.required,
      })),
      staticParameters: [
        {
          name: "Authorization",
          location: "PARAMETER_LOCATION_HEADER",
          value: `Bearer ${token}`,
        },
      ],
      http: {
        baseUrlPattern: `${baseUrl}/api/v1/tools/execute/${binding.id}`,
        httpMethod: "POST",
      },
    },
  };
}

/**
 * Builds Ultravox's `selectedTools` payload from an industry pack's tool
 * catalog, so the AI can actually invoke our backend mid-call instead of
 * just talking about it. Each tool gets a signed token (scoped to this one
 * call) baked in as a static header — Ultravox has no concept of "the call
 * that's running", so the call/tenant identity has to travel with the tool
 * definition itself.
 */
export function buildSelectedTools(pack: IndustryPack, opts: BuildSelectedToolsOptions) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl) {
    console.warn("[ultravox-tools] NEXT_PUBLIC_APP_URL not set — skipping tool wiring for this call");
    return [];
  }

  const token = signToolToken({
    call_id: opts.callId,
    tenant_id: opts.tenantId,
    industry: opts.industry,
    is_test: opts.isTest ?? false,
  });

  return pack.tools.map((binding) => toUltravoxTool(binding, baseUrl, token));
}
