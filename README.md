# Distributor Candidate Cleanup + Scoring Pipeline

This repository provides a Python (standard library only) pipeline to:
- clean raw distributor data,
- detect and remove duplicates,
- exclude ineligible candidates,
- score remaining candidates,
- produce a Top 10 recommendation note.

## Run

```bash
python scripts/score_distributors.py --input data/distributors_raw.csv --outdir outputs
```

## Input schema (`data/distributors_raw.csv`)

The script accepts flexible headers and maps common aliases, but this is the canonical schema:

| column | description |
|---|---|
| company_name | Distributor company name |
| website | Company website URL/domain |
| email | Contact email |
| country | Target country |
| city | City/location |
| customer_type | Segment (e.g., hospital/clinic/derm) |
| coverage | e.g., national, multi-city |
| installation | yes/no |
| training | yes/no |
| after-sales | yes/no |
| energy_devices_experience | yes/no |

If columns are missing, the pipeline treats values as unknown and continues.

### Sample CSV (3 rows)

```csv
company_name,website,email,country,city,customer_type,coverage,installation,training,after-sales,energy_devices_experience
Aster Med Distributors,astermed.com,contact@astermed.com,UAE,Dubai,hospital/clinic,national,yes,yes,yes,yes
Aster Medical Distribution LLC,www.astermed.com,sales@astermed.com,UAE,Abu Dhabi,hospital,multi-city,yes,yes,yes,yes
Retail Beauty Shop,,owner@retailbeauty.example,Thailand,Bangkok,retail-only,city,no,no,no,no
```

## Output files

Running the script generates:
- `outputs/distributors_clean.csv`
- `outputs/distributors_scored.csv` (adds: `score`, `tier`, `next_action`, `reasons`)
- `outputs/distributors_excluded.csv` (adds: `excluded_reason`)
- `outputs/duplicates_report.csv`
- `outputs/top10.md`

## Scoring rules

Configured in `config/scoring_rules.json` (100-point framework):
- installation yes: +15
- training yes: +10
- after-sales yes: +20
- customer_type hospital/clinic/derm: +15
- energy_devices_experience yes: +15
- coverage national: +10, multi-city: +5
- no website and no email: -10

Exclusion rules:
- `customer_type` is retail-only
- clearly not a distributor (e.g., manufacturer-only, consultancy, marketing agency)

## Notes on deduplication

Deduplication uses standard-library logic:
- exact website domain match => same entity,
- otherwise fuzzy company-name matching using `difflib.SequenceMatcher` after normalization.

Duplicate decisions are written to `outputs/duplicates_report.csv`.
