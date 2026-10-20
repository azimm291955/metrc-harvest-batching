// Per-plant checks before anything goes to the state system.
//
// A plant with a bad row is held out and reported; the rest of the day still
// goes. Only a problem that makes the whole day unsafe to guess past (a tag the
// state record has never heard of) stops the run.
//
// stateRecord: Map of tag -> { strain, room } from the state's plant inventory.
export function validateDay(plants, { stateRecord = null, earlierTags = new Map() } = {}) {
  const problems = [];
  const fatal = [];
  const seen = new Set();
  for (const p of plants) {
    const hold = why => problems.push({ tag: p.tag, strain: p.strain, room: p.room, why });
    if (seen.has(p.tag)) hold('tag appears twice on the same day');
    seen.add(p.tag);
    if (earlierTags.has(p.tag)) hold(`tag was already harvested on ${earlierTags.get(p.tag)}`);

    if (stateRecord) {
      const rec = stateRecord.get(p.tag);
      if (!rec) { fatal.push({ tag: p.tag, why: 'tag does not exist in the state record' }); continue; }
      if (rec.strain !== p.strain) hold(`strain is ${p.strain} on the sheet but ${rec.strain} in the state record`);
      if (rec.room !== p.room) hold(`room is ${p.room} on the sheet but ${rec.room} in the state record`);
    }

    if (!p.grossWeight || p.grossWeight < 0) { hold('no gross weight'); continue; }
    const net = p.kind === 'FREEZER' ? p.frozenWeight : p.netWeight;
    if (net == null || Number.isNaN(net)) { hold(`${p.kind === 'FREEZER' ? 'frozen' : 'dry'} plant with no net weight`); continue; }
    if (net <= 0) hold(`net weight is ${net} g`);
  }
  const held = new Set(problems.map(x => x.tag));
  return {
    stop: fatal.length > 0,
    fatal,
    problems,
    clean: fatal.length ? [] : plants.filter(p => !held.has(p.tag)),
  };
}
