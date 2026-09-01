"""
Phase 2 — Anomaly Detection
Isolation Forest + statistical signal combination.
Returns DataFrame with per-transaction anomaly scores and triggered signals.
"""
import logging
from typing import Any

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)

# Numeric features fed into Isolation Forest (only use if column exists)
IF_FEATURE_CANDIDATES = [
    "amount", "log_amount", "hour_of_day", "day_of_week", "is_weekend", "is_night",
    "mins_since_last_txn", "amount_zscore", "amount_percentile",
    "txn_count_1h", "txn_count_24h", "freq_spike_flag", "behavioral_shift_flag",
]

# Weights for composite score  (must sum to 1.0)
WEIGHTS = {
    "isolation_forest":    0.40,
    "amount_zscore":       0.20,
    "freq_spike":          0.15,
    "unusual_timing":      0.10,
    "behavioral_shift":    0.15,
}


def detect_anomalies(df: pd.DataFrame) -> pd.DataFrame:
    """
    Run all anomaly detectors and produce a composite anomaly score (0–1)
    with a list of triggered signal names per transaction.
    """
    df = df.copy()

    df = _run_isolation_forest(df)
    df = _flag_amount_zscore(df)
    df = _flag_freq_spike(df)
    df = _flag_unusual_timing(df)
    df = _flag_behavioral_shift(df)
    df = _compute_composite_score(df)
    df = _build_signal_list(df)

    anomaly_count = (df["composite_anomaly_score"] > 0.5).sum()
    logger.info(
        "Anomaly detection complete: %d anomalous (score>0.5) of %d total",
        anomaly_count, len(df)
    )
    return df


# ── Isolation Forest ───────────────────────────────────────────────────────────

def _run_isolation_forest(df: pd.DataFrame) -> pd.DataFrame:
    available = [c for c in IF_FEATURE_CANDIDATES if c in df.columns]
    if not available:
        df["if_anomaly_score"] = 0.0
        return df

    X = df[available].fillna(0).replace([np.inf, -np.inf], 0).values
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    n_samples = len(X_scaled)
    contamination = min(0.15, max(0.01, 50 / n_samples))  # adaptive

    clf = IsolationForest(
        n_estimators=200,
        contamination=contamination,
        random_state=42,
        n_jobs=-1,
    )
    clf.fit(X_scaled)

    # Raw scores: negative → anomalous. Normalize to [0, 1] where 1 = most anomalous
    raw_scores = clf.score_samples(X_scaled)
    normalized = 1 - (raw_scores - raw_scores.min()) / (raw_scores.max() - raw_scores.min() + 1e-9)
    df["if_anomaly_score"] = normalized
    return df


# ── Statistical Signal Flags ───────────────────────────────────────────────────

def _flag_amount_zscore(df: pd.DataFrame) -> pd.DataFrame:
    if "amount_zscore" not in df.columns:
        df["amount_zscore_flag"] = 0.0
        return df
    # Sigmoid-like: score scales with |z|, max 1.0 at |z|>=5
    z = df["amount_zscore"].abs().fillna(0)
    df["amount_zscore_score"] = np.clip(z / 5.0, 0, 1)
    df["amount_zscore_flag"]  = (z > 3).astype(int)
    return df


def _flag_freq_spike(df: pd.DataFrame) -> pd.DataFrame:
    if "freq_spike_flag" not in df.columns:
        df["freq_spike_score"] = 0.0
        return df
    df["freq_spike_score"] = df["freq_spike_flag"].fillna(0).clip(0, 1).astype(float)
    return df


def _flag_unusual_timing(df: pd.DataFrame) -> pd.DataFrame:
    """Flag if transaction hour is in the bottom 5th percentile for that account."""
    if "hour_of_day" not in df.columns:
        df["unusual_timing_score"] = 0.0
        df["unusual_timing_flag"]  = 0
        return df

    def _per_account_timing(grp):
        p5 = grp["hour_of_day"].quantile(0.05)
        p95 = grp["hour_of_day"].quantile(0.95)
        grp = grp.copy()
        # Flag if outside normal hour range for this account
        flag = ~grp["hour_of_day"].between(p5, p95)
        grp["unusual_timing_flag"]  = flag.astype(int)
        grp["unusual_timing_score"] = flag.astype(float)
        return grp

    # Only apply per-account if enough data; otherwise use global night flag
    if "account_id" in df.columns and df["account_id"].nunique() > 1:
        result = df.groupby("account_id", group_keys=False).apply(_per_account_timing)
        df["unusual_timing_flag"]  = result["unusual_timing_flag"]
        df["unusual_timing_score"] = result["unusual_timing_score"]
    else:
        df["unusual_timing_flag"]  = df.get("is_night", pd.Series(0, index=df.index))
        df["unusual_timing_score"] = df["unusual_timing_flag"].astype(float)

    return df


def _flag_behavioral_shift(df: pd.DataFrame) -> pd.DataFrame:
    if "behavioral_shift_flag" not in df.columns:
        df["behavioral_shift_score"] = 0.0
        return df
    df["behavioral_shift_score"] = df["behavioral_shift_flag"].fillna(0).clip(0, 1).astype(float)
    return df


# ── Composite Score ────────────────────────────────────────────────────────────

def _compute_composite_score(df: pd.DataFrame) -> pd.DataFrame:
    score = (
        WEIGHTS["isolation_forest"]  * df.get("if_anomaly_score",      pd.Series(0, index=df.index)) +
        WEIGHTS["amount_zscore"]     * df.get("amount_zscore_score",   pd.Series(0, index=df.index)) +
        WEIGHTS["freq_spike"]        * df.get("freq_spike_score",      pd.Series(0, index=df.index)) +
        WEIGHTS["unusual_timing"]    * df.get("unusual_timing_score",  pd.Series(0, index=df.index)) +
        WEIGHTS["behavioral_shift"]  * df.get("behavioral_shift_score", pd.Series(0, index=df.index))
    )
    df["composite_anomaly_score"] = score.clip(0, 1).round(4)
    return df


# ── Signal List ────────────────────────────────────────────────────────────────

def _build_signal_list(df: pd.DataFrame) -> pd.DataFrame:
    """Build a human-readable list of triggered signals for each transaction."""
    def signals(row) -> list[str]:
        fired = []
        if row.get("amount_zscore_flag", 0):
            fired.append(f"Abnormal amount (z-score={row.get('amount_zscore', 0):.1f})")
        if row.get("freq_spike_flag", 0):
            fired.append(f"Frequency spike ({int(row.get('txn_count_1h', 0))} txns in 1h)")
        if row.get("unusual_timing_flag", 0):
            fired.append(f"Unusual transaction time (hour={int(row.get('hour_of_day', 0))})")
        if row.get("behavioral_shift_flag", 0):
            fired.append("Sudden behavioral shift (7-day amount spike vs 30-day baseline)")
        if row.get("if_anomaly_score", 0) > 0.7:
            fired.append(f"Multivariate outlier (Isolation Forest score={row.get('if_anomaly_score', 0):.2f})")
        return fired

    df["triggered_signals"] = df.apply(signals, axis=1)
    return df


# ── Summary Helper ─────────────────────────────────────────────────────────────

def build_anomaly_summary(df: pd.DataFrame) -> dict:
    """Build a summary dict for the API response."""
    total = len(df)
    anomalous = int((df["composite_anomaly_score"] > 0.5).sum())
    score_col = df["composite_anomaly_score"]

    id_col = "transaction_id" if "transaction_id" in df.columns else None
    top_n = df.nlargest(10, "composite_anomaly_score")

    top_txns = []
    for _, row in top_n.iterrows():
        entry: dict[str, Any] = {
            "account_id": str(row.get("account_id", "unknown")),
            "amount": float(row.get("amount", 0)),
            "timestamp": str(row.get("timestamp", "")),
            "composite_anomaly_score": float(row.get("composite_anomaly_score", 0)),
            "triggered_signals": row.get("triggered_signals", []),
        }
        if id_col:
            entry["transaction_id"] = str(row.get("transaction_id", ""))
        top_txns.append(entry)

    return {
        "total_transactions": total,
        "anomalous_count":    anomalous,
        "anomaly_rate":       round(anomalous / total, 4) if total else 0,
        "avg_score":          round(float(score_col.mean()), 4),
        "max_score":          round(float(score_col.max()), 4),
        "score_distribution": _score_histogram(score_col),
        "top_anomalous_transactions": top_txns,
    }


def _score_histogram(scores: pd.Series) -> list[dict]:
    bins = [0, 0.2, 0.4, 0.6, 0.8, 1.0]
    labels = ["0-0.2", "0.2-0.4", "0.4-0.6", "0.6-0.8", "0.8-1.0"]
    counts, _ = np.histogram(scores.dropna(), bins=bins)
    return [{"range": label, "count": int(c)} for label, c in zip(labels, counts)]
