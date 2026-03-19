# 🔧 ServiceNow Background Script – Hardware Asset Price Fix

A ServiceNow Background Script to safely update the price (`cost`) of Hardware Assets (`alm_hardware`) by their Display Name.

---

## 📋 Description

This script searches for **all** Hardware Assets matching a specified Display Name and updates their price. It includes a built-in **Dry Run mode** which is active by default — allowing you to safely preview all changes before anything is actually saved.

---

## ✅ Prerequisites

- ServiceNow instance with access to **Background Scripts**
  - Navigation: `System Definition` → `Background Scripts`
- Permission to execute Background Scripts (Role: `admin`)
- Write access to the `alm_hardware` table

---

## ⚙️ Configuration

At the top of the script you will find the configuration section — **only this section should be modified**:

```javascript
var DRY_RUN = true; // true = preview only, false = changes will be saved

var ASSET_DISPLAY_NAME = 'Enter Display Name here'; // e.g. 'Dell Latitude 5520'
var NEUER_PREIS        = 0.00;                       // e.g. 1299.99
```

| Variable | Description |
|---|---|
| `DRY_RUN` | `true` = Preview mode (no changes saved), `false` = Changes will be written to the database |
| `ASSET_DISPLAY_NAME` | Exact Display Name of the Hardware Asset (case-sensitive) |
| `NEUER_PREIS` | The new price as a decimal number (e.g. `1299.99`) |

---

## 🚀 Usage

### Step 1 – Dry Run (Preview)

1. Enter `ASSET_DISPLAY_NAME` and `NEUER_PREIS`
2. Keep `DRY_RUN = true`
3. Run the script and review the output

### Step 2 – Live Execution

1. Confirm the output from the Dry Run
2. Set `DRY_RUN = false`
3. Run the script again

---

## 📤 Example Output

### Dry Run
```
======================================================
  Hardware Asset Price Fix Script
  Mode: DRY RUN - No changes will be saved
======================================================

Searching all assets with Display Name: "Dell Latitude 5520"

--------------------------------------------------
  Asset #1
  Asset Tag    : HW-001234
  Sys ID       : abc123def456...
  Current Price: 850.00 EUR
  New Price    : 1299.99 EUR
  DRY RUN: Would change price from 850.00 EUR to 1299.99 EUR.
--------------------------------------------------
  Asset #2
  Asset Tag    : HW-005678
  Sys ID       : xyz789...
  Current Price: 1299.99 EUR
  New Price    : 1299.99 EUR
  INFO: Price already identical - no change necessary.

======================================================
  Summary
======================================================
  Found          : 2 Asset(s)
  Already correct: 1 Asset(s)
  Would be changed: 1 Asset(s)  <- DRY RUN, not yet saved

  >> Set DRY_RUN = false to actually save all changes.
======================================================
  Script finished.
======================================================
```

### Live Execution
```
  OK: Price changed: 850.00 EUR -> 1299.99 EUR
```

---

## 🛡️ Safety Features

- **Dry Run active by default** – prevents accidental changes
- **Input validation** – script aborts if Display Name or price are not properly configured
- **Identical price detection** – assets that already have the correct price are skipped
- **All matches are processed** – no asset is silently skipped

---

## 📁 Files

| File | Description |
|---|---|
| `snow_asset_price_fix.js` | The Background Script |
| `README.md` | This documentation |

---

## ⚠️ Notes

- The Display Name must match **exactly** (case-sensitive)
- The script updates the `cost` field in the `alm_hardware` table
- Background Scripts run in system context — changes take effect immediately when `DRY_RUN = false`
- It is strongly recommended to always perform a Dry Run before live execution
