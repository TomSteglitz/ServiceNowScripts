/**
 * ============================================================
 * FIX SCRIPT: Set Quantity to 1 in alm_hardware
 * ============================================================
 * Description: Sets the quantity field to 1 for a given sys_id
 *              in the alm_hardware table.
 *
 * NOTE: Run this script in scope "global" as a Fix Script.
 *       Always keep DRY_RUN = true on the first run and
 *       review the log output. Only then set it to false.
 * ============================================================
 */

// ─── Configuration ───────────────────────────────────────────

// Set the sys_id(s) to process here (comma-separated list)
var SYS_IDS = [
    'replace_with_sys_id_1',
    'replace_with_sys_id_2'
];

var DRY_RUN = true; // true = log only | false = actually execute

// ─── Helper Functions ─────────────────────────────────────────

function log(msg) {
    gs.log('[ALM_HW_QUANTITY_FIX] ' + msg, 'fix_script');
}

// ─── Main Logic ───────────────────────────────────────────────

function processQuantityFix() {
    var processed = 0;
    var failed = 0;

    for (var i = 0; i < SYS_IDS.length; i++) {
        var sysId = SYS_IDS[i];

        if (!sysId || sysId.startsWith('replace_with')) {
            log('Skipping invalid sys_id: ' + sysId);
            continue;
        }

        var gr = new GlideRecord('alm_hardware');
        gr.get(sysId);

        if (!gr.isValid()) {
            log('ERROR: Record not found for sys_id: ' + sysId);
            failed++;
            continue;
        }

        var oldQty = gr.getValue('quantity');
        var displayName = gr.getValue('display_name') || gr.getValue('name') || sysId;

        if (DRY_RUN) {
            log('[DRY_RUN] Would set quantity from ' + oldQty + ' to 1 for: ' + displayName + ' (sys_id: ' + sysId + ')');
            processed++;
        } else {
            gr.setValue('quantity', 1);
            var updated = gr.update();

            if (updated) {
                log('SUCCESS: Set quantity from ' + oldQty + ' to 1 for: ' + displayName + ' (sys_id: ' + sysId + ')');
                processed++;
            } else {
                log('ERROR: Failed to update quantity for: ' + displayName + ' (sys_id: ' + sysId + ')');
                failed++;
            }
        }
    }

    log('Summary: ' + processed + ' processed, ' + failed + ' failed');
}

// ─── Execution ────────────────────────────────────────────────

processQuantityFix();