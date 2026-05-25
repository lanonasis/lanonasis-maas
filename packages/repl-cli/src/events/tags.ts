/**
 * Tag-convention helpers.
 *
 * The ontology rides on the existing `tags` field of a MaaS memory record;
 * no schema changes. These helpers ensure tag construction is consistent
 * across the create / update / detect paths and that convergence can rely
 * on a stable parsing surface in Phase B.
 */

import { isEventType, type EventType, type DetectedEvent } from './types.js';

/** All event tags carry this prefix. */
export const EVENT_TAG_PREFIX = 'event:';

/** Boolean flag tags. */
export const TAG_BACKFILLED = 'backfilled:true';
export const TAG_HUMAN_CORRECTED = 'human-corrected:true';

/** Build the canonical tag for an event type: `event:decision`. */
export function eventTag(type: EventType): string {
  return `${EVENT_TAG_PREFIX}${type}`;
}

/** True if `tag` matches `event:<known-type>`. */
export function isEventTag(tag: string): boolean {
  if (!tag.startsWith(EVENT_TAG_PREFIX)) return false;
  const slug = tag.slice(EVENT_TAG_PREFIX.length);
  return isEventType(slug);
}

/** Extract the EventType from a tag string, or `undefined`. */
export function eventTypeFromTag(tag: string): EventType | undefined {
  if (!tag.startsWith(EVENT_TAG_PREFIX)) return undefined;
  const slug = tag.slice(EVENT_TAG_PREFIX.length);
  return isEventType(slug) ? slug : undefined;
}

/**
 * Merge new event tags + payload tags into an existing tag list,
 * deduplicating and preserving order. Returns a new array.
 *
 * Payload conventions:
 *   commitment.due       → `due:<value>`        (e.g. `due:friday`)
 *   frustration.tool     → `tool:<name>`
 *   revisit.source_id    → `revisit-of:<uuid>`
 *   abandon.source_id    → `abandoned-from:<uuid>`
 */
export function mergeEventTags(
  existing: string[],
  detected: DetectedEvent[],
): string[] {
  const set = new Set(existing);
  for (const ev of detected) {
    set.add(eventTag(ev.type));
    if (!ev.payload) continue;
    for (const [k, v] of Object.entries(ev.payload)) {
      // Convention: due / tool / revisit-of / abandoned-from are
      // emitted as `<key>:<value>` tags.
      const key = k === 'source_id' && ev.type === 'revisit' ? 'revisit-of'
                : k === 'source_id' && ev.type === 'abandon' ? 'abandoned-from'
                : k;
      set.add(`${key}:${v}`);
    }
  }
  return Array.from(set);
}

/**
 * Strip every `event:*` tag (and known payload tags) from a list. Used
 * by `/event untag <id>` when no specific type is given — clears all
 * event metadata at once.
 */
export function stripAllEventTags(tags: string[]): string[] {
  return tags.filter(t => !isEventTag(t)
    && !t.startsWith('due:')
    && !t.startsWith('revisit-of:')
    && !t.startsWith('abandoned-from:'));
}

/** Strip only `event:<type>` (leave other event tags + payload tags). */
export function stripEventTypeTag(tags: string[], type: EventType): string[] {
  const target = eventTag(type);
  return tags.filter(t => t !== target);
}
