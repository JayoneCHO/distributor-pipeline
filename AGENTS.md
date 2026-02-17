# AGENTS.md

## Scope
These instructions apply to the full repository.

## Working rules
- Use Python standard library only for pipeline code.
- Do not fabricate data; missing values must remain unknown/blank.
- Keep outputs deterministic and reproducible from repository inputs.
- Prefer small, readable functions with explicit CSV field mappings.

## Validation
Before finishing changes, run:

```bash
python scripts/score_distributors.py --input data/distributors_raw.csv --outdir outputs
```

and confirm all required output artifacts are generated.
