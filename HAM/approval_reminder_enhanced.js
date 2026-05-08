(function() {
    /**
     * ============================================================
     * SV REFRA APPROVAL REMINDER AFTER 3 DAYS
     * ============================================================
     * Beschreibung: Findet alle offenen Genehmigungsanfragen,
     *               berechnet deren Erinnerungsdatum und listet
     *               diese im Log auf. Für fällige Erinnerungen
     *               wird das Event 'approval.inserted' ausgelöst.
     * 
     * Konfiguration:
     *   - days: Werktage bis zur Erinnerung (Standard: 3)
     * 
     * Hinweis: In ServiceNow als Script Include oder 
     *          Background Script ausführen.
     * ============================================================
     */

    // === KONFIGURATION ===
    var config = {
        days: 3            // Werktage bis zur Erinnerung
    };

    /**
     * Berechnet ein Datum, das n Werktage (Mo-Fr) ab einem gegebenen Datum vorwärts liegt.
     * 
     * @param {GlideDateTime} startDate - Startdatum
     * @param {number} n - Anzahl der Werktage
     * @returns {GlideDateTime} - Datum nach n Werktagen
     */
    function businessDaysFromDate(startDate, n) {
        var date = new GlideDateTime(startDate);
        var count = 0;
        while (count < n) {
            var day = date.getDayOfWeek(); 
            if (day != 6 && day != 7) {   
                count++;
                if (count == n) break;
            }
            date.addDaysLocalTime(1);
        }
        return date; 
    }

    // Aktuelles Datum
    var now = new GlideDateTime();
    var today = now.getLocalDate();

    // Alle offenen Genehmigungen abfragen
    var gr = new GlideRecord('sysapproval_approver');
    gr.addQuery('state', 'requested');                    // Nur offene Genehmigungen
    gr.addQuery('source_tableSTARTSWITHsc_req');          // Nur Service Catalog Requests
    gr.query();

    // Log-Ausgabe
    var logMsg = "=== [SV Refra Approval Reminder after " + config.days + " days] ===";
    logMsg += "\nAktuelles Datum: " + now;
    
    var count = 0;
    var pendingCount = 0;
    var dueCount = 0;
    var details = "";
    var pendingList = "";
    var dueList = "";
    
    while (gr.next()) {
        var sysId = gr.getValue('sys_id');
        var approver = gr.getDisplayValue('approver');
        var documentId = gr.getDisplayValue('document_id');
        var request = gr.getDisplayValue('request');
        var createdOn = gr.getDisplayValue('sys_created_on');
        
        // Berechnen wann die Erinnerung fällig wäre (3 Werktage nach Erstellung)
        var createdDate = new GlideDateTime(createdOn);
        var reminderDate = businessDaysFromDate(createdDate, config.days);
        var reminderDateStr = reminderDate.getLocalDate();
        
        count++;
        
        // Prüfen ob Erinnerung heute fällig ist
        if (reminderDateStr == today) {
            dueCount++;
            dueList += "\n  #" + dueCount + " | SysID: " + sysId;
            dueList += "\n      Created: " + createdOn + " | Reminder: " + reminderDateStr + " (HEUTE fällig)";
            dueList += "\n      Approver: " + approver + " | Document: " + documentId + " | Request: " + request;
            
            // Event auslösen für Erinnerung
            gs.eventQueue('approval.inserted', gr, gr.sys_id, gs.getUserID());
        } else {
            pendingCount++;
            pendingList += "\n  #" + pendingCount + " | SysID: " + sysId;
            pendingList += "\n      Created: " + createdOn + " | Reminder: " + reminderDateStr;
            pendingList += "\n      Approver: " + approver + " | Document: " + documentId + " | Request: " + request;
        }
    }
    
    if (count === 0) {
        logMsg += "\nKeine offenen Genehmigungsanfragen gefunden.";
    } else {
        logMsg += "\n=== ZUSAMMENFASSUNG ===";
        logMsg += "\nGesamtanzahl offene Requests: " + count;
        logMsg += "\nDavon heute fällig: " + dueCount;
        logMsg += "\nNoch ausstehend: " + pendingCount;
        
        if (dueCount > 0) {
            logMsg += "\n\n=== HEUTE FÄLLIG (Event wird getriggert) ===" + dueList;
        }
        
        if (pendingCount > 0) {
            logMsg += "\n\n=== AUSSTEHENDE ERINNERUNGEN ===" + pendingList;
        }
    }
    
    gs.info(logMsg);

})();