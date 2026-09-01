"""
Phase 1 — Validator & Normalizer
Takes raw DataFrame + field_map from ingestor.
Returns cleaned DataFrame + a structured validation report.
"""
import logging
from typing import Any

import numpy as np
import pandas as pd
from dateutil import parser as dateutil_parser

logger = logging.getLogger(__name__)


def validate_and_normalize(df: pd.DataFrame, field_map: dict, missing_fields: list) -> dict:
    """
    Validate and normalize a raw ingested DataFrame.

    Returns:
        {
            "dataframe": pd.DataFrame (normalized, canonical column names),
            "report": {
                "errors": [...],
                "warnings": [...],
                "info": [...],
                "missing_fields": [...],
                "rows_removed": int,
                "duplicates_removed": int,
            },
            "is_valid": bool,   # False if required fields missing or no rows survive
        }
    """
    errors = []
    warnings = []
    info = []
    rows_removed = 0
    duplicates_removed = 0

    # ── Report missing required fields immediately ──────────────────────────
    for f in missing_fields:
        errors.append(f"Required field '{f}' is not present in the uploaded dataset.")

    if missing_fields:
        return _build_result(df, errors, warnings, info, missing_fields,
                             rows_removed, duplicates_removed, is_valid=False)

    # ── Rename columns to canonical names ──────────────────────────────────
    rename_map = {v: k for k, v in field_map.items()}
    df = df.rename(columns=rename_map).copy()

    original_count = len(df)

    # ── Amount validation ──────────────────────────────────────────────────
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce")
    null_amounts = df["amount"].isna().sum()
    if null_amounts:
        warnings.append(f"{null_amounts} rows have non-numeric 'amount' and will be dropped.")
    df = df.dropna(subset=["amount"])

    neg_amounts = (df["amount"] < 0).sum()
    if neg_amounts:
        warnings.append(f"{neg_amounts} rows have negative amounts — included but flagged.")
        df["negative_amount_flag"] = df["amount"] < 0
    else:
        df["negative_amount_flag"] = False

    zero_amounts = (df["amount"] == 0).sum()
    if zero_amounts:
        warnings.append(f"{zero_amounts} rows have zero amounts — included but flagged.")

    # ── Timestamp parsing & synthesis ──────────────────────────────────────
    if "timestamp" not in df.columns:
        df["timestamp"] = pd.date_range("2024-01-01", periods=len(df), freq="2min", tz="UTC")
        info.append("Generated chronological timestamps since no timestamp column was found.")
    else:
        # Check if timestamp is purely numeric (e.g. elapsed seconds like Kaggle Credit Card dataset)
        num_ts = pd.to_numeric(df["timestamp"], errors="coerce")
        if num_ts.notna().sum() > len(df) * 0.8:
            df["timestamp"] = pd.to_datetime(num_ts.fillna(0), unit="s", origin=pd.Timestamp("2024-01-01", tz="UTC"))
            info.append("Converted elapsed numeric time offsets into UTC datetime timestamps.")
        else:
            df["timestamp"] = df["timestamp"].apply(_safe_parse_timestamp)
            null_ts = df["timestamp"].isna().sum()
            if null_ts:
                warnings.append(f"{null_ts} rows have unparseable timestamps and were filled.")
                df["timestamp"] = df["timestamp"].fillna(pd.Timestamp("2024-01-01", tz="UTC"))
            df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)

    # ── Account ID handling & synthesis ────────────────────────────────────
    if "account_id" not in df.columns:
        # Check if we have user_id, device_id, or other candidate
        candidates = [c for c in ["user_id", "customer_id", "card_number", "device_id"] if c in df.columns]
        if candidates:
            df["account_id"] = df[candidates[0]].astype(str)
            info.append(f"Mapped entity identifier from '{candidates[0]}' as account_id.")
        else:
            # For anonymized PCA datasets (like Kaggle), assign pseudo accounts
            num_pseudo_accounts = min(120, max(20, len(df) // 50))
            account_pool = [f"ACC_ANON_{i+1:03d}" for i in range(num_pseudo_accounts)]
            # Deterministic assignment using modulo
            df["account_id"] = [account_pool[i % num_pseudo_accounts] for i in range(len(df))]
            info.append(f"Synthesized {num_pseudo_accounts} pseudo account identifiers for anonymized PCA records.")
    else:
        df["account_id"] = df["account_id"].astype(str).str.strip()
        df["account_id"] = df["account_id"].replace(["nan", "None", ""], "ACC_UNKNOWN")

    # ── Transaction ID ─────────────────────────────────────────────────────
    if "transaction_id" not in df.columns:
        df["transaction_id"] = [f"TXN_{i+1:06d}" for i in range(len(df))]
    else:
        df["transaction_id"] = df["transaction_id"].astype(str).str.strip()

    # ── Smart Sampling for very large datasets (e.g. 280,000+ rows) ─────────
    # Keeps fraud/anomalous rows + random sample to ensure fast, responsive graph rendering
    MAX_ROWS_FOR_GRAPH = 5000
    if len(df) > MAX_ROWS_FOR_GRAPH:
        status_col = [c for c in ["status", "is_fraud", "class", "target"] if c in df.columns]
        if status_col:
            fraud_rows = df[df[status_col[0]].isin([1, "1", True, "fraud", "Fraud"])]
            normal_rows = df[~df[status_col[0]].isin([1, "1", True, "fraud", "Fraud"])]
            sample_size = max(500, MAX_ROWS_FOR_GRAPH - len(fraud_rows))
            normal_sample = normal_rows.sample(n=min(sample_size, len(normal_rows)), random_state=42)
            df = pd.concat([fraud_rows, normal_sample]).sample(frac=1, random_state=42).reset_index(drop=True)
            info.append(f"Sampled {len(df)} transactions (prioritizing flagged fraud patterns) for smooth graph rendering.")
        else:
            df = df.sample(n=MAX_ROWS_FOR_GRAPH, random_state=42).reset_index(drop=True)
            info.append(f"Sampled {MAX_ROWS_FOR_GRAPH} transactions for high-performance visual analysis.")

    # ── Optional field cleaning ────────────────────────────────────────────
    for opt_col in ["merchant_id", "device_id", "location", "category", "ip_address", "status"]:
        if opt_col in df.columns:
            df[opt_col] = df[opt_col].astype(str).str.strip()
            df[opt_col] = df[opt_col].replace(["nan", "None", "NaN"], np.nan)

    # ── Duplicate detection ────────────────────────────────────────────────
    dup_mask = df["transaction_id"].duplicated(keep="first")
    dup_count = dup_mask.sum()
    if dup_count:
        warnings.append(f"{dup_count} duplicate transaction_id rows removed.")
        df = df[~dup_mask]
        duplicates_removed = dup_count

    rows_removed = original_count - len(df)
    info.append(f"{len(df)} valid records ready for AI risk analysis.")

    if len(df) == 0:
        errors.append("No valid rows remain after validation.")
        return _build_result(df, errors, warnings, info, missing_fields,
                             rows_removed, duplicates_removed, is_valid=False)

    info.append(f"{len(df)} valid rows retained for analysis.")

    return _build_result(df, errors, warnings, info, missing_fields,
                         rows_removed, duplicates_removed, is_valid=True)


def _safe_parse_timestamp(val: Any):
    """Try to parse any timestamp string/value to a datetime object."""
    if pd.isna(val) if not isinstance(val, str) else val in ("", "nan", "None"):
        return None
    if isinstance(val, (pd.Timestamp,)):
        return val
    try:
        return dateutil_parser.parse(str(val))
    except Exception:
        return None


def _build_result(df, errors, warnings, info, missing_fields,
                  rows_removed, duplicates_removed, is_valid):
    return {
        "dataframe": df,
        "report": {
            "errors": errors,
            "warnings": warnings,
            "info": info,
            "missing_fields": missing_fields,
            "rows_removed": rows_removed,
            "duplicates_removed": duplicates_removed,
        },
        "is_valid": is_valid,
    }
