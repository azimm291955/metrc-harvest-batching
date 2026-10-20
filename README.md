# metrc-harvest-batching

A harvest-batching engine for METRC cannabis cultivation, extracted from a production n8n workflow and rewritten as plain JavaScript.

## The rule

- Dry plants join an existing batch when they share strain and room and are harvested within 7 days of that batch's date. They take the batch's date. The window is anchored to the batch, it doesn't slide, and ties go to the earliest qualifying batch.
- Frozen plants get one batch per strain, room and day, and are never batched back.
- Dry and frozen never share a batch. Different rooms never combine.
- Batch names follow `[STRAIN][MMDDYY]_[ROOM]`, with `_WWP` appended for frozen.

## How it held up in production

- Replayed against 147 days of hand-entered history (18,205 dry plants): 96.48% agreement, with 33 batch decisions (about 641 plants) where the rule and the hand entry differed. Every one was reviewed, and in every case the rule's batch was right and the hand entry was wrong.
- A full production day rebuilt from the harvest sheet alone matched the actual METRC upload row for row.

## Try it

```bash
npm run demo
```

This generates 147 days of synthetic harvest data (invented strains and tags) with hand-entry mistakes seeded in at about the real-world rate, replays the rule, and lists every disagreement for review. Expect roughly 96.5%. It then runs one day through the checks below.

## Bad rows

A plant whose strain or room doesn't match the state record is held out of the upload and reported; the rest of the day still goes. Only a problem that makes the whole day unsafe to guess past, such as a tag that doesn't exist, stops the run. See `src/validate.js` and `check-day.js`.

## Layout

```
src/batching.js   the rule: deriveCandidates() and assignBatches()
src/validate.js   per-plant checks against the state record
data/generate.js  synthetic harvest history
replay.js         the replay check
check-day.js      one day through the checks
```

Not affiliated with Metrc. The 7-day window is one operator's rule; check your state's harvest-batch definition before relying on it.
