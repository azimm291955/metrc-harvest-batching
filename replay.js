// Replay the rule against history before trusting it in production.
// For every harvest day: rebuild the open batches from the days before it,
// assign that day's plants, and compare with what was recorded by hand.
import { readFileSync } from 'node:fs';
import { assignBatches, deriveCandidates } from './src/batching.js';

const harvest = JSON.parse(readFileSync(new URL('./data/harvest.json', import.meta.url)));
const recorded = new Map(JSON.parse(readFileSync(new URL('./data/recorded.json', import.meta.url))).map(r => [r.tag, r.batch]));

const days = [...new Set(harvest.map(p => p.date))].sort();
let dry = 0, agree = 0;
const disagreements = [];
for (const date of days) {
  const today = harvest.filter(p => p.date === date);
  const history = harvest.filter(p => p.date < date);
  for (const p of assignBatches(today, deriveCandidates(history, date))) {
    if (p.kind !== 'DRY ROOM') continue;
    dry++;
    const human = recorded.get(p.tag);
    if (human === p.batch) agree++;
    else disagreements.push({ date, tag: p.tag, rule: p.batch, recorded: human });
  }
}

console.log(`Harvest days replayed: ${days.length}`);
console.log(`Dry plants:            ${dry}`);
console.log(`Rule agrees with hand: ${agree} (${(100 * agree / dry).toFixed(2)}%)`);
console.log(`Disagreements:         ${disagreements.length}  (review each one before go-live)`);
for (const d of disagreements.slice(0, 5))
  console.log(`  ${d.date}  ${d.tag.slice(-6)}  rule=${d.rule}  recorded=${d.recorded}`);
