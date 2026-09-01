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
    if len(df) == 0:
        df["txn_count_1h"] = 0
        df["txn_count_24h"] = 0
        df["freq_spike_flag"] = 0
        return df

    orig_index = df.index
    df_sorted = df.sort_values(["account_id", "timestamp"]).copy()
    df_ts = df_sorted.set_index("timestamp")

    try:
        roll_1h = df_ts.groupby("account_id")["amount"].rolling("1h", closed="left").count().fillna(0)
        roll_24h = df_ts.groupby("account_id")["amount"].rolling("24h", closed="left").count().fillna(0)
        df_sorted["txn_count_1h"] = roll_1h.values
        df_sorted["txn_count_24h"] = roll_24h.values
    except Exception as e:
        logger.warning("Rolling frequency calculation failed; fallback to uniform counts: %s", e)
        df_sorted["txn_count_1h"] = 1.0
        df_sorted["txn_count_24h"] = 1.0

    # Flag frequency spikes: per-account rolling mean + 3σ
    freq_stats = df_sorted.groupby("account_id")["txn_count_1h"].agg(["mean", "std"]).reset_index()
    freq_stats.columns = ["account_id", "freq_mean_1h", "freq_std_1h"]
    df_sorted = df_sorted.merge(freq_stats, on="account_id", how="left")
    df_sorted["freq_spike_flag"] = (
        df_sorted["txn_count_1h"] > (df_sorted["freq_mean_1h"] + 3 * df_sorted["freq_std_1h"].fillna(0))
    ).astype(int)
    df_sorted.drop(columns=["freq_mean_1h", "freq_std_1h"], inplace=True)

    return df_sorted.loc[orig_index]


# ── Behavioral Shift ───────────────────────────────────────────────────────────

def _add_behavioral_shift(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compare each transaction's 7-day rolling mean amount (prior to it) vs
    the 30-day rolling mean. Flag if 7d mean > 2× 30d mean.
    """
    if len(df) == 0:
        df["behavioral_shift_flag"] = 0
        return df

    orig_index = df.index
    df_sorted = df.sort_values(["account_id", "timestamp"]).copy()
    df_ts = df_sorted.set_index("timestamp")

    try:
        roll_7d = df_ts.groupby("account_id")["amount"].rolling("7D", closed="left").mean().fillna(0)
        roll_30d = df_ts.groupby("account_id")["amount"].rolling("30D", closed="left").mean().fillna(0)
        flag = ((roll_7d > 2 * roll_30d) & (roll_30d > 0)).astype(int)
        df_sorted["behavioral_shift_flag"] = flag.values
    except Exception as e:
        logger.warning("Behavioral shift calculation failed; defaulting to 0: %s", e)
        df_sorted["behavioral_shift_flag"] = 0

    return df_sorted.loc[orig_index]
