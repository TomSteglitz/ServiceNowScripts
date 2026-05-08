/**
 * ============================================================
 * BACKGROUND SCRIPT: Force Close Task
 * ============================================================
 * Beschreibung: Schließt einen Task, auch wenn Pflichtfelder
 *               nicht befüllt sind. Umgeht Business Rules und
 *               Data Policies durch setWorkflow(false).
 *
 * Anwendungsfall: Task ist blockiert / nicht schließbar über UI,
 *                 weil Pflichtfelder fehlen.
 *
 * Hinweis: Als Background Script im Global Scope ausführen.
 *          Immer zuerst mit DRY_RUN = true testen!
 * ============================================================
 */

// ═══════════════════════════════════════════════════════════
// KONFIGURATION – hier anpassen
// ═══════════════════════════════════════════════════════════

var CONFIG = {
    // Sys-ID oder Nummer des Tasks (z.B. 'INC0012345' oder sys_id)
    taskId: 'HIER_SYS_ID_ODER_NUMMER_EINGEBEN',

    // Tabelle des Tasks
    // Übliche Werte: 'incident', 'change_request', 'problem',
    //                'sc_task', 'sc_req_item', 'task'
    table: 'task',

    // Ziel-Status (numerischer Wert des State-Feldes)
    // Incident:       7 = Closed
    // Change Request: 3 = Closed, -4 = Canceled
    // sc_task:        4 = Closed Complete
    // task (generic): 3 = Closed Complete
    closeState: 3,

    // Pflichtfelder manuell setzen (werden nur befüllt wenn leer)
    // Leer lassen {} wenn keine zusätzlichen Felder nötig.
    mandatoryFieldOverrides: {
        // Beispiele:
        // 'close_code':  'Solved (Permanently)',
        // 'close_notes': 'Force closed via Background Script'
    },

    // true = nur loggen, keine Änderungen
    dryRun: true
};

// ═══════════════════════════════════════════════════════════

function log(msg) {
    gs.log('[FORCE_CLOSE_TASK] ' + msg, 'background_script');
}

function findRecord(table, taskId) {
    var gr = new GlideRecord(table);

    // Versuche zunächst per sys_id
    if (gr.get(taskId)) {
        return gr;
    }

    // Fallback: per number-Feld suchen
    gr = new GlideRecord(table);
    gr.addQuery('number', taskId);
    gr.setLimit(1);
    gr.query();
    if (gr.next()) {
        return gr;
    }

    return null;
}

// === MAIN ===

var gr = findRecord(CONFIG.table, CONFIG.taskId);

if (!gr) {
    log('ERROR: Kein Datensatz gefunden. Tabelle: ' + CONFIG.table + ' | ID: ' + CONFIG.taskId);
} else {
    var number  = gr.getValue('number')     || gr.getValue('sys_id');
    var oldState = gr.getValue('state');

    log('Datensatz gefunden: ' + number);
    log('Aktuelle Tabelle:   ' + CONFIG.table);
    log('Aktueller Status:   ' + oldState);
    log('Ziel-Status:        ' + CONFIG.closeState);
    log('Modus:              ' + (CONFIG.dryRun ? 'DRY-RUN (keine Änderungen)' : 'LIVE'));

    if (CONFIG.dryRun) {
        log('[DRY-RUN] Würde state von ' + oldState + ' auf ' + CONFIG.closeState + ' setzen.');

        for (var field in CONFIG.mandatoryFieldOverrides) {
            var current = gr.getValue(field);
            if (!current || current === '') {
                log('[DRY-RUN] Würde Pflichtfeld "' + field + '" setzen auf: ' + CONFIG.mandatoryFieldOverrides[field]);
            }
        }
    } else {
        // Business Rules und automatische Workflows deaktivieren
        gr.setWorkflow(false);

        // Pflichtfelder befüllen, sofern leer
        for (var f in CONFIG.mandatoryFieldOverrides) {
            var val = gr.getValue(f);
            if (!val || val === '') {
                gr.setValue(f, CONFIG.mandatoryFieldOverrides[f]);
                log('Pflichtfeld gesetzt: ' + f + ' = ' + CONFIG.mandatoryFieldOverrides[f]);
            }
        }

        gr.setValue('state', CONFIG.closeState);

        var result = gr.update();

        if (result) {
            log('Erfolgreich geschlossen. sys_id: ' + result);
        } else {
            log('ERROR: Update fehlgeschlagen für: ' + number);
        }
    }
}
