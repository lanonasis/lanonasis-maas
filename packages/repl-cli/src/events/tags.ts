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

/**
 * Payload-tag prefixes associated with each event type. When an
 * `event:<type>` tag is removed, the orphaned payload tags get removed
 * too — leaving `due:friday` on a memory that's no longer marked
 * `event:commitment` is semantic drift.
 *
 * Only event types with payload tags are listed; the rest have an
 * empty array and the strip is a no-op for payload tags.
 */
const PAYLOAD_PREFIXES_BY_TYPE: Record<EventType, readonly string[]> = {
  decision:    [],
  commitment:  ['due:'],
  frustration: ['tool:'],
  surprise:    [],
  insight:     [],
  revisit:     ['revisit-of:'],
  abandon:     ['abandoned-from:'],
};

/**
 * Strip `event:<type>` and any payload tags that belong to that type.
 * Leaves other `event:*` tags and unrelated tags untouched.
 *
 * Example: stripEventTypeTag(['event:commitment','due:friday','other'], 'commitment')
 *   → ['other']   (event:commitment AND due:friday both removed)
 */
export function stripEventTypeTag(tags: string[], type: EventType): string[] {
  const target = eventTag(type);
  const payloadPrefixes = PAYLOAD_PREFIXES_BY_TYPE[type];
  return tags.filter(t => {
    if (t === target) return false;
    for (const p of payloadPrefixes) if (t.startsWith(p)) return false;
    return true;
  });
}
