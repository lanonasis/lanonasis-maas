# Vortex Core — Live Wire TODO

**Status**: POC exists at `archive/index_preview.html` ← working, animated, formula correct
**Destination**: `apps/vortexai-l0/` ← production deploy, real API data

---

## The One Change That Makes This Real

In `archive/index_preview.html`, find line ~406:

```javascript
// CURRENT (random seed):
function seedAndBuild() {
  const items = Array.from({ length: CONFIG.particleCount }, (_, i) => rndItem(i));
  buildParticles(items);
  filterByTimeWindow();
}
```

**Replace with:**

```javascript
// LIVE DATA:
async function seedAndBuild() {
  const apiKey = localStorage.getItem('LANONASIS_API_KEY') || prompt('LanOnasis API Key:');
  if (apiKey) localStorage.setItem('LANONASIS_API_KEY', apiKey);

  let items;
  try {
    const res = await fetch('https://api.lanonasis.com/api/v1/memory/list?limit=500', {
      headers: { 'X-API-Key': apiKey }
    });
    const json = await res.json();
    items = (json.data ?? []).map(m => ({
      id: m.id,
      title: m.title ?? 'Untitled',
      namespace: m.tags?.[0] ?? m.memory_type ?? 'general',
      type: m.memory_type ?? 'context',
      similarity: m.similarity ?? 0.6,
      recency_days: Math.floor((Date.now() - new Date(m.created_at).getTime()) / 86400000),
      quality_score: Math.min(0.4 + (m.tags?.length ?? 0) * 0.08, 1.0),
    }));
  } catch (err) {
    console.warn('LanOnasis unreachable, using sample data:', err);
    items = Array.from({ length: 200 }, (_, i) => rndItem(i)); // graceful fallback
  }

  buildParticles(items);
  filterByTimeWindow();
}
```

---

## What Happens When You Wire This

With 46 memories currently in LanOnasis:

```
N = 46
D = ~6 distinct namespaces (from your memory tags)
R = recency factor (some memories from today)

CQ = 42·log(1+46) + 30·6 + 20·R
   ≈ 42·3.85 + 180 + 20·R
   ≈ 162 + 180 + ~15
   ≈ 357

Ring 1 (120) ✅ lights up — Pattern recognition begins
Ring 2 (240) ✅ lights up — Cross-domain connections forming
Ring 3 (400) ⬜ next threshold — Compound insight territory
```

You are already at Ring 2. Compound insight territory is at 400.
Every memory captured pushes the score higher.

---

## Migration Path

```
archive/index_preview.html
    → copy to apps/vortexai-l0/src/brain-view.html
    → add API key input (localStorage backed)
    → wire fetch to live API (above)
    → deploy to VPS

Optional enhancements:
    → namespace filter dropdown (filter by memory_type or tag)
    → date range picker (instead of days slider)
    → click particle → open full memory in side panel
    → real-time updates via polling every 60s
```

---

## VPS Deploy

```bash
# On VPS:
cd /path/to/lanonasis-maas
cp archive/index_preview.html apps/vortexai-l0/public/brain.html
# Edit: add the seedAndBuild fetch replacement above
# Serve: any static file server

# Then visit: http://YOUR_VPS_IP/brain.html
# Enter API key once → localStorage persists it
# See your real memory constellation
```

---

*This is the dashboard for the brain layer.*
*The particles are your thoughts. The CQ score is your momentum.*
*The rings are the milestones.*
