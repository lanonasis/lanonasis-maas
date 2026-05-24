import type { Persona } from './types.js';
import { BUILTIN_PERSONAS, DEFAULT_PERSONA_NAME } from './builtin.js';

/**
 * In-memory persona registry. Built-in personas are loaded eagerly.
 * v0.1 will add user-defined personas loaded from
 * ~/.lanonasis/repl/personas/<name>.md (YAML frontmatter + prompt body).
 */
export class PersonaRegistry {
  private personas = new Map<string, Persona>();
  private activeName: string;

  constructor() {
    for (const persona of BUILTIN_PERSONAS) {
      this.personas.set(persona.name.toLowerCase(), persona);
    }
    this.activeName = DEFAULT_PERSONA_NAME;
  }

  list(): Persona[] {
    return Array.from(this.personas.values());
  }

  get(name: string): Persona | undefined {
    return this.personas.get(name.toLowerCase());
  }

  active(): Persona {
    const persona = this.personas.get(this.activeName);
    if (!persona) {
      throw new Error(`Active persona "${this.activeName}" not found in registry`);
    }
    return persona;
  }

  /**
   * Switch the active persona by slug. Returns the new active persona,
   * or undefined if the slug is unknown.
   */
  switch(name: string): Persona | undefined {
    const target = this.personas.get(name.toLowerCase());
    if (!target) return undefined;
    this.activeName = target.name;
    return target;
  }
}

/** Singleton accessor — there is one active persona per REPL session. */
let _registry: PersonaRegistry | undefined;

export function getPersonaRegistry(): PersonaRegistry {
  if (!_registry) {
    _registry = new PersonaRegistry();
  }
  return _registry;
}
