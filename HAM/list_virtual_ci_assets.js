/**
 * ============================================================
 * BACKGROUND SCRIPT: Liste aller Hardware-Assets mit virtuellem CI
 * ============================================================
 * Beschreibung: Sucht in alm_hardware alle Assets, deren
 *               verknüpfter CI (cmdb_ci_computer) "virtual = true"
 *               hat, und gibt eine strukturierte Liste aus.
 *
 * Hinweis: Als Background Script im Global Scope ausführen.
 * ============================================================
 */

function log(msg) {
    gs.log('[LIST_VIRTUAL_CI_ASSETS] ' + msg, 'background_script');
}

log('=== Start ===');

// Schritt 1: Alle virtuellen CIs aus cmdb_ci_computer holen
// (Dot-Walk ci.virtual auf alm_hardware funktioniert nicht, da ci auf cmdb_ci
//  verweist, nicht direkt auf cmdb_ci_computer)
var ciIds = [];
var ciGr = new GlideRecord('cmdb_ci_computer');
ciGr.addQuery('virtual', true);
ciGr.query();
while (ciGr.next()) {
    ciIds.push(ciGr.getUniqueValue());
}
log('Virtuelle CIs gefunden: ' + ciIds.length);

if (ciIds.length === 0) {
    log('Keine virtuellen CIs gefunden. Abbruch.');
    log('=== Ende ===');
    gs.log('[LIST_VIRTUAL_CI_ASSETS] === Ende ===', 'background_script');
}

// Schritt 2: Assets zu diesen CIs suchen
var assetGr = new GlideRecord('alm_hardware');
assetGr.addQuery('ci', 'IN', ciIds.join(','));
assetGr.orderBy('ci');
assetGr.query();

var count = 0;
log('─────────────────────────────────────────────────────────────────────────');
log('Nr.  | Asset-Name           | Modell                   | CI-Name                  | CI Sys-ID');
log('─────────────────────────────────────────────────────────────────────────');

while (assetGr.next()) {
    count++;
    var assetTag  = assetGr.getDisplayValue()            || '(kein Name)';
    var model     = assetGr.getDisplayValue('model_id')  || '(kein Modell)';
    var ciName    = assetGr.getDisplayValue('ci')        || '(kein CI-Name)';
    var ciSysId   = assetGr.getValue('ci')               || '(kein CI)';
    var assetSysId = assetGr.getUniqueValue();

    log(
        pad(count, 4) + ' | ' +
        pad(assetTag, 20) + ' | ' +
        pad(model, 24)    + ' | ' +
        pad(ciName, 24)   + ' | ' +
        ciSysId           + ' | Asset: ' + assetSysId
    );
}

log('─────────────────────────────────────────────────────────────────────────');
log('Gesamt gefundene Assets: ' + count);
log('=== Ende ===');

function pad(val, len) {
    val = String(val);
    if (val.length >= len) {
        return val.substring(0, len);
    }
    while (val.length < len) {
        val += ' ';
    }
    return val;
}
