"""Generate a realistic synthetic transaction CSV dataset for TraceX development.
Seeds fraud patterns: shared devices, fraud rings, unusual amounts."""
import csv
import random
import sys
import uuid
from datetime import datetime, timedelta, timezone

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

random.seed(42)

NUM_ACCOUNTS  = 60
NUM_DEVICES   = 25
NUM_MERCHANTS = 20
NUM_LOCATIONS = 15
NUM_NORMAL    = 800
NUM_FRAUD     = 200

LOCATIONS = [
    "Mumbai", "Delhi", "Bangalore", "Chennai", "Kolkata",
    "Hyderabad", "Pune", "Ahmedabad", "Jaipur", "Surat",
    "Lucknow", "Kanpur", "Nagpur", "Visakhapatnam", "Indore",
]

CATEGORIES = [
    "retail", "food_beverage", "travel", "electronics",
    "healthcare", "utilities", "entertainment", "finance",
    "online_shopping", "fuel",
]

START_DATE = datetime(2024, 1, 1, tzinfo=timezone.utc)
END_DATE   = datetime(2024, 6, 30, tzinfo=timezone.utc)
SPAN_SECS  = int((END_DATE - START_DATE).total_seconds())


def rand_ts():
    return START_DATE + timedelta(seconds=random.randint(0, SPAN_SECS))


def rand_amount(min_amt, max_amt):
    return round(random.uniform(min_amt, max_amt), 2)


# ── Fraud ring setup ───────────────────────────────────────────────────────────
# Ring A: 5 accounts share 2 devices + 1 merchant (high amounts)
RING_A_ACCOUNTS  = [f"ACC{i:03d}" for i in range(1, 6)]
RING_A_DEVICES   = ["DEV_001", "DEV_002"]
RING_A_MERCHANT  = "MCH_FRAUD_01"

# Ring B: 4 accounts share 1 device (late-night, small rapid transactions)
RING_B_ACCOUNTS  = [f"ACC{i:03d}" for i in range(6, 10)]
RING_B_DEVICE    = "DEV_003"
RING_B_MERCHANT  = "MCH_FRAUD_02"

# High-risk solo accounts
SOLO_RISK_ACCS   = [f"ACC{i:03d}" for i in range(10, 13)]

# Normal accounts
NORMAL_ACCS      = [f"ACC{i:03d}" for i in range(13, NUM_ACCOUNTS + 1)]
NORMAL_DEVICES   = [f"DEV_{i:03d}" for i in range(10, NUM_DEVICES + 1)]
NORMAL_MERCHANTS = [f"MCH_{i:03d}" for i in range(5, NUM_MERCHANTS + 1)]

rows = []


def add_row(txn_id, ts, account, device, merchant, location, amount, category):
    rows.append({
        "transaction_id": txn_id,
        "timestamp":      ts.isoformat(),
        "account_id":     account,
        "device_id":      device,
        "merchant_id":    merchant,
        "location":       location,
        "amount":         amount,
        "category":       category,
    })


# ── Ring A transactions ────────────────────────────────────────────────────────
for i in range(80):
    acct = random.choice(RING_A_ACCOUNTS)
    dev  = random.choice(RING_A_DEVICES)
    ts   = rand_ts()
    add_row(str(uuid.uuid4()), ts, acct, dev, RING_A_MERCHANT,
            "Mumbai", rand_amount(5000, 50000), "finance")

# ── Ring B transactions (late-night, frequent) ────────────────────────────────
for i in range(60):
    acct = random.choice(RING_B_ACCOUNTS)
    # Mostly between midnight and 4 AM
    ts = START_DATE + timedelta(
        days=random.randint(0, 180),
        hours=random.randint(0, 4),
        minutes=random.randint(0, 59)
    )
    add_row(str(uuid.uuid4()), ts, acct, RING_B_DEVICE, RING_B_MERCHANT,
            "Delhi", rand_amount(100, 999), "online_shopping")

# ── Solo risk accounts (abnormal amounts) ────────────────────────────────────
for acct in SOLO_RISK_ACCS:
    # Normal baseline
    for _ in range(10):
        add_row(str(uuid.uuid4()), rand_ts(), acct,
                random.choice(NORMAL_DEVICES),
                random.choice(NORMAL_MERCHANTS),
                random.choice(LOCATIONS),
                rand_amount(100, 2000), random.choice(CATEGORIES))
    # Sudden spike
    ts_spike = rand_ts()
    for _ in range(5):
        add_row(str(uuid.uuid4()),
                ts_spike + timedelta(minutes=random.randint(1, 30)),
                acct, random.choice(NORMAL_DEVICES),
                random.choice(NORMAL_MERCHANTS),
                "Bangalore", rand_amount(20000, 100000), "electronics")

# ── Normal transactions ────────────────────────────────────────────────────────
for _ in range(NUM_NORMAL):
    acct    = random.choice(NORMAL_ACCS)
    device  = random.choice(NORMAL_DEVICES)
    merch   = random.choice(NORMAL_MERCHANTS)
    loc     = random.choice(LOCATIONS)
    cat     = random.choice(CATEGORIES)
    amount  = rand_amount(50, 5000)
    add_row(str(uuid.uuid4()), rand_ts(), acct, device, merch, loc, amount, cat)

# ── Shuffle & write ────────────────────────────────────────────────────────────
random.shuffle(rows)

output_path = "sample_transactions.csv"
fieldnames = ["transaction_id", "timestamp", "account_id", "device_id",
              "merchant_id", "location", "amount", "category"]

with open(output_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)

print(f"✅ Generated {len(rows)} transactions → {output_path}")
print(f"   Ring A accounts: {RING_A_ACCOUNTS}")
print(f"   Ring B accounts: {RING_B_ACCOUNTS}")
print(f"   High-risk solo:  {SOLO_RISK_ACCS}")
