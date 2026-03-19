/**
 * ============================================================
 * FIX SCRIPT: Hardware Model Duplicate Cleanup (Manual)
 * ============================================================
 * Table:   cmdb_hardware_product_model
 * Purpose: Delete defined models (by sys_id) and reassign
 *          their linked assets to a target model beforehand.
 *
 * NOTE: Run this script in scope "global" as a Fix Script.
 *       Always keep DRY_RUN = true on the first run and
 *       review the log output. Only then set it to false.
 * ============================================================
 */

// ─── Configuration ───────────────────────────────────────────

var DRY_RUN = true; // true = log only | false = actually execute

/**
 * Define the duplicates to be deleted here.
 * For each entry:
 *   delete_model_id : sys_id of the model to be deleted
 *   target_model_id : sys_id of the model that assets will be reassigned to
 */
var DUPLICATES_TO_DELETE = [
    {
        delete_model_id: 'S5c291d1beb78a21034bcf80c0bd0cd9f',
        target_model_id: '587acc93ebb4a21034bcf80c0bd0cdcf'
    },

    // Add further entries here...
];

// Tables in which assets are reassigned to the target model
var ASSET_TABLES = [
    { table: 'alm_asset',        field: 'model'    },
    { table: 'cmdb_ci_hardware', field: 'model_id' },
    { table: 'cmdb_ci',          field: 'model_id' }
];

// ─── Helper Functions ─────────────────────────────────────────

function log(msg) {
    gs.log('[HW-MODEL-DEDUP] ' + msg, 'fix_script');
}

/** Returns the display name of a model by its sys_id */
function getModelName(sysId) {
    var gr = new GlideRecord('cmdb_hardware_product_model');
    if (gr.get(sysId)) {
        return gr.getValue('name') + ' (Manufacturer: ' + gr.getDisplayValue('manufacturer') + ')';
    }
    return '??? (not found)';
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
            log('    ' + (DRY_RUN ? '[DRY-RUN] Would move ' : 'Moved ') +
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
            log('    Model deleted: "' + displayName + '"');
        } else {
            log('    ERROR: Model not found for deletion: ' + sysId);
        }
    } else {
        log('    [DRY-RUN] Would delete model: "' + displayName + '"');
    }
}

// ─── Configuration Validation ─────────────────────────────────

function validateConfig() {
    var valid = true;
    for (var i = 0; i < DUPLICATES_TO_DELETE.length; i++) {
        var entry = DUPLICATES_TO_DELETE[i];
        if (!entry.delete_model_id || entry.delete_model_id.indexOf('SYSID') === 0) {
            log('ERROR: Entry ' + i + ' has no valid delete_model_id!');
            valid = false;
        }
        if (!entry.target_model_id || entry.target_model_id.indexOf('SYSID') === 0) {
            log('ERROR: Entry ' + i + ' has no valid target_model_id!');
            valid = false;
        }
        if (entry.delete_model_id === entry.target_model_id) {
            log('ERROR: Entry ' + i + ': delete_model_id and target_model_id are identical!');
            valid = false;
        }
    }
    return valid;
}

// ─── Main Logic ──────────────────────────────────────────────

log('=== Start ' + (DRY_RUN ? '(DRY-RUN)' : '(LIVE)') + ' ===');
log('Entries to process: ' + DUPLICATES_TO_DELETE.length);

if (!validateConfig()) {
    log('Aborted due to configuration errors.');
} else {
    var totalMoved   = 0;
    var totalDeleted = 0;

    for (var i = 0; i < DUPLICATES_TO_DELETE.length; i++) {
        var entry      = DUPLICATES_TO_DELETE[i];
        var deleteName = getModelName(entry.delete_model_id);
        var targetName = getModelName(entry.target_model_id);
        var assetCount = countAssets(entry.delete_model_id);

        log('--- Entry ' + (i + 1) + ' ---');
        log('  To delete    : ' + deleteName + ' [' + entry.delete_model_id + ']');
        log('  Target model : ' + targetName + ' [' + entry.target_model_id + ']');
        log('  Linked assets: ' + assetCount);

        if (assetCount > 0) {
            var moved = reassignAssets(entry.delete_model_id, entry.target_model_id);
            totalMoved += moved;
        } else {
            log('  No assets linked, no reassignment needed.');
        }

        deleteModel(entry.delete_model_id, deleteName);
        totalDeleted++;
    }

    log('=== Summary ' + (DRY_RUN ? '(DRY-RUN)' : '(LIVE)') + ' ===');
    log('Entries processed : ' + DUPLICATES_TO_DELETE.length);
    log('Assets reassigned : ' + totalMoved);
    log('Models deleted    : ' + (DRY_RUN ? '0 (DRY-RUN)' : totalDeleted));
}

log('=== End ===');
