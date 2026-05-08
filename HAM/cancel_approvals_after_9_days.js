(function() {
    /**
     * ============================================================
     * SV CANCEL APPROVALS AFTER 9 DAYS
     * ============================================================
     * Beschreibung: Findet Genehmigungsanfragen, die seit 9 
     *               Werktagen im Status "requested" sind und 
     *               lehnt diese automatisch ab.
     * 
     * Konfiguration:
     *   - days: Anzahl der Werktage (Standard: 9)
     *   - dryRun: Bei true werden keine Änderungen durchgeführt
     * 
     * Hinweis: In ServiceNow als Script Include oder 
     *          Background Script ausführen.
     * ============================================================
     */

    // === KONFIGURATION ===
    var config = {
        days: 9,           // Werktage bis zur Stornierung
        dryRun: true      // true = nur Simulation, false = tatsächlich stornieren
    };

    /**
     * Berechnet ein Datum, das n Werktage (Mo-Fr) zurückliegt.
     * Samstage (6) und Sonntage (7) werden übersprungen.
     * 
     * @param {number} n - Anzahl der Werktage
     * @returns {GlideDateTime} - Datum vor n Werktagen
     */
    function businessDaysAgo(n) {
        var date = new GlideDateTime();
        date.addDaysLocalTime(-1); 
        var count = 0;
        while (count < n) {
            var day = date.getDayOfWeek(); 
            if (day != 6 && day != 7) {   
                count++;
                if (count == n) break;
            }
            date.addDaysLocalTime(-1);
        }
        return date; 
    }

    // Ziel-Datum: 9 Werktage zurück (Stichtag)
    var target = businessDaysAgo(config.days);

    // Stichtag: Mitternacht des Ziel-Datums
    var cutoffDate = new GlideDateTime(target);
    cutoffDate.setDisplayValue(cutoffDate.getLocalDate() + " 00:00:00");

    // Query ausführen: Alle Genehmigungen älter als 9 Werktage
    var gr = new GlideRecord('sysapproval_approver');
    gr.addQuery('state', 'requested');
    gr.addQuery('source_tableSTARTSWITHsc_req');
    gr.addQuery('sys_created_on', '<', cutoffDate);
    gr.query();

    // === LOGGING ===
    var logMsg = "=== [SV Cancel Approvals after " + config.days + " days] ===";
    logMsg += "\nModus: " + (config.dryRun ? "DRY-RUN (keine Änderungen)" : "LIVE");
    logMsg += "\nStichtag (älter als): " + cutoffDate;
    logMsg += "\nAktuelles Datum: " + new GlideDateTime();
    
    var count = 0;
    var details = "";
    
    while (gr.next()) {
        count++;
        var sysId = gr.getValue('sys_id');
        var approver = gr.getDisplayValue('approver');
        var documentId = gr.getDisplayValue('document_id');
        var request = gr.getDisplayValue('request');
        var createdOn = gr.getDisplayValue('sys_created_on');
        
        details += "\n  #" + count + " | SysID: " + sysId;
        details += "\n      Created: " + createdOn + " | Approver: " + approver;
        details += "\n      Document: " + documentId + " | Request: " + request;
        
        if (config.dryRun) {
            // Dry-Run: Nur loggen, keine Änderungen
            details += "\n      -> WÜRDE abgelehnt (dry-run)";
        } else {
            // Live-Modus: Tatsächlich ablehnen
            details += "\n      -> WIRD abgelehnt";
            gr.setValue('state', 'rejected');
            gr.update();
            gs.eventQueue('approval.rejected', gr, gr.sys_id, gs.getUserID());
        }
    }
    
    if (count === 0) {
        logMsg += "\nKeine Genehmigungsanfragen im Zeitraum gefunden.";
    } else {
        logMsg += "\nAnzahl gefunden: " + count;
        logMsg += details;
    }
    
    gs.info(logMsg);

})();