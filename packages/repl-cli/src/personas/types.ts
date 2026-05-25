/**
 * Persona — a swappable bundle of (model + system prompt + sensibility)
 * for the LZero REPL. Personas are the user-facing abstraction over what
 * elsewhere would be called "provider switching" — but since LZero already
 * wraps providers behind a vendor-abstraction layer, what the user picks
 * is a personality + lens, not a vendor.
 */
export interface Persona {
  /** Unique slug, used in commands. Lowercase, no spaces. */
  name: string;
  /** Display name shown in status/prompts. */
  label: string;
  /** One-line description for `/persona list`. */
  description: string;
  /** Model identifier resolved through the orchestrator's model alias map. */
  model: string;
  /** Full system prompt body for this persona. */
  systemPrompt: string;
  /** Marks this persona as built-in (cannot be deleted by the user). */
  builtin: boolean;
}
