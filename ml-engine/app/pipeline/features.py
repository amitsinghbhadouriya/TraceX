"""
Phase 1 — Feature Engineering
Adds time, frequency, amount, and behavioral shift features
to the validated, normalized DataFrame.
"""
import logging

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add analytical features to the validated DataFrame.
    All features are computed purely from the available columns.
    """
    df = df.copy()
    df = df.sort_values("timestamp").reset_index(drop=True)

    df = _add_time_features(df)
    df = _add_amount_features(df)
    df = _add_frequency_features(df)
    df = _add_behavioral_shift(df)

    logger.info("Feature engineering complete: %d rows, %d total columns", len(df), len(df.columns))
    return df


# ── Time Features ──────────────────────────────────────────────────────────────

def _add_time_features(df: pd.DataFrame) -> pd.DataFrame:
    ts = df["timestamp"]
    df["hour_of_day"]       = ts.dt.hour
    df["day_of_week"]       = ts.dt.dayofweek          # 0=Mon … 6=Sun
    df["is_weekend"]        = df["day_of_week"].isin([5, 6]).astype(int)
    df["is_night"]          = df["hour_of_day"].between(0, 5).astype(int)  # midnight-6am

    # Time since last transaction for the same account
    df = df.sort_values(["account_id", "timestamp"])
    df["prev_txn_time"]     = df.groupby("account_id")["timestamp"].shift(1)
    df["mins_since_last_txn"] = (
        (df["timestamp"] - df["prev_txn_time"]).dt.total_seconds() / 60
    ).fillna(-1)
    df.drop(columns=["prev_txn_time"], inplace=True)
    return df


# ── Amount Features ────────────────────────────────────────────────────────────

def _add_amount_features(df: pd.DataFrame) -> pd.DataFrame:
    df["log_amount"] = np.log1p(df["amount"].clip(lower=0))

    # Per-account z-score
    acct_stats = df.groupby("account_id")["amount"].agg(["mean", "std"]).reset_index()
    acct_stats.columns = ["account_id", "acct_amount_mean", "acct_amount_std"]
    df = df.merge(acct_stats, on="account_id", how="left")

    # Avoid division by zero: accounts with single txn get std=0 → z=0
    df["amount_zscore"] = np.where(
        df["acct_amount_std"] > 0,
        (df["amount"] - df["acct_amount_mean"]) / df["acct_amount_std"],
        0.0,
    )
    df.drop(columns=["acct_amount_mean", "acct_amount_std"], inplace=True)

    # Global percentile rank
    df["amount_percentile"] = df["amount"].rank(pct=True)
    return df


# ── Frequency Features ─────────────────────────────────────────────────────────

def _add_frequency_features(df: pd.DataFrame) -> pd.DataFrame:
    """Rolling 1h and 24h transaction counts per account."""
    df = df.set_index("timestamp").sort_index()

    results_1h  = []
    results_24h = []

    for acct, grp in df.groupby("account_id"):
        # Count transactions in preceding 1-hour window (exclusive of current)
        cnt_1h  = grp["amount"].rolling("1h",  closed="left").count().fillna(0)
        cnt_24h = grp["amount"].rolling("24h", closed="left").count().fillna(0)
        # Keep positional (per-group) order so we can rejoin without reindexing
        # on a timestamp index that may contain duplicate labels.
        results_1h.append(cnt_1h.reset_index(drop=True))
        results_24h.append(cnt_24h.reset_index(drop=True))

    if results_1h:
        df["txn_count_1h"]  = pd.concat(results_1h, ignore_index=True).values
        df["txn_count_24h"] = pd.concat(results_24h, ignore_index=True).values
    else:
        df["txn_count_1h"]  = 0
        df["txn_count_24h"] = 0

    df = df.reset_index()

    # Flag frequency spikes: per-account rolling mean + 3σ
    freq_stats = df.groupby("account_id")["txn_count_1h"].agg(["mean", "std"]).reset_index()
    freq_stats.columns = ["account_id", "freq_mean_1h", "freq_std_1h"]
    df = df.merge(freq_stats, on="account_id", how="left")
    df["freq_spike_flag"] = (
        df["txn_count_1h"] > (df["freq_mean_1h"] + 3 * df["freq_std_1h"].fillna(0))
    ).astype(int)
    df.drop(columns=["freq_mean_1h", "freq_std_1h"], inplace=True)

    return df


# ── Behavioral Shift ───────────────────────────────────────────────────────────

def _add_behavioral_shift(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compare each transaction's 7-day rolling mean amount (prior to it) vs
    the 30-day rolling mean. Flag if 7d mean > 2× 30d mean.
    Requires the DataFrame indexed by timestamp.
    """
    df = df.set_index("timestamp").sort_index()

    shift_flags = []
    for acct, grp in df.groupby("account_id"):
        rolling_7d  = grp["amount"].rolling("7D",  closed="left").mean().fillna(0)
        rolling_30d = grp["amount"].rolling("30D", closed="left").mean().fillna(0)
        flag = ((rolling_7d > 2 * rolling_30d) & (rolling_30d > 0)).astype(int)
        shift_flags.append(flag.reset_index(drop=True))

    if shift_flags:
        df["behavioral_shift_flag"] = pd.concat(shift_flags, ignore_index=True).values
    else:
        df["behavioral_shift_flag"] = 0

    df = df.reset_index()
    return df
