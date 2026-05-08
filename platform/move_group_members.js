/*
 * Skript:   move_group_members.js
 * Zweck:    Verschiebt alle Mitglieder aus einer Quellgruppe in eine Zielgruppe.
 *           - User werden zur Zielgruppe hinzugefuegt (sys_user_grmember)
 *           - User werden aus der Quellgruppe entfernt
 *           - User, die bereits in der Zielgruppe sind, werden nicht doppelt angelegt
 *           - Gruppen selbst und User-Accounts bleiben unveraendert
 *
 * Ausfuehrung: System Definition > Scripts - Background
 *
 * Konfiguration:
 *   sourceGroupName - Name der Gruppe, aus der die Mitglieder verschoben werden
 *   targetGroupName - Name der Gruppe, in die die Mitglieder verschoben werden
 *   dryRun          - true  = nur anzeigen, was passieren wuerde (keine Aenderungen)
 *                     false = Mitglieder werden tatsaechlich verschoben
 */

var sourceGroupName = "WSD:Workplace Reservations GWG - Manual";
var targetGroupName = "WSD:Workplace Reservations GWG";
var dryRun          = true; // Auf false setzen um tatsaechlich zu verschieben

// -------------------------------------------------------------------------

gs.print("=== move_group_members ===");
gs.print("Modus  : " + (dryRun ? "DRY RUN (keine Aenderungen)" : "LIVE (Mitglieder werden verschoben)"));
gs.print("Quelle : " + sourceGroupName);
gs.print("Ziel   : " + targetGroupName);
gs.print("----------------------------");

// Quellgruppe suchen
var grSource = new GlideRecord("sys_user_group");
grSource.addQuery("name", sourceGroupName);
grSource.query();

if (!grSource.next()) {
    gs.print("FEHLER: Quellgruppe '" + sourceGroupName + "' wurde nicht gefunden.");
    gs.print("Skript beendet.");
} else {
    var sourceId = grSource.sys_id.toString();
    gs.print("Quellgruppe gefunden: " + grSource.name + " (sys_id: " + sourceId + ")");

    // Zielgruppe suchen
    var grTarget = new GlideRecord("sys_user_group");
    grTarget.addQuery("name", targetGroupName);
    grTarget.query();

    if (!grTarget.next()) {
        gs.print("FEHLER: Zielgruppe '" + targetGroupName + "' wurde nicht gefunden.");
        gs.print("Skript beendet.");
    } else {
        var targetId = grTarget.sys_id.toString();
        gs.print("Zielgruppe gefunden : " + grTarget.name + " (sys_id: " + targetId + ")");
        gs.print("----------------------------");

        // Alle Mitglieder der Quellgruppe laden
        var grMember = new GlideRecord("sys_user_grmember");
        grMember.addQuery("group", sourceId);
        grMember.query();

        var countMoved   = 0;
        var countSkipped = 0;

        while (grMember.next()) {
            var userId   = grMember.user.toString();
            var userName = grMember.user.getDisplayValue();

            // Pruefen ob User bereits in der Zielgruppe ist
            var grExisting = new GlideRecord("sys_user_grmember");
            grExisting.addQuery("group", targetId);
            grExisting.addQuery("user",  userId);
            grExisting.query();

            if (grExisting.next()) {
                gs.print("[SKIP] " + userName + " (" + userId + ") ist bereits in der Zielgruppe.");
                countSkipped++;
            } else {
                if (dryRun) {
                    gs.print("[DRY RUN] Wuerde verschieben: " + userName + " (" + userId + ")");
                } else {
                    // User zur Zielgruppe hinzufuegen
                    var grNew = new GlideRecord("sys_user_grmember");
                    grNew.initialize();
                    grNew.group = targetId;
                    grNew.user  = userId;
                    grNew.insert();

                    // User aus Quellgruppe entfernen
                    grMember.deleteRecord();

                    gs.print("Verschoben: " + userName + " (" + userId + ")");
                }
                countMoved++;
            }
        }

        gs.print("----------------------------");

        if (dryRun) {
            gs.print("DRY RUN abgeschlossen.");
            gs.print("  Wuerden verschoben : " + countMoved);
            gs.print("  Bereits in Ziel    : " + countSkipped);
            gs.print("Zum tatsaechlichen Verschieben: dryRun = false setzen.");
        } else {
            gs.print("Fertig.");
            gs.print("  Verschoben         : " + countMoved);
            gs.print("  Bereits in Ziel    : " + countSkipped);
        }
    }
}
