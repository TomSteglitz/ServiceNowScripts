/**
 * ============================================================
 * BACKGROUND SCRIPT: Delete Asset Only – Virtuelle Computer-CIs
 * ============================================================
 * Beschreibung: Sucht alle alm_hardware-Assets deren verknüpfter
 *               CI (cmdb_ci_computer) "virtual = true" hat und
 *               löscht jeweils nur das Asset – der CI bleibt erhalten.
 *               Entspricht der UI-Funktion "Delete Asset Only".
 *
 * Hinweis: Als Background Script im Global Scope ausführen.
 *          Immer zuerst mit DRY_RUN = true testen!
 * ============================================================
 */

// ═══════════════════════════════════════════════════════════
// KONFIGURATION – hier anpassen
// ═══════════════════════════════════════════════════════════

var CONFIG = {
    // true = nur loggen, keine Änderungen vornehmen
    dryRun: true,

    // Maximale Anzahl zu löschender Assets (Sicherheitslimit, 0 = kein Limit)
    maxDelete: 5
};

// ═══════════════════════════════════════════════════════════

function log(msg) {
    gs.log('[DELETE_VIRTUAL_CI_ASSETS] ' + msg, 'background_script');
}

function pad(val, len) {
    val = String(val);
    if (val.length >= len) { return val.substring(0, len); }
    while (val.length < len) { val += ' '; }
    return val;
}

function deleteAssetOnly(sysId, assetName, ciName, ciSysId) {
    if (CONFIG.dryRun) {
        log('[DRY-RUN] Würde löschen – Asset: "' + assetName + '" [' + sysId + ']  →  CI: "' + ciName + '" [' + ciSysId + ']');
        return true;
    }

    var gr = new GlideRecord('alm_hardware');
    if (!gr.get(sysId)) {
        log('FEHLER: Asset nicht mehr auffindbar [' + sysId + ']');
        return false;
    }

    try {
        var assetCI = new AssetandCI();
        assetCI.deleteAssetOnly(gr);
        log('Gelöscht – Asset: "' + assetName + '" [' + sysId + ']  →  CI: "' + ciName + '" [' + ciSysId + ']');
        return true;
    } catch (e) {
        log('FEHLER: ' + e.message + ' | Asset: [' + sysId + ']  CI: [' + ciSysId + ']');
        return false;
    }
}

// === MAIN ===

log('=== Start ' + (CONFIG.dryRun ? '(DRY-RUN)' : '(LIVE)') + ' ===');
if (CONFIG.maxDelete > 0) {
    log('Limit: max. ' + CONFIG.maxDelete + ' Assets');
}

// Schritt 1: Alle virtuellen CIs aus cmdb_ci_computer holen
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
}

// Schritt 2: Assets zu diesen CIs suchen und als Tabelle ausgeben
var assetGr = new GlideRecord('alm_hardware');
assetGr.addQuery('ci', 'IN', ciIds.join(','));
assetGr.orderBy('ci');
if (CONFIG.maxDelete > 0) {
    assetGr.setLimit(CONFIG.maxDelete);
}
assetGr.query();

var assets = [];
while (assetGr.next()) {
    assets.push({
        sysId:   assetGr.getUniqueValue(),
        name:    assetGr.getDisplayValue()           || '(kein Name)',
        model:   assetGr.getDisplayValue('model_id') || '(kein Modell)',
        ciName:  assetGr.getDisplayValue('ci')       || '(kein CI-Name)',
        ciSysId: assetGr.getValue('ci')              || ''
    });
}

log('Assets gefunden: ' + assets.length + (CONFIG.maxDelete > 0 ? ' (Limit: ' + CONFIG.maxDelete + ')' : ''));
log('─────────────────────────────────────────────────────────────────────────');
log('Nr.  | Asset-Name           | Modell                   | CI-Name                  | CI Sys-ID');
log('─────────────────────────────────────────────────────────────────────────');

for (var i = 0; i < assets.length; i++) {
    var a = assets[i];
    log(
        pad(i + 1, 4)    + ' | ' +
        pad(a.name, 20)  + ' | ' +
        pad(a.model, 24) + ' | ' +
        pad(a.ciName, 24)+ ' | ' +
        a.ciSysId        + ' | Asset: ' + a.sysId
    );
}

log('─────────────────────────────────────────────────────────────────────────');

// Löschen (oder DRY-RUN)
var okCount   = 0;
var failCount = 0;

for (var j = 0; j < assets.length; j++) {
    var ok = deleteAssetOnly(assets[j].sysId, assets[j].name, assets[j].ciName, assets[j].ciSysId);
    if (ok) { okCount++; } else { failCount++; }
}

log('─────────────────────────────────────────────────────────────────────────');
if (CONFIG.maxDelete > 0 && assets.length >= CONFIG.maxDelete) {
    log('Sicherheitslimit erreicht (' + CONFIG.maxDelete + '). Ggf. weitere Assets vorhanden.');
}
log('Assets verarbeitet : ' + assets.length);
log('Erfolgreich        : ' + okCount);
log('Fehlgeschlagen     : ' + failCount);
log('=== Ende ' + (CONFIG.dryRun ? '(DRY-RUN – keine Änderungen vorgenommen)' : '(LIVE)') + ' ===');
