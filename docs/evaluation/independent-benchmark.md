# Independent benchmark and expert review

Implemented 31 October 2026. This is a local preparation workflow; it does not train the model or establish new accuracy results.

## Current reservation

A repeatable-read, read-only snapshot of the existing isolated evaluation database found 500 reference images and 86 distinct previously attempted images, including failed attempts. The new local reservation contains:

| Assignment | Images |
| --- | ---: |
| Reserved for independent review | 100 |
| Development: previously attempted | 86 |
| Remaining unassigned | 309 |
| Withheld watermark/printed-label cases | 5 |

Freeze ID: `9f5e611fb3e138e89cb0de4c4a85b7d599a8b4cf30d4a77c0c71685c775b610f`.

Local files are private and git-ignored:

- `server/dataset/independent-inventory-20261031-v2/inventory.json`
- `server/dataset/independent-inventory-20261031-v2/exposure.json`
- `server/dataset/independent-holdout-20261031/split.json`
- `server/dataset/independent-holdout-20261031/blind-review.json`

Status: **awaiting_independent_review**. No new provider assessments were run. No database writes or production changes were made.

## Review procedure

1. Give the agronomist only `blind-review.json` and the neutral checksum-named images it references. Keep `split.json`, dataset labels and model predictions separate. The packet deliberately contains no suggested diagnosis.
2. Independently record crop, diagnosis, health state, explicit approved aliases, reviewer identity and review time. Leave ambiguous cases pending. Dataset labels and an administrator account do not establish expert verification.
3. Inspect for embedded labels, composites, watermarks and unsuitable images; verify usage rights separately. Set review flags only after actual review. `imageVerified` from import is a technical check, not expert verification.
4. Review the **whole inventory** for near duplicates, shared plants, farms or capture sessions. Assign a shared `leakageGroup` to connected photos and set `groupReviewed: true`. Unknown field provenance must remain a documented limitation; do not invent farm IDs. Record any exposure outside the assessment table (manual prompt examples, developer inspections or external runs) in `exposure.json` too. Its `complete` flag covers the database snapshot, not unknown external history.
5. If groups cross the reserved boundary, regenerate the split from the reviewed inventory and updated exposure list before any predictions. Archive the provisional reservation; do not silently replace it. The completion tool blocks known cross-split groups and missing whole-inventory overlap review.
6. Freeze the final membership and independently approved labels before assessment. Freeze model, source revision, prompt/policy revision, crop-input mode and settings too. All predictions used to tune prompts become development data; refresh the holdout after tuning on its results.

Apply a completed review packet without changing selected membership:

```sh
node server/evaluation/applyHoldoutReviews.js split.json completed-blind-review.json NEW_REVIEWED_SPLIT.json
```

The output remains pending if any required check is missing. A ready flag is validation of supplied review records, not proof of the reviewer's qualifications or factual accuracy.

## Reproduce a reservation

The exporter requires the existing isolated evaluation environment and matching explicit database host. It reads only reference metadata and attempted checksums in a read-only transaction; it never reads assessment responses or credentials into output.

```sh
node --env-file=.env.evaluation.local server/evaluation/exportHoldoutInventory.js server/dataset/NEW_INVENTORY
node server/evaluation/prepareHoldout.js server/dataset/NEW_INVENTORY/inventory.json server/dataset/NEW_INVENTORY/exposure.json server/dataset/NEW_RESERVATION
```

Output directories are created exclusively, and files use restrictive permissions. The selector is deterministic, balances source/crop/reference-condition strata, keeps known groups together, rejects duplicate checksums and reports shortfalls. It does not perform perceptual duplicate detection itself. Unequal groups can exceed the requested target. Ordinary existing evaluation runners do not enforce this reservation: keep reserved checksums out of development runs and do not run a generic unseen-image batch against this pool.

## Scoring after expert review

Use the existing `evaluateExpertBenchmark` scorer with one record per frozen image: `scanId` equal to the image checksum, independent `label` from the reviewed packet, and fresh `prediction` from that image's assessment. Preserve original responses and label revisions separately. The existing command is `npm run benchmark:expert -- cases.json`.

Report total reserved, attempted, failed and missing cases alongside the scorer's accepted/excluded counts. Do not silently omit failed requests. Report first-choice and top-three agreement, review/retake rates, health coverage, confident errors, crop breakdown and confidence intervals. Inspect missed disease and incorrect treatment cases separately. Compare models on the same frozen images with the same farmer inputs; never equate supplying crop names with improved crop recognition. Public-image results remain dataset agreement, not Malaysian field accuracy.

The remaining human work is independent agronomic review and overlap/provenance clearance. Further live assessments should use a bounded provider budget after that review.
