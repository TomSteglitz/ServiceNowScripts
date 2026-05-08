/**
 * ============================================================
 * FIX SCRIPT: Set Sourced to true on RITM
 * ============================================================
 * Description: Sets the 'sourced' field to true for a given
 *              Request Item (RITM) in the sc_req_item table.
 *
 * NOTE: Run this script in scope "global" as a Fix Script.
 *       Always keep DRY_RUN = true on the first run and
 *       review the log output. Only then set it to false.
 * ============================================================
 */

// ═══════════════════════════════════════════════════════════
// HIER DIE SYSID EINGEBEN
// ═══════════════════════════════════════════════════════════
var SYS_ID = 'replace_with_sys_id';

// true = nur loggen | false = tatsächlich ausführen
var DRY_RUN = true;
// ═══════════════════════════════════════════════════════════

function log(msg) {
    gs.log('[RITM_SOURCED_FIX] ' + msg, 'fix_script');
}

var gr = new GlideRecord('sc_req_item');
gr.get(SYS_ID);

if (!gr.isValid()) {
    log('ERROR: Record not found for sys_id: ' + SYS_ID);
} else {
    var oldValue = gr.getValue('sourced');
    var number = gr.getValue('number') || SYS_ID;

    if (DRY_RUN) {
        var oldBool = oldValue == 'true' || oldValue == '1';
        log('[DRY_RUN] Would set sourced from ' + oldBool + ' to true for: ' + number);
    } else {
        gr.setValue('sourced', true);
        gr.update();
        log('Set sourced to true for: ' + number);
    }
}