# ServiceNow Background Fix Scripts

A collection of background fix scripts for ServiceNow maintenance tasks.  
All scripts are written in JavaScript (ServiceNow Rhino engine) and must be executed in scope **global** as a Fix Script.

> ⚠️ Every script includes a `DRY_RUN` flag. Always run with `DRY_RUN = true` first and review the log output before executing live changes.

---

## Repository Structure

```
/
├── README.md
├── Change Management/
│   └── fix_duplicate_changes_by_requester.js
└── HAM/
    ├── hw_model_dedup.js
    ├── hw_model_dedup_manual.js
    └── snow_asset_price_fix.js
```

---

## How to Use

1. Navigate to **System Definition → Fix Scripts** in your ServiceNow instance.
2. Create a new Fix Script and set **Scope** to **Global**.
3. Paste the content of the desired script.
4. **Always ensure `DRY_RUN = true`** before the first run.
5. Click **Run Fix Script** and review the log output.
6. If the output looks correct, set `DRY_RUN = false` and run again to apply changes.

---

## Dry Run vs. Live Run

Every script in this project includes a `DRY_RUN` flag at the top of the configuration section:

```js
var DRY_RUN = true; // true = log only | false = actually execute
```

| Mode | Effect |
|------|--------|
| `DRY_RUN = true` | Only logs what *would* happen – no data is modified |
| `DRY_RUN = false` | Executes the actual changes (deletions, updates, etc.) |

---

## Scripts

### Change Management

#### `fix_duplicate_changes_by_requester.js`

**Purpose:**  
Loads all `change_request` records requested by a specific user (manually configured via `sys_id`), groups them by `short_description`, keeps the **newest** record per group and deletes all older duplicates.

**Logic:**
- Validates that `REQUESTER_SYS_ID` is set before running
- Resolves the requester's display name for readable log output
- Queries all `change_request` records where `requested_by` matches the configured user
- Groups records by `short_description`
- Identifies groups with more than one record (duplicates)
- Keeps the newest record per group (`sys_created_on` DESC)
- Deletes all older duplicates

**Configuration:**
```js
var DRY_RUN          = true;                  // true = log only | false = actually execute
var REQUESTER_SYS_ID = 'sys_id_of_requester'; // sys_id of the target user in sys_user
```

| Variable | Description |
|----------|-------------|
| `DRY_RUN` | `true` = preview only, no changes made |
| `REQUESTER_SYS_ID` | sys_id of the user whose requested changes are processed |

> ⚠️ The script aborts with an error if `REQUESTER_SYS_ID` is left at its default placeholder value.

**Log Output Example:**
```
[CHG-DEDUP-REQUESTER] === Start (DRY-RUN) ===
[CHG-DEDUP-REQUESTER] Requester : John Doe [abc123...]
[CHG-DEDUP-REQUESTER] Total records loaded  : 5
[CHG-DEDUP-REQUESTER] Duplicate groups found : 2
[CHG-DEDUP-REQUESTER] ---
[CHG-DEDUP-REQUESTER] Title    : "Monthly Patching" | Total records: 3
[CHG-DEDUP-REQUESTER]   KEEP   → CHG0012345 | state: New | created: 2025-03-15 10:00:00
[CHG-DEDUP-REQUESTER]   DELETE → CHG0012300 | state: New | created: 2025-02-10 08:30:00
[CHG-DEDUP-REQUESTER]            [DRY-RUN – not deleted]
[CHG-DEDUP-REQUESTER]   DELETE → CHG0012100 | state: New | created: 2025-01-05 07:00:00
[CHG-DEDUP-REQUESTER]            [DRY-RUN – not deleted]
[CHG-DEDUP-REQUESTER] === Summary (DRY-RUN) ===
[CHG-DEDUP-REQUESTER] Requester        : John Doe [abc123...]
[CHG-DEDUP-REQUESTER] Records loaded   : 5
[CHG-DEDUP-REQUESTER] Duplicate groups : 2
[CHG-DEDUP-REQUESTER] Records kept     : 2
[CHG-DEDUP-REQUESTER] Records deleted  : 3 (DRY-RUN)
[CHG-DEDUP-REQUESTER] === End ===
```

---

### HAM

#### `hw_model_dedup.js`

**Purpose:**  
Finds and removes duplicate entries in the `cmdb_hardware_product_model` table. Duplicates are identified by matching `name` (case-insensitive) and `manufacturer`. The **oldest** record is kept as the master; all newer duplicates are deleted. Before deletion, any linked assets are automatically reassigned to the master record.

**Duplicate Criteria:**

| Field | Comparison |
|-------|------------|
| `name` | case-insensitive |
| `manufacturer` | case-insensitive |

**Master Logic:**

| Record | Action |
|--------|--------|
| Oldest | ✅ Kept as master |
| Newer(s) | 🔁 Assets reassigned → deleted |

**Affected Tables (Asset Reassignment):**

| Table | Field |
|-------|-------|
| `alm_asset` | `model` |
| `cmdb_ci_hardware` | `model_id` |
| `cmdb_ci` | `model_id` |

**Configuration:**
```js
var DRY_RUN = true; // true = log only | false = actually execute

var ASSET_TABLES = [
    { table: 'alm_asset',        field: 'model'    },
    { table: 'cmdb_ci_hardware', field: 'model_id' },
    { table: 'cmdb_ci',          field: 'model_id' }
];
```

Add or remove entries from `ASSET_TABLES` if your instance uses additional tables that reference hardware models.

**Log Output Example:**
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

> ⚠️ This script permanently deletes records when `DRY_RUN = false`. There is no undo. Always create a backup or verify in a non-production instance first. The script does not handle models linked to active orders or contracts — verify manually if needed.

---

#### `hw_model_dedup_manual.js`

**Purpose:**  
Deletes specific hardware model duplicates defined manually by their `sys_id`. Unlike the automatic dedup script, this script gives you full control — you explicitly specify which model to delete and which model to keep as the target. Before deletion, all linked assets are automatically reassigned to the target model.

Use this script when you already know the exact `sys_id`s of the duplicate and target models, or when the automatic script (based on name + manufacturer matching) is too broad for your situation.

**Difference to `hw_model_dedup.js`:**

| Feature | `hw_model_dedup.js` (auto) | `hw_model_dedup_manual.js` (manual) |
|---------|---------------------------|--------------------------------------|
| Duplicate detection | Automatic (name + manufacturer) | Manual (explicit sys_id pairs) |
| Control over which to delete | Oldest kept automatically | You decide per entry |
| Use case | Bulk cleanup of all duplicates | Targeted cleanup of known duplicates |

**Affected Tables (Asset Reassignment):**

| Table | Field |
|-------|-------|
| `alm_asset` | `model` |
| `cmdb_ci_hardware` | `model_id` |
| `cmdb_ci` | `model_id` |

**Configuration:**
```js
var DRY_RUN = true; // true = log only | false = actually execute

var DUPLICATES_TO_DELETE = [
    {
        delete_model_id: 'sys_id_of_model_to_delete',
        target_model_id: 'sys_id_of_model_to_keep'
    },
    // Add further entries here...
];
```

| Field | Description |
|-------|-------------|
| `delete_model_id` | sys_id of the model that will be deleted |
| `target_model_id` | sys_id of the model that assets will be reassigned to |

> ⚠️ The script validates the configuration before running. It aborts if any `delete_model_id` equals its `target_model_id`, or if placeholder values are detected.

**Log Output Example:**
```
[HW-MODEL-DEDUP] === Start (DRY-RUN) ===
[HW-MODEL-DEDUP] Entries to process: 1
[HW-MODEL-DEDUP] --- Entry 1 ---
[HW-MODEL-DEDUP]   To delete    : ThinkPad X1 Carbon (Manufacturer: Lenovo) [S5c291d...]
[HW-MODEL-DEDUP]   Target model : ThinkPad X1 Carbon Gen 9 (Manufacturer: Lenovo) [587acc...]
[HW-MODEL-DEDUP]   Linked assets: 3
[HW-MODEL-DEDUP]     [DRY-RUN] Would move 3 record(s) in "alm_asset".
[HW-MODEL-DEDUP]     [DRY-RUN] Would delete model: "ThinkPad X1 Carbon (Manufacturer: Lenovo)"
[HW-MODEL-DEDUP] === Summary (DRY-RUN) ===
[HW-MODEL-DEDUP] Entries processed : 1
[HW-MODEL-DEDUP] Assets reassigned : 3
[HW-MODEL-DEDUP] Models deleted    : 0 (DRY-RUN)
[HW-MODEL-DEDUP] === End ===
```

> ⚠️ This script permanently deletes models when `DRY_RUN = false`. There is no undo. Always verify the correct `sys_id`s in your instance before running. Always create a backup or verify in a non-production instance first.

---

#### `snow_asset_price_fix.js`

**Purpose:**  
Updates the `cost` field for all hardware assets in the `alm_hardware` table that match a given Display Name. Useful for bulk-correcting wrong or missing prices after imports or model changes. Assets where the price is already correct are skipped automatically.

**Affected Table:**

| Table | Field | Condition |
|-------|-------|-----------|
| `alm_hardware` | `cost` | `display_name` matches |

**Configuration:**
```js
var DRY_RUN = true; // true = preview only | false = changes will be saved

var ASSET_DISPLAY_NAME = 'Enter Display Name here'; // e.g. 'Dell Latitude 5520'
var NEW_PRICE          = 0.00;                      // e.g. 1299.99
```

| Variable | Description |
|----------|-------------|
| `DRY_RUN` | `true` = preview only, no changes saved |
| `ASSET_DISPLAY_NAME` | Display Name of the assets to update (case-sensitive) |
| `NEW_PRICE` | New price value to set on all matching assets |

> ⚠️ `ASSET_DISPLAY_NAME` is matched case-sensitively. Verify the exact name before running.

**Log Output Example:**
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

> ⚠️ The script aborts with an error if `ASSET_DISPLAY_NAME` is left at its default placeholder value, or if `NEW_PRICE` is not a valid positive number. Changes are not reversible once `DRY_RUN = false` — always verify the dry-run output first.

---

## Guidelines

- Comments and documentation are written in **English**.
- Scripts are written for use in **ServiceNow Fix Scripts** (server-side GlideRecord API), scope **Global**.
- Every new script must be documented in this README under the appropriate section.
- Always test with `DRY_RUN = true` before applying any live changes.

---

## License

Internal use only. Not for distribution.
