#!/usr/bin/env python3
"""Clean, dedupe, score distributor candidates from a raw CSV file."""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
from difflib import SequenceMatcher
from urllib.parse import urlparse


DEFAULT_RULES_PATH = os.path.join("config", "scoring_rules.json")


def normalize_text(value: str) -> str:
    if value is None:
        return ""
    text = str(value).strip().lower()
    text = re.sub(r"\s+", " ", text)
    return text


def normalize_company_name(name: str) -> str:
    text = normalize_text(name)
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    suffixes = {
        "co", "company", "ltd", "llc", "inc", "corp", "corporation", "limited",
        "distributor", "distributors", "trading", "group", "international", "intl"
    }
    tokens = [t for t in text.split() if t and t not in suffixes]
    return " ".join(tokens)


def yes_like(value: str) -> bool:
    text = normalize_text(value)
    return text in {"yes", "y", "true", "1"}


def extract_domain(url: str) -> str:
    if not url:
        return ""
    text = normalize_text(url)
    if not text or text in {"unknown", "n/a", "na", "none", "-"}:
        return ""
    if "//" not in text:
        text = "http://" + text
    parsed = urlparse(text)
    netloc = parsed.netloc.lower()
    if netloc.startswith("www."):
        netloc = netloc[4:]
    if not netloc or netloc in {"unknown", "n/a", "na", "none", "-"}:
        return ""
    return netloc


def get_value(row: dict[str, str], *candidates: str) -> str:
    lowered = {k.lower(): k for k in row}
    for c in candidates:
        k = lowered.get(c.lower())
        if k:
            return row.get(k, "")
    return ""


def infer_record(row: dict[str, str]) -> dict[str, str]:
    company_name = get_value(row, "company_name", "company", "name", "distributor_name")
    website = get_value(row, "website", "url", "company_website")
    email = get_value(row, "email", "contact_email")
    country = get_value(row, "country", "market")
    city = get_value(row, "city", "location")
    customer_type = get_value(row, "customer_type", "customer segment", "segment")
    coverage = get_value(row, "coverage", "coverage_scope")
    installation = get_value(
        row,
        "installation",
        "installation_support",
        "service_installation",
    )
    training = get_value(
        row,
        "training",
        "training_support",
        "service_training",
    )
    after_sales = get_value(
        row,
        "after-sales",
        "after_sales",
        "after sales",
        "service_support",
        "service_as",
    )
    energy_devices_experience = get_value(
        row, "energy_devices_experience", "energy experience", "aesthetic_device_experience"
    )

    clean = {
        "company_name": company_name.strip(),
        "website": website.strip(),
        "email": email.strip(),
        "country": country.strip(),
        "city": city.strip(),
        "customer_type": customer_type.strip(),
        "coverage": coverage.strip(),
        "installation": installation.strip(),
        "training": training.strip(),
        "after_sales": after_sales.strip(),
        "energy_devices_experience": energy_devices_experience.strip(),
    }
    return clean


def is_excluded(record: dict[str, str], rules: dict) -> tuple[bool, str]:
    customer_type = normalize_text(record.get("customer_type", ""))
    excluded_types = [normalize_text(x) for x in rules.get("excluded_customer_types", [])]

    if customer_type in excluded_types:
        return True, f"excluded_customer_type:{record.get('customer_type', '') or 'unknown'}"

    not_distributor_markers = [
        "manufacturer",
        "software vendor",
        "consultancy",
        "marketing agency",
        "freelancer",
    ]
    for marker in not_distributor_markers:
        if marker in customer_type:
            return True, f"not_distributor:{marker}"

    return False, ""


def score_record(record: dict[str, str], rules: dict) -> tuple[int, str, str]:
    weights = rules.get("weights", {})
    reasons: list[str] = []
    score = 0

    if yes_like(record.get("installation", "")):
        score += int(weights.get("installation_yes", 0))
        reasons.append("installation=yes")

    if yes_like(record.get("training", "")):
        score += int(weights.get("training_yes", 0))
        reasons.append("training=yes")

    if yes_like(record.get("after_sales", "")):
        score += int(weights.get("after_sales_yes", 0))
        reasons.append("after_sales=yes")

    customer_type = normalize_text(record.get("customer_type", ""))
    targets = {normalize_text(x) for x in rules.get("target_customer_types", [])}
    if any(t in customer_type for t in targets if t):
        score += int(weights.get("customer_type_target", 0))
        reasons.append("customer_type=target")

    if yes_like(record.get("energy_devices_experience", "")):
        score += int(weights.get("energy_devices_experience_yes", 0))
        reasons.append("energy_devices_experience=yes")

    coverage = normalize_text(record.get("coverage", ""))
    if "national" in coverage:
        score += int(weights.get("coverage_national", 0))
        reasons.append("coverage=national")
    elif "multi-city" in coverage or "multi city" in coverage or "regional" in coverage:
        score += int(weights.get("coverage_multi_city", 0))
        reasons.append("coverage=multi_city")

    if not normalize_text(record.get("website", "")) and not normalize_text(record.get("email", "")):
        score += int(weights.get("no_website_and_no_email_penalty", 0))
        reasons.append("penalty=no_website_and_no_email")

    if score >= 70:
        tier = "A"
        next_action = "Prioritize immediate outreach and qualification call"
    elif score >= 40:
        tier = "B"
        next_action = "Follow up with capability verification and references"
    else:
        tier = "C"
        next_action = "Nurture or request missing capability details"

    return score, tier, "; ".join(reasons), next_action


def dedupe_records(records: list[dict[str, str]]) -> tuple[list[dict[str, str]], list[dict[str, str]]]:
    deduped: list[dict[str, str]] = []
    duplicates: list[dict[str, str]] = []

    for rec in records:
        rec_name_norm = normalize_company_name(rec.get("company_name", ""))
        rec_domain = extract_domain(rec.get("website", ""))

        found_parent = None
        match_basis = ""
        similarity = 0.0

        for parent in deduped:
            parent_name_norm = normalize_company_name(parent.get("company_name", ""))
            parent_domain = extract_domain(parent.get("website", ""))

            if rec_domain and parent_domain and rec_domain == parent_domain:
                found_parent = parent
                match_basis = "website_domain"
                similarity = 1.0
                break

            if rec_name_norm and parent_name_norm:
                sim = SequenceMatcher(None, rec_name_norm, parent_name_norm).ratio()
                if sim >= 0.88:
                    found_parent = parent
                    match_basis = "name_fuzzy"
                    similarity = sim
                    break

        if found_parent is None:
            deduped.append(rec)
        else:
            duplicates.append(
                {
                    "duplicate_company_name": rec.get("company_name", ""),
                    "duplicate_website": rec.get("website", ""),
                    "matched_company_name": found_parent.get("company_name", ""),
                    "matched_website": found_parent.get("website", ""),
                    "match_basis": match_basis,
                    "name_similarity": f"{similarity:.3f}",
                }
            )

    return deduped, duplicates


def write_csv(path: str, rows: list[dict[str, str]], fieldnames: list[str]) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({k: row.get(k, "") for k in fieldnames})


def build_top10_markdown(path: str, scored_rows: list[dict[str, str]]) -> None:
    top = sorted(scored_rows, key=lambda r: int(r.get("score", 0)), reverse=True)[:10]

    lines = ["# Top 10 Distributor Recommendations", ""]
    if not top:
        lines.append("No eligible distributors after exclusion and deduplication.")
    else:
        for i, row in enumerate(top, start=1):
            lines.append(f"## {i}. {row.get('company_name', 'Unknown')} (Score: {row.get('score', '0')}, Tier: {row.get('tier', 'C')})")
            lines.append(f"- Coverage/Market Fit: {row.get('coverage', 'unknown') or 'unknown'}; Customer type: {row.get('customer_type', 'unknown') or 'unknown'}.")
            lines.append(f"- Service Capability: installation={row.get('installation', 'unknown') or 'unknown'}, training={row.get('training', 'unknown') or 'unknown'}, after-sales={row.get('after_sales', 'unknown') or 'unknown'}.")
            lines.append(f"- Why prioritized: {row.get('reasons', 'insufficient data') or 'insufficient data'}. Next action: {row.get('next_action', '')}")
            lines.append("")

    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines).rstrip() + "\n")


def load_rules(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def main() -> None:
    parser = argparse.ArgumentParser(description="Clean, dedupe, and score distributor CSV data")
    parser.add_argument("--input", required=True, help="Path to raw CSV input")
    parser.add_argument("--outdir", required=True, help="Output directory")
    parser.add_argument("--rules", default=DEFAULT_RULES_PATH, help="Path to scoring_rules.json")
    args = parser.parse_args()

    if not os.path.exists(args.input):
        raise FileNotFoundError(f"Input file not found: {args.input}")

    rules = load_rules(args.rules)

    with open(args.input, "r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        raw_rows = list(reader)

    cleaned_rows = [infer_record(r) for r in raw_rows]
    deduped_rows, duplicate_rows = dedupe_records(cleaned_rows)

    excluded_rows: list[dict[str, str]] = []
    eligible_rows: list[dict[str, str]] = []

    for row in deduped_rows:
        excluded, reason = is_excluded(row, rules)
        if excluded:
            out = dict(row)
            out["excluded_reason"] = reason
            excluded_rows.append(out)
        else:
            eligible_rows.append(row)

    scored_rows: list[dict[str, str]] = []
    for row in eligible_rows:
        score, tier, reasons, next_action = score_record(row, rules)
        out = dict(row)
        out["score"] = str(score)
        out["tier"] = tier
        out["next_action"] = next_action
        out["reasons"] = reasons
        scored_rows.append(out)

    outdir = args.outdir
    os.makedirs(outdir, exist_ok=True)

    clean_fields = [
        "company_name", "website", "email", "country", "city", "customer_type", "coverage",
        "installation", "training", "after_sales", "energy_devices_experience",
    ]
    scored_fields = clean_fields + ["score", "tier", "next_action", "reasons"]
    excluded_fields = clean_fields + ["excluded_reason"]
    dup_fields = [
        "duplicate_company_name", "duplicate_website", "matched_company_name",
        "matched_website", "match_basis", "name_similarity",
    ]

    write_csv(os.path.join(outdir, "distributors_clean.csv"), deduped_rows, clean_fields)
    write_csv(os.path.join(outdir, "distributors_scored.csv"), scored_rows, scored_fields)
    write_csv(os.path.join(outdir, "distributors_excluded.csv"), excluded_rows, excluded_fields)
    write_csv(os.path.join(outdir, "duplicates_report.csv"), duplicate_rows, dup_fields)
    build_top10_markdown(os.path.join(outdir, "top10.md"), scored_rows)


if __name__ == "__main__":
    main()
