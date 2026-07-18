import { stripUnresolvedPlaceholders } from "@/industries/core/compiler";

/**
 * Composes the system prompt for an outbound call.
 *
 * Extracted from the outbound route so the composition is unit-testable. It
 * previously lived inline in the handler, which meant the one property that
 * actually matters — that outbound inherits the compiled agent's identity and
 * voice rules — could only be checked by placing a real phone call.
 *
 * The compiled prompt carries the shared voice rules (turn brevity, one
 * question per turn, agent owns the hangup). Outbound used to build its own
 * throwaway prompt and inherit none of them, so the same agent sounded like
 * two different people depending on who dialed.
 */
export function buildOutboundSystemPrompt(params: {
  /** `agent_config_versions.snapshot.system_prompt` for the active config. */
  compiledPrompt: string | null;
  businessName: string;
  /** The outbound call type's category, e.g. "reminder" or "follow_up". */
  category: string;
  /** The call type's prompt template with caller variables already filled. */
  filledScript: string;
}): string {
  const { compiledPrompt, businessName, category, filledScript } = params;

  // fillTemplate leaves `{{var}}` in place for absent optional variables, so
  // strip the leftovers — otherwise the agent reads the literal braces aloud,
  // the same defect the compiler was hardened against.
  const script = stripUnresolvedPlaceholders(filledScript).trim();

  const framing = [
    `THIS CALL: You are placing an outbound ${category} call on behalf of ${businessName}. The person did not call you — you called them, so state who you are and why you are calling in your first sentence, then stop and let them respond.`,
    script,
    `If they ask not to be called again, acknowledge it plainly, tell them you'll remove them, and end the call. Do not argue or re-pitch.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  // Falling back to a bare identity line keeps outbound working if a tenant has
  // no active config yet, rather than failing the call outright.
  return compiledPrompt
    ? `${compiledPrompt}\n\n${framing}`
    : `You are the phone agent for ${businessName}.\n\n${framing}`;
}
