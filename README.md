# ServiceNow Background Fix Scripts

A collection of background fix scripts for ServiceNow maintenance tasks.  
All scripts are written in JavaScript (ServiceNow Rhino engine) and must be executed in scope **`global`** as a **Fix Script**.

> ⚠️ **Every script includes a `DRY_RUN` flag.**  
> Always run with `DRY_RUN = true` first and review the log output before executing live changes.

---

## Repository Structure

```
/
├── README.md
└── scripts/
    ├── hw_model_dedup.js
    └── snow_asset_price_fix.js
```

---

## Scripts

---

### 1. Hardware Model Duplicate Cleanup

**File:** `scripts/hw_model_dedup.js`

#### Purpose

Finds and removes duplicate entries in the `cmdb_hardware_product_model` table.  
Duplicates are identified by matching **name** (case-insensitive) and **manufacturer**.  
The **oldest** record is kept as the master; all newer duplicates are deleted.  
Before deletion, any linked assets are automatically reassigned to the master record.

#### Duplicate Criteria

| Field          | Comparison       |
|----------------|------------------|
| `name`         | case-insensitive |
| `manufacturer` | case-insensitive |

#### Master Logic

| Record   | Action                         |
|----------|--------------------------------|
| Oldest   | ✅ Kept as master              |
| Newer(s) | 🔁 Assets reassigned → deleted |

#### Affected Tables (Asset Reassignment)

| Table              | Field      |
|--------------------|------------|
| `alm_asset`        | `model`    |
| `cmdb_ci_hardware` | `model_id` |
| `cmdb_ci`          | `model_id` |

#### Configuration

```javascript
var DRY_RUN = true; // true = log only | false = actually execute

var ASSET_TABLES = [
    { table: 'alm_asset',        field: 'model'    },
    { table: 'cmdb_ci_hardware', field: 'model_id' },
    { table: 'cmdb_ci',          field: 'model_id' }
];
```

Add or remove entries from `ASSET_TABLES` if your instance uses additional tables that reference hardware models.

#### How to Run

1. Navigate to **System Definition → Fix Scripts** in ServiceNow.
2. Create a new Fix Script and set **Scope** to `Global`.
3. Paste the content of `hw_model_dedup.js`.
4. Ensure `DRY_RUN = true`.
5. Click **Run Fix Script** and review the log output.
6. If the log looks correct, set `DRY_RUN = false` and run again to apply changes.

#### Log Output Example

```
[HW-MODEL-DEDUP] === Start (DRY-RUN) ===
[HW-MODEL-DEDUP] --- Group: "ThinkPad X1 Carbon" | Manufacturer: Lenovo
[HW-MODEL-DEDUP]     [MASTER - keep]   abc123... | created: 2021-03-10 08:00:00
[HW-MODEL-DEDUP]     [DELETE - newer]  def456... | created: 2023-07-15 14:22:00 | assets: 5
[HW-MODEL-DEDUP]       → Reassigning assets to master...
[HW-MODEL-DEDUP]       [DRY-RUN] Would move 5 record(s) in "alm_asset".
[HW-MODEL-DEDUP]       [DRY-RUN] Would delete model: "ThinkPad X1 Carbon" [def456...]
[HW-MODEL-DEDUP] === Summary (DRY-RUN) ===
[HW-MODEL-DEDUP] Duplicate groups found : 1
[HW-MODEL-DEDUP] Assets reassigned      : 5
[HW-MODEL-DEDUP] Models deleted         : 0 (DRY-RUN)
[HW-MODEL-DEDUP] === End ===
```

#### ⚠️ Important Notes

- This script **permanently deletes** records when `DRY_RUN = false`. There is no undo.
- Always create a **backup** or verify in a non-production instance first.
- The script does not handle models linked to active orders or contracts — verify manually if needed.

---

### 2. Hardware Asset Price Fix

**File:** `scripts/snow_asset_price_fix.js`

#### Purpose

Updates the `cost` field for all hardware assets in the `alm_hardware` table that match a given **Display Name**.  
Useful for bulk-correcting wrong or missing prices after imports or model changes.  
Assets where the price is already correct are skipped automatically.

#### Affected Table

| Table          | Field  | Condition              |
|----------------|--------|------------------------|
| `alm_hardware` | `cost` | `display_name` matches |

#### Configuration

```javascript
var DRY_RUN = true; // true = preview only | false = changes will be saved

var ASSET_DISPLAY_NAME = 'Enter Display Name here'; // e.g. 'Dell Latitude 5520'
var NEW_PRICE          = 0.00;                      // e.g. 1299.99
```

| Variable             | Description                                           |
|----------------------|-------------------------------------------------------|
| `DRY_RUN`            | `true` = preview only, no changes saved               |
| `ASSET_DISPLAY_NAME` | Display Name of the assets to update (case-sensitive) |
| `NEW_PRICE`          | New price value to set on all matching assets         |

> ⚠️ `ASSET_DISPLAY_NAME` is matched **case-sensitively**. Verify the exact name before running.

#### How to Run

1. Navigate to **System Definition → Fix Scripts** in ServiceNow.
2. Create a new Fix Script and set **Scope** to `Global`.
3. Paste the content of `snow_asset_price_fix.js`.
4. Set `ASSET_DISPLAY_NAME` to the exact display name of the target assets.
5. Set `NEW_PRICE` to the correct price value.
6. Ensure `DRY_RUN = true`.
7. Click **Run Fix Script** and review the printed output.
8. If the preview looks correct, set `DRY_RUN = false` and run again to save changes.

#### Log Output Example

```
======================================================
  Hardware Asset Price Fix Script
  Mode: DRY RUN - No changes will be saved
======================================================

Searching all assets with Display Name: "Dell Latitude 5520"

--------------------------------------------------
  Asset #1
  Asset Tag     : HW-00423
  Sys ID        : abc123...
  Current Price : 999.00 EUR
  New Price     : 1299.99 EUR
  DRY RUN: Would change price from 999.00 EUR to 1299.99 EUR.

======================================================
  Summary
======================================================
  Found           : 1 asset(s)
  Already correct : 0 asset(s)
  Would be changed: 1 asset(s)  <- DRY RUN, not yet saved

  >> Set DRY_RUN = false to actually save all changes.
======================================================
  Script finished.
======================================================
```

#### ⚠️ Important Notes

- The script aborts with an error if `ASSET_DISPLAY_NAME` is left at its default placeholder value.
- The script aborts if `NEW_PRICE` is not a valid positive number.
- Assets where `cost` already equals `NEW_PRICE` are counted as "Already correct" and are not updated.
- Changes are **not reversible** once `DRY_RUN = false` — always verify the dry-run output first.

---

## Contributing

When adding a new script to this project:

1. Place the script file under `scripts/`.
2. Use English for all comments, log messages, and variable names.
3. Always include a `DRY_RUN` flag at the top of the configuration section.
4. Add a new section to this `README.md` following the structure above.

---

## License

Internal use only. Not for distribution.
