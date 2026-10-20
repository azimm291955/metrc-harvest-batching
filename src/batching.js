// The batching engine. Pure functions: same inputs -> same outputs, every time.
//
// DRY    same strain + same room + harvested within WINDOW days of an existing
//        batch's date -> join that batch and carry ITS date (back-dated).
// FROZEN one batch per strain / room / day. Never batched back.
// Dry and frozen never share a batch. Different rooms never combine.

export const WINDOW_DAYS = 7;

const mmddyy = iso => { const [y, m, d] = iso.split('-'); return `${m}${d}${y.slice(2)}`; };
export const daysBetween = (a, b) =>
  Math.round((new Date(a + 'T00:00:00') - new Date(b + 'T00:00:00')) / 86400000);

const dryName = p => `${p.strain}${mmddyy(p.date)}_${p.room}`;
const frozenName = p => `${p.strain}${mmddyy(p.date)}_${p.room}_WWP`;

// Rebuild the open batches by replaying earlier days. In production every batch
// in the state system is created by this pipeline's own upload, so replaying
// the harvest log reproduces them without logging in to the state system.
export function deriveCandidates(history, targetDate, window = WINDOW_DAYS) {
  const rows = [...history].sort((a, b) =>
    a.date.localeCompare(b.date) || a.strain.localeCompare(b.strain) || a.tag.localeCompare(b.tag));
  const pool = [];
  for (const p of rows) {
    if (p.kind === 'FREEZER') {
      const name = frozenName(p);
      if (!pool.some(b => b.name === name)) pool.push({ name, strain: p.strain, room: p.room, date: p.date, kind: 'FREEZER' });
      continue;
    }
    const open = pool.some(b => b.kind === 'DRY ROOM' && b.strain === p.strain && b.room === p.room &&
      daysBetween(p.date, b.date) >= 0 && daysBetween(p.date, b.date) <= window);
    if (!open) pool.push({ name: dryName(p), strain: p.strain, room: p.room, date: p.date, kind: 'DRY ROOM' });
  }
  return pool.filter(b => daysBetween(targetDate, b.date) >= 1 && daysBetween(targetDate, b.date) <= window);
}

// Assign one day's plants to batches.
export function assignBatches(plants, candidates, window = WINDOW_DAYS) {
  const pool = candidates.map(b => ({ ...b }));
  const sorted = [...plants].sort((a, b) =>
    a.strain.localeCompare(b.strain) || (a.kind === 'FREEZER') - (b.kind === 'FREEZER') || a.tag.localeCompare(b.tag));
  return sorted.map(p => {
    if (p.kind === 'FREEZER') {
      const name = frozenName(p);
      if (!pool.some(b => b.name === name)) pool.push({ name, strain: p.strain, room: p.room, date: p.date, kind: 'FREEZER' });
      return { ...p, batch: name, batchDate: p.date, batchedBack: false };
    }
    const cands = pool
      .filter(b => b.kind === 'DRY ROOM' && b.strain === p.strain && b.room === p.room &&
        daysBetween(p.date, b.date) >= 0 && daysBetween(p.date, b.date) <= window)
      .sort((x, y) => x.date.localeCompare(y.date) || x.name.localeCompare(y.name));
    if (cands.length) return { ...p, batch: cands[0].name, batchDate: cands[0].date, batchedBack: cands[0].date !== p.date };
    const name = dryName(p);
    pool.push({ name, strain: p.strain, room: p.room, date: p.date, kind: 'DRY ROOM' });
    return { ...p, batch: name, batchDate: p.date, batchedBack: false };
  });
}
