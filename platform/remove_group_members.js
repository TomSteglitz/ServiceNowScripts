/*
 * Skript:   remove_group_members.js
 * Zweck:    Entfernt alle Mitglieder aus einer bestimmten ServiceNow-Gruppe.
 *           Die Mitgliedschaften werden in der Tabelle sys_user_grmember geloescht.
 *           Die Gruppe selbst und die User-Accounts bleiben unveraendert.
 *
 * Ausfuehrung: System Definition > Scripts - Background
 *
 * Konfiguration:
 *   groupName  - Name der Gruppe, aus der alle Mitglieder entfernt werden sollen
 *   dryRun     - true  = nur anzeigen, wer entfernt wuerden (keine Aenderungen)
 *                false = Mitglieder werden tatsaechlich entfernt
 */

var groupName = "WSD:Workplace Reservations GWG";
var dryRun    = true; // Auf false setzen um tatsaechlich zu loeschen

// -------------------------------------------------------------------------

gs.print("=== remove_group_members ===");
gs.print("Modus : " + (dryRun ? "DRY RUN (keine Aenderungen)" : "LIVE (Mitglieder werden entfernt)"));
gs.print("Gruppe: " + groupName);
gs.print("----------------------------");

// Gruppe anhand des Namens in sys_user_group suchen
var grGroup = new GlideRecord("sys_user_group");
grGroup.addQuery("name", groupName);
grGroup.query();

if (!grGroup.next()) {
    gs.print("FEHLER: Gruppe '" + groupName + "' wurde nicht gefunden.");
} else {
    var groupSysId = grGroup.sys_id.toString();
    gs.print("Gruppe gefunden: " + grGroup.name + " (sys_id: " + groupSysId + ")");

    // Alle Mitgliedschafts-Eintraege der Gruppe aus sys_user_grmember laden
    var grMember = new GlideRecord("sys_user_grmember");
    grMember.addQuery("group", groupSysId);
    grMember.query();

    var count = 0;

    while (grMember.next()) {
        var userName = grMember.user.getDisplayValue();
        var userId   = grMember.user.toString();

        if (dryRun) {
            // Im Dry-Run-Modus wird nur geloggt, nichts geloescht
            gs.print("[DRY RUN] Wuerde entfernen: " + userName + " (" + userId + ")");
        } else {
            // Mitgliedschafts-Eintrag aus sys_user_grmember loeschen
            grMember.deleteRecord();
            gs.print("Entfernt: " + userName + " (" + userId + ")");
        }

        count++;
    }

    gs.print("----------------------------");

    if (dryRun) {
        gs.print("DRY RUN abgeschlossen. " + count + " Mitglied(er) wuerden entfernt.");
        gs.print("Zum tatsaechlichen Entfernen: dryRun = false setzen.");
    } else {
        gs.print("Fertig. " + count + " Mitglied(er) aus '" + groupName + "' entfernt.");
    }
}
