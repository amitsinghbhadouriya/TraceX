"""
Phase 1 — Ingestor
Reads CSV or Excel files, auto-detects canonical column names,
and returns a raw DataFrame with a field-map report.

Security guarantees:
- Magic byte validation & binary executable blocklist
- Zip bomb & archive traversal protection for .xlsx / .xlsm
- Safe in-memory parsing with zero execution risk
"""
import io
import logging
import zipfile
from pathlib import Path

import pandas as pd

logger = logging.getLogger(__name__)

# Canonical column names → possible source column aliases (lowercase)
CANONICAL_MAP = {
    "transaction_id": [
        "transaction_id", "txn_id", "trans_id", "id", "transaction id", "trans_num",
        "tx_id", "transaction_num", "trans_no", "step", "idx", "row_id"
    ],
    "timestamp": [
        "timestamp", "date", "time", "datetime", "txn_date", "transaction_date",
        "created_at", "date_time", "trans_date", "step", "trans_date_trans_time",
        "epoch", "trans_time", "unix_time", "purchase_time", "transactiondt",
        "signup_time", "event_time", "occurred_at"
    ],
    "amount": [
        "amount", "amt", "transaction_amount", "txn_amount", "value", "sum",
        "price", "total", "trans_amt", "payment", "cost", "purchase_value",
        "transactionamt", "transamt", "amt_usd", "tx_amount", "payment_amount", "val"
    ],
    "account_id": [
        "account_id", "account", "acct_id", "acct", "sender", "source_account",
        "from_account", "accountid", "user_id", "customer_id", "customer", "cust_id",
        "card_number", "cc_num", "client_id", "src_account", "orig_account", "nameorig",
        "sender_id", "source", "card1", "card2", "card_id", "userid", "account_no", "account_num"
    ],
    "merchant_id": [
        "merchant_id", "merchant", "merch_id", "store_id", "vendor_id", "payee",
        "merchant_name", "dest_account", "recipient", "receiver", "destination",
        "namedest", "target", "dest", "target_account", "p_emaildomain", "r_emaildomain",
        "recipient_id", "vendor", "store"
    ],
    "device_id": [
        "device_id", "device", "dev_id", "deviceid", "ip_address", "ip", "terminal_id",
        "terminal", "hardware_id", "mac_address", "card3", "card4", "card5", "card6",
        "device_model", "client_device"
    ],
    "location": [
        "location", "city", "region", "country", "loc", "place", "state", "zip",
        "lat_long", "lat", "long", "latitude", "longitude", "zip_code", "billing_city",
        "country_code", "addr1", "addr2", "merchant_city", "merchant_state"
    ],
    "category": [
        "category", "cat", "type", "txn_type", "transaction_type", "mcc", "category_desc",
        "payment_type", "action", "productcd", "genre"
    ],
    "ip_address": [
        "ip_address", "ip", "ipaddress", "ip_addr", "client_ip", "source_ip", "user_ip"
    ],
    "status": [
        "status", "txn_status", "state", "result", "is_fraud", "class", "target",
        "isfraud", "fraud_label", "label", "is_flagged_fraud", "is_anomaly", "fraud"
    ],
}

REQUIRED_FIELDS = {"amount"}

EXECUTABLE_PREFIXES = (
    b"MZ",              # Windows PE
    b"\x7fELF",         # Linux ELF
    b"\xfe\xed\xfa\xce",# Mach-O
    b"\xce\xfa\xed\xfe",
    b"\xfe\xed\xfa\xcf",
    b"\xcf\xfa\xed\xfe",
    b"\xca\xfe\xba\xbe",# Java class
    b"\x00asm",         # WASM
    b"#!",              # Shebang
)

ZIP_MAGIC = b"PK\x03\x04"
OLE_MAGIC = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"

MAX_UNCOMPRESSED_EXCEL_BYTES = 500 * 1024 * 1024  # 500 MB max expanded size
MAX_COMPRESSION_RATIO = 100.0


def _verify_safe_zip(file_bytes: bytes) -> None:
    """Inspects a zip archive (e.g. .xlsx) to prevent Zip Bombs and directory traversal."""
    try:
        with zipfile.ZipFile(io.BytesIO(file_bytes)) as zf:
            total_uncompressed = 0
            for info in zf.infolist():
                # Directory traversal prevention
                if ".." in info.filename or info.filename.startswith("/") or info.filename.startswith("\\"):
                    raise ValueError("Archive entry contains invalid path sequence.")
                total_uncompressed += info.file_size
                if total_uncompressed > MAX_UNCOMPRESSED_EXCEL_BYTES:
                    raise ValueError("File exceeds maximum allowed decompression size.")

            compressed_size = max(len(file_bytes), 1)
            ratio = total_uncompressed / compressed_size
            if ratio > MAX_COMPRESSION_RATIO and total_uncompressed > 10 * 1024 * 1024:
                raise ValueError("Suspicious compression ratio detected (potential decompression bomb).")
    except zipfile.BadZipFile as e:
        raise ValueError("Invalid or corrupted Excel archive format.") from e


def ingest_file(file_bytes: bytes, filename: str) -> dict:
    """
    Ingest a CSV or Excel file.

    Returns:
        {
            "dataframe": pd.DataFrame,
            "field_map": { canonical_name: detected_column },
            "missing_fields": [canonical_names not found],
            "extra_columns": [columns in file not mapped to any canonical name],
            "row_count": int,
            "column_count": int,
        }
    """
    if not file_bytes:
        raise ValueError("Uploaded file is empty.")

    # ── 1. Executable & Script Signature Verification ─────────────────────────
    sample = file_bytes[:1024]
    for prefix in EXECUTABLE_PREFIXES:
        if sample.startswith(prefix):
            raise ValueError("Executable or script payload detected. File rejected for security.")

    ext = Path(filename).suffix.lower()

    # ── 2. Content & Format Parsing ───────────────────────────────────────────
    try:
        if ext in (".csv", ".txt"):
            if b"\x00" in sample:
                raise ValueError("Binary null bytes detected in CSV/text file.")
            df = pd.read_csv(io.BytesIO(file_bytes), low_memory=False)
        elif ext in (".xlsx", ".xlsm"):
            if not sample.startswith(ZIP_MAGIC):
                raise ValueError("Invalid .xlsx file: missing Office Open XML zip signature.")
            _verify_safe_zip(file_bytes)
            df = pd.read_excel(io.BytesIO(file_bytes), engine="openpyxl", data_only=True)
        elif ext == ".xls":
            if not sample.startswith(OLE_MAGIC):
                raise ValueError("Invalid .xls file: missing OLE CFB compound binary signature.")
            df = pd.read_excel(io.BytesIO(file_bytes), engine="openpyxl")
        else:
            raise ValueError(f"Unsupported file extension: {ext}. Accepted: .csv, .xlsx, .xls")
    except ValueError:
        raise
    except Exception as e:
        logger.exception("Failed to parse file '%s': %s", filename, e)
        raise ValueError("Failed to parse file: file content is corrupted or in an unsupported format.") from e

    if df.empty:
        raise ValueError("Uploaded file is empty.")

    field_map, missing_fields, extra_columns = _detect_columns(df)
    logger.info(
        "Ingested '%s': %d rows, %d cols, field_map=%s, missing=%s",
        filename, len(df), len(df.columns), field_map, missing_fields
    )

    return {
        "dataframe": df,
        "field_map": field_map,
        "missing_fields": missing_fields,
        "extra_columns": extra_columns,
        "row_count": len(df),
        "column_count": len(df.columns),
        "original_filename": filename,
    }


def _detect_columns(df: pd.DataFrame) -> tuple[dict, list, list]:
    """Map DataFrame columns to canonical names via alias matching."""
    normalized_cols = {col.strip().lower().replace(" ", "_"): col for col in df.columns}
    field_map = {}
    matched_originals = set()

    for canonical, aliases in CANONICAL_MAP.items():
        for alias in aliases:
            alias_norm = alias.replace(" ", "_")
            if alias_norm in normalized_cols:
                original_col = normalized_cols[alias_norm]
                field_map[canonical] = original_col
                matched_originals.add(original_col)
                break

    # Smart fallback for amount if not explicitly detected by alias
    if "amount" not in field_map:
        numeric_candidates = [
            c for c in df.columns
            if c not in matched_originals and pd.to_numeric(df[c], errors="coerce").notna().sum() > len(df) * 0.5
        ]
        if numeric_candidates:
            # Pick first available numeric candidate
            chosen = numeric_candidates[0]
            field_map["amount"] = chosen
            matched_originals.add(chosen)
            logger.info("Auto-detected '%s' as transaction amount column (fallback).", chosen)

    missing_fields = [f for f in REQUIRED_FIELDS if f not in field_map]
    extra_columns = [col for col in df.columns if col not in matched_originals]

    return field_map, missing_fields, extra_columns
