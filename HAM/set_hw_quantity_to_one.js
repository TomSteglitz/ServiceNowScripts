/**
 * ============================================================
 * FIX SCRIPT: Set Quantity to 1 on Hardware Assets
 * ============================================================
 * Beschreibung: Setzt das Feld 'quantity' auf 1 für alle
 *               Hardware Assets (alm_hardware), bei denen der
 *               Wert aktuell ungleich 1 ist.
 *
 * Hinweis: Als Background Script im Global Scope ausführen.
 *          Immer zuerst mit DRY_RUN = true testen!
 * ============================================================
 */

// ═══════════════════════════════════════════════════════════
// KONFIGURATION
// ═══════════════════════════════════════════════════════════

// Optional: Einzelne Asset-Nummer oder sys_id eingeben.
// Leer lassen ('') um ALLE betroffenen Assets zu verarbeiten.
var ASSET_ID = '';

// true = nur loggen | false = tatsächlich ausführen
var DRY_RUN = true;

// ═══════════════════════════════════════════════════════════

function log(msg) {
    gs.log('[HW_QUANTITY_FIX] ' + msg, 'background_script');
}

var gr = new GlideRecord('alm_hardware');

if (ASSET_ID !== '') {
    // Einzelner Datensatz per sys_id oder asset_tag / display_name
    if (!gr.get(ASSET_ID)) {
        gr = new GlideRecord('alm_hardware');
        gr.addQuery('asset_tag', ASSET_ID);
        gr.setLimit(1);
        gr.query();
        if (!gr.next()) {
            log('ERROR: Kein Asset gefunden für: ' + ASSET_ID);
            gr = null;
        }
    }
} else {
    // Alle Hardware Assets mit quantity != 1
    gr.addQuery('quantity', '!=', 1);
    gr.query();
}

if (gr) {
    var count = 0;
    var fixed = 0;
    var errors = 0;

    // Einzeldatensatz (gr.get) hat kein next() – Schleife vereinheitlichen
    var records = [];
    if (typeof gr.next === 'function' && ASSET_ID === '') {
        while (gr.next()) {
            records.push(gr.getUniqueValue());
        }
    } else {
        records.push(gr.getUniqueValue());
    }

    for (var i = 0; i < records.length; i++) {
        count++;
        var rec = new GlideRecord('alm_hardware');
        rec.get(records[i]);

        var assetTag = rec.getValue('asset_tag') || records[i];
        var oldQty   = rec.getValue('quantity');

        if (DRY_RUN) {
            log('[DRY-RUN] Würde quantity von ' + oldQty + ' auf 1 setzen: ' + assetTag);
        } else {
            rec.setValue('quantity', 1);
            var result = rec.update();
            if (result) {
                fixed++;
                log('Gesetzt: ' + assetTag + ' (vorher: ' + oldQty + ')');
            } else {
                errors++;
                log('ERROR: Update fehlgeschlagen für: ' + assetTag);
            }
        }
    }

    log('=== Zusammenfassung ===');
    log('Modus:     ' + (DRY_RUN ? 'DRY-RUN' : 'LIVE'));
    log('Gefunden:  ' + count);
    if (!DRY_RUN) {
        log('Geändert:  ' + fixed);
        log('Fehler:    ' + errors);
    }
}
