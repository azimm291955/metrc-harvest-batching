// Synthetic harvest history. Invented strains, tags and weights: no real data.
// Writes data/harvest.json (the harvest log) and data/recorded.json (what a
// person entered by hand), with a small rate of realistic hand-entry mistakes.
import { writeFileSync } from 'node:fs';
import { assignBatches, deriveCandidates } from '../src/batching.js';

let seed = 42;
const rand = () => (seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32;
const pick = a => a[Math.floor(rand() * a.length)];

const STRAINS = ['COMET', 'DUSKMINT', 'EMBER', 'GLACIER', 'HALO', 'JUNIPER', 'LANTERN', 'MOSSWOOD'];
const ROOMS = ['1', '2', '3', '4', '5', '6'];
const days = [];
for (let d = new Date('2026-01-05'); days.length < 147; d.setDate(d.getDate() + 1))
  if (d.getDay() % 6 !== 0) days.push(d.toISOString().slice(0, 10));

const harvest = [];
let n = 100000;
for (const date of days) {
  const room = pick(ROOMS);
  const strains = [pick(STRAINS), pick(STRAINS)];
  const count = 90 + Math.floor(rand() * 70);
  for (let i = 0; i < count; i++) {
    const frozen = rand() < 0.15;
    const gross = Math.round(400 + rand() * 500);
    harvest.push({
      date, tag: `1A40000000000${n++}`, strain: pick(strains), room,
      kind: frozen ? 'FREEZER' : 'DRY ROOM', grossWeight: gross,
      netWeight: frozen ? null : Math.round(gross * (0.7 + rand() * 0.1)),
      frozenWeight: frozen ? Math.round(gross * (0.85 + rand() * 0.05)) : null,
    });
  }
}

// What was actually entered by hand: the rule's answer, plus mistakes.
const recorded = [];
for (const date of days) {
  const today = harvest.filter(p => p.date === date);
  const history = harvest.filter(p => p.date < date);
  for (const p of assignBatches(today, deriveCandidates(history, date))) {
    let batch = p.batch;
    if (p.kind === 'DRY ROOM' && rand() < 0.035) {
      const mistake = pick(['typo', 'new-batch', 'wrong-room']);
      if (mistake === 'typo') batch = batch.replace(/[AEIOU]/, 'X');
      if (mistake === 'new-batch') batch = `${p.strain}${date.slice(5, 7)}${date.slice(8)}${date.slice(2, 4)}_${p.room}x`;
      if (mistake === 'wrong-room') batch = batch.replace(/_(\d)$/, (_, r) => `_${(Number(r) % 6) + 1}`);
    }
    recorded.push({ tag: p.tag, batch });
  }
}

writeFileSync(new URL('./harvest.json', import.meta.url), JSON.stringify(harvest));
writeFileSync(new URL('./recorded.json', import.meta.url), JSON.stringify(recorded));
console.log(`${harvest.length} plants over ${days.length} harvest days written`);
