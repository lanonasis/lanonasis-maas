#!/usr/bin/env node
/**
 * Smoke test for the capture-event ontology v0.
 *
 * Exercises:
 *   1. Rules detector — decision / commitment / frustration patterns
 *      and negative cases (no false positives on neutral input).
 *   2. Payload extraction — `by Friday` produces `due: friday`.
 *   3. Tag-convention helpers — eventTag, isEventTag, mergeEventTags,
 *      stripAllEventTags, stripEventTypeTag.
 *
 * Skips: real MaaS API calls, /event tag/untag with a live MemoryClient
 * (those need network and are exercised indirectly through the smoke
 * for tag merging).
 */

let exitCode = 0;
function assert(cond, msg) {
  if (cond) {
    console.log(`  ✓ ${msg}`);
  } else {
    console.log(`  ✗ ${msg}`);
    exitCode = 1;
  }
}

try {
  // ── 1. Detector ──────────────────────────────────────────────────────
  console.log('\n[1] Rules detector');
  const { detectEvents } = await import('../../src/events/rules.ts');

  const decisionHits = detectEvents("Let's go with the postgres backend for now.");
  assert(decisionHits.some(e => e.type === 'decision'),
    'detects decision in "let\'s go with X"');

  const decisionHits2 = detectEvents("We decided to drop the rebrand. Too risky.");
  assert(decisionHits2.some(e => e.type === 'decision'),
    'detects decision in "we decided to ..."');

  const commitmentHits = detectEvents("I'll wire up the migration tomorrow.");
  assert(commitmentHits.some(e => e.type === 'commitment'),
    'detects commitment in "I\'ll ... tomorrow"');

  const dueHit = detectEvents("I'll push the fix by Friday.");
  const dueEvent = dueHit.find(e => e.type === 'commitment');
  assert(dueEvent !== undefined, 'detects commitment with date');
  assert(dueEvent?.payload?.due === 'friday',
    `extracts due=friday from "by Friday" (got ${dueEvent?.payload?.due})`);

  const frustrationHits = detectEvents("This is frustrating — the build is still broken.");
  assert(frustrationHits.some(e => e.type === 'frustration'),
    'detects frustration in "frustrating ... still broken"');

  const stuckHits = detectEvents("I'm stuck on the auth refactor.");
  assert(stuckHits.some(e => e.type === 'frustration'),
    'detects frustration in "I\'m stuck"');

  // Negative cases — no false positives on neutral input.
  const empty = detectEvents("Hello there, what does this codebase do?");
  assert(empty.length === 0, 'neutral question produces no events');

  const willingFalse = detectEvents("I'm willing to look into it later.");
  assert(!willingFalse.some(e => e.type === 'commitment'),
    '"willing" does not false-match the "I\'ll/I will" commitment pattern');

  // Multi-type single message — frustration + commitment together.
  const compound = detectEvents("This is annoying. I'll patch it by tomorrow.");
  assert(compound.some(e => e.type === 'frustration')
      && compound.some(e => e.type === 'commitment'),
    'detects both frustration and commitment in one input');

  // ── 2. Tag-convention helpers ─────────────────────────────────────────
  console.log('\n[2] Tag-convention helpers');
  const {
    eventTag,
    isEventTag,
    eventTypeFromTag,
    mergeEventTags,
    stripAllEventTags,
    stripEventTypeTag,
    EVENT_TAG_PREFIX,
  } = await import('../../src/events/tags.ts');

  assert(eventTag('decision') === 'event:decision', 'eventTag("decision") = "event:decision"');
  assert(EVENT_TAG_PREFIX === 'event:', 'EVENT_TAG_PREFIX = "event:"');
  assert(isEventTag('event:decision') === true, 'isEventTag accepts event:decision');
  assert(isEventTag('event:nonsense') === false, 'isEventTag rejects event:nonsense (unknown slug)');
  assert(isEventTag('tag:other') === false, 'isEventTag rejects non-event tags');
  assert(eventTypeFromTag('event:commitment') === 'commitment',
    'eventTypeFromTag extracts commitment');
  assert(eventTypeFromTag('foo:bar') === undefined,
    'eventTypeFromTag returns undefined for non-event tag');

  // mergeEventTags
  const detected = [
    { type: 'decision', confidence: 0.8, evidence: 'we decided' },
    { type: 'commitment', confidence: 0.85, evidence: 'by Friday', payload: { due: 'friday' } },
  ];
  const merged = mergeEventTags(['existing-tag'], detected);
  assert(merged.includes('event:decision'), 'mergeEventTags adds event:decision');
  assert(merged.includes('event:commitment'), 'mergeEventTags adds event:commitment');
  assert(merged.includes('due:friday'), 'mergeEventTags emits due:friday payload tag');
  assert(merged.includes('existing-tag'), 'mergeEventTags preserves pre-existing tags');

  // Idempotence — running merge twice produces the same set.
  const merged2 = mergeEventTags(merged, detected);
  assert(merged2.length === merged.length, 'mergeEventTags is idempotent (no duplicates)');

  // Strip helpers
  const tagsBefore = ['event:decision', 'event:commitment', 'due:friday', 'other-tag'];
  const allStripped = stripAllEventTags(tagsBefore);
  assert(allStripped.length === 1 && allStripped[0] === 'other-tag',
    'stripAllEventTags removes event:* and payload tags');

  const oneStripped = stripEventTypeTag(tagsBefore, 'decision');
  assert(!oneStripped.includes('event:decision'),
    'stripEventTypeTag removes event:decision');
  assert(oneStripped.includes('event:commitment') && oneStripped.includes('due:friday'),
    'stripEventTypeTag leaves other event tags intact');
  assert(oneStripped.includes('other-tag'),
    'stripEventTypeTag preserves non-event tags');

  // ── 3. Type guards ───────────────────────────────────────────────────
  console.log('\n[3] Type guards');
  const { isEventType, EVENT_TYPES } = await import('../../src/events/types.ts');
  assert(EVENT_TYPES.length === 7, '7 canonical event types defined');
  assert(isEventType('decision') === true, 'isEventType accepts "decision"');
  assert(isEventType('revisit') === true, 'isEventType accepts "revisit"');
  assert(isEventType('rumination') === false, 'isEventType rejects "rumination" (not in ontology)');

} catch (err) {
  console.error('\n[FATAL]', err);
  exitCode = 1;
}

console.log(exitCode === 0 ? '\n✅ SMOKE PASS' : '\n❌ SMOKE FAIL');
process.exit(exitCode);
