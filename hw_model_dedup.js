/**
 * ============================================================
 * FIX SCRIPT: Hardware Model Duplicate Cleanup
 *             (newer duplicate is automatically deleted)
 * ============================================================
 * Duplicate criteria: same name (case-insensitive) +
 *                     same manufacturer
 * Master logic:       The OLDER model is kept,
 *                     the NEWER one is deleted.
 *
 * NOTE: Run this script in scope "global" as a Fix Script.
 *       Always keep DRY_RUN = true on the first run and
 *       review the log output. Only then set it to false.
 * ============================================================
 */

// ─── Configuration ───────────────────────────────────────────

var DRY_RUN = true; // true = log only | false = actually execute

// Tables in which assets are reassigned to the older (master) model
var ASSET_TABLES = [
    { table: 'alm_asset',        field: 'model'    },
    { table: 'cmdb_ci_hardware', field: 'model_id' },
    { table: 'cmdb_ci',          field: 'model_id' }
];

// ─── Helper Functions ─────────────────────────────────────────

function log(msg) {
    gs.log('[HW-MODEL-DEDUP] ' + msg, 'fix_script');
}

/** Counts all linked assets across all configured tables for a given model sys_id */
function countAssets(modelSysId) {
    var total = 0;
    for (var i = 0; i < ASSET_TABLES.length; i++) {
        var cfg = ASSET_TABLES[i];
        var ga  = new GlideAggregate(cfg.table);
        ga.addQuery(cfg.field, modelSysId);
        ga.addAggregate('COUNT');
        ga.query();
        if (ga.next()) {
            total += parseInt(ga.getAggregate('COUNT'), 10) || 0;
        }
    }
    return total;
}

/** Reassigns all assets from sourceId to targetId across all configured tables */
function reassignAssets(sourceId, targetId) {
    var totalMoved = 0;
    for (var i = 0; i < ASSET_TABLES.length; i++) {
        var cfg   = ASSET_TABLES[i];
        var moved = 0;
        var gr    = new GlideRecord(cfg.table);
        gr.addQuery(cfg.field, sourceId);
        gr.query();
        while (gr.next()) {
            if (!DRY_RUN) {
                gr.setValue(cfg.field, targetId);
                gr.update();
            }
            moved++;
        }
        if (moved > 0) {
            log('      ' + (DRY_RUN ? '[DRY-RUN] Would move ' : 'Moved ') +
                moved + ' record(s) in "' + cfg.table + '".');
            totalMoved += moved;
        }
    }
    return totalMoved;
}

/** Deletes the hardware model with the given sys_id */
function deleteModel(sysId, displayName) {
    if (!DRY_RUN) {
        var gr = new GlideRecord('cmdb_hardware_product_model');
        if (gr.get(sysId)) {
            gr.deleteRecord();
            log('      Model deleted: "' + displayName + '" [' + sysId + ']');
        } else {
            log('      ERROR: Model not found: ' + sysId);
        }
    } else {
        log('      [DRY-RUN] Would delete model: "' + displayName + '" [' + sysId + ']');
    }
}

// ─── Main Logic ──────────────────────────────────────────────

log('=== Start ' + (DRY_RUN ? '(DRY-RUN)' : '(LIVE)') + ' ===');

// 1) Load all hardware models and group them by name + manufacturer
var modelMap = {};

var grModels = new GlideRecord('cmdb_hardware_product_model');
grModels.orderBy('name');
grModels.query();

while (grModels.next()) {
    var name         = (grModels.getValue('name')         || '').trim().toLowerCase();
    var manufacturer = (grModels.getValue('manufacturer') || '').trim().toLowerCase();
    var key          = name + '|||' + manufacturer;

    if (!modelMap[key]) {
        modelMap[key] = [];
    }
    modelMap[key].push({
        sys_id:         grModels.getValue('sys_id'),
        display_name:   grModels.getValue('name'),
        manufacturer:   grModels.getDisplayValue('manufacturer'),
        sys_created_on: grModels.getValue('sys_created_on')
    });
}

// 2) Process duplicate groups
var totalGroups  = 0;
var totalMoved   = 0;
var totalDeleted = 0;

for (var key in modelMap) {
    var group = modelMap[key];
    if (group.length < 2) continue; // No duplicates in this group

    totalGroups++;

    // Sort ascending by creation date → index 0 = master (oldest, kept)
    group.sort(function(a, b) {
        return a.sys_created_on < b.sys_created_on ? -1 : 1;
    });

    var master     = group[0];
    var duplicates = group.slice(1); // all newer entries → will be deleted

    log('--- Group: "' + master.display_name +
        '" | Manufacturer: ' + (master.manufacturer || '(none)'));
    log('    [MASTER - keep]   ' + master.sys_id +
        ' | created: ' + master.sys_created_on);

    for (var d = 0; d < duplicates.length; d++) {
        var dup        = duplicates[d];
        var assetCount = countAssets(dup.sys_id);

        log('    [DELETE - newer]  ' + dup.sys_id +
            ' | created: ' + dup.sys_created_on +
            ' | assets: ' + assetCount);

        if (assetCount > 0) {
            log('      → Reassigning assets to master...');
            var moved = reassignAssets(dup.sys_id, master.sys_id);
            totalMoved += moved;
        } else {
            log('      → No assets linked, deleting directly.');
        }

        deleteModel(dup.sys_id, dup.display_name);
        totalDeleted++;
    }
}

// 3) Summary
log('=== Summary ' + (DRY_RUN ? '(DRY-RUN)' : '(LIVE)') + ' ===');
log('Duplicate groups found : ' + totalGroups);
log('Assets reassigned      : ' + totalMoved);
log('Models deleted         : ' + (DRY_RUN ? '0 (DRY-RUN)' : totalDeleted));
log('=== End ===');
