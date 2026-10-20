// One harvest day through the checks: a strain mismatch and a room mismatch
// are held out and reported, and the rest of the day still goes.
import { readFileSync } from 'node:fs';
import { validateDay } from './src/validate.js';

const harvest = JSON.parse(readFileSync(new URL('./data/harvest.json', import.meta.url)));
const day = harvest.filter(p => p.date === harvest[0].date).map(p => ({ ...p }));

// The state's plant inventory, as it would be pulled that morning.
const stateRecord = new Map(day.map(p => [p.tag, { strain: p.strain, room: p.room }]));
day[3].strain = 'WRONGSTRAIN';   // crew picked the wrong strain on one row
day[7].room = '9';               // and the wrong room on another

const r = validateDay(day, { stateRecord });
console.log(`${day.length} plants on ${day[0].date}: ${r.clean.length} go, ${r.problems.length} held, run ${r.stop ? 'STOPPED' : 'continues'}`);
for (const x of r.problems) console.log(`  held ${x.tag.slice(-6)}: ${x.why}`);
