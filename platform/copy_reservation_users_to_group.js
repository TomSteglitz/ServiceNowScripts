/*
 * Skript:   copy_reservation_users_to_group.js
 * Zweck:    Liest alle eindeutigen User aus der Tabelle sn_wsd_rsv_reservation
 *           (Feld: reserved_for) und fuegt sie einer ServiceNow-Gruppe hinzu.
 *           - User, die bereits in der Zielgruppe sind, werden nicht doppelt angelegt
 *           - User ohne gueltigen Account werden uebersprungen
 *           - Reservierungen koennen optional nach Datum gefiltert werden
 *
 * Ausfuehrung: System Definition > Scripts - Background
 *
 * Konfiguration:
 *   targetGroupName  - Name der Gruppe, in die die User aufgenommen werden sollen
 *   reservedForField - Feldname in sn_wsd_rsv_reservation fuer den User (Standard: reserved_for)
 *   filterFromDate   - Optional: nur Reservierungen ab diesem Datum (Format: YYYY-MM-DD), "" = alle
 *   dryRun           - true  = nur anzeigen, was passieren wuerde (keine Aenderungen)
 *                      false = User werden tatsaechlich zur Gruppe hinzugefuegt
 */

var targetGroupName  = "WSD:Workplace Reservations GWG";
var reservedForField = "requested_for"; // Feld mit dem User-Referenz in sn_wsd_rsv_reservation
var filterFromDate   = "";             // z.B. "2025-01-01", oder "" fuer alle Reservierungen
var dryRun           = true;           // Auf false setzen um tatsaechlich hinzuzufuegen

// -------------------------------------------------------------------------

gs.print("=== copy_reservation_users_to_group ===");
gs.print("Modus       : " + (dryRun ? "DRY RUN (keine Aenderungen)" : "LIVE (User werden hinzugefuegt)"));
gs.print("Zielgruppe  : " + targetGroupName);
gs.print("Quellfeld   : sn_wsd_rsv_reservation." + reservedForField);
gs.print("Datumsfilter: " + (filterFromDate ? ">= " + filterFromDate : "keiner (alle Reservierungen)"));
gs.print("-------------------------------------------");

// Zielgruppe suchen
var grTarget = new GlideRecord("sys_user_group");
grTarget.addQuery("name", targetGroupName);
grTarget.query();

if (!grTarget.next()) {
    gs.print("FEHLER: Zielgruppe '" + targetGroupName + "' wurde nicht gefunden.");
    gs.print("Skript beendet.");
} else {
    var targetId = grTarget.sys_id.toString();
    gs.print("Zielgruppe gefunden: " + grTarget.name + " (sys_id: " + targetId + ")");
    gs.print("-------------------------------------------");

    // Alle Reservierungen laden
    var grRes = new GlideRecord("sn_wsd_rsv_reservation");
    if (filterFromDate) {
        grRes.addQuery("start_date_time", ">=", filterFromDate);
    }
    grRes.query();

    // Bereits verarbeitete User-IDs merken, um Duplikate zu vermeiden
    var processedUsers = {};
    var countAdded     = 0;
    var countSkipped   = 0;
    var countNullUser  = 0;

    while (grRes.next()) {
        var userId = grRes.getValue(reservedForField);

        // Leere oder ungueltige User-Referenz ueberspringen
        if (!userId) {
            countNullUser++;
            continue;
        }

        // Jeden User nur einmal pruefen/hinzufuegen
        if (processedUsers[userId]) {
            continue;
        }
        processedUsers[userId] = true;

        var userName = grRes[reservedForField].getDisplayValue();

        // Pruefen ob User bereits in der Zielgruppe ist
        var grExisting = new GlideRecord("sys_user_grmember");
        grExisting.addQuery("group", targetId);
        grExisting.addQuery("user",  userId);
        grExisting.query();

        if (grExisting.next()) {
            gs.print("[SKIP] " + userName + " (" + userId + ") ist bereits in der Gruppe.");
            countSkipped++;
        } else {
            if (dryRun) {
                gs.print("[DRY RUN] Wuerde hinzufuegen: " + userName + " (" + userId + ")");
            } else {
                var grNew = new GlideRecord("sys_user_grmember");
                grNew.initialize();
                grNew.group = targetId;
                grNew.user  = userId;
                grNew.insert();
                gs.print("Hinzugefuegt: " + userName + " (" + userId + ")");
            }
            countAdded++;
        }
    }

    gs.print("-------------------------------------------");

    if (dryRun) {
        gs.print("DRY RUN abgeschlossen.");
        gs.print("  Wuerden hinzugefuegt : " + countAdded);
        gs.print("  Bereits in Gruppe    : " + countSkipped);
        gs.print("  Kein User-Feld       : " + countNullUser);
        gs.print("Zum tatsaechlichen Hinzufuegen: dryRun = false setzen.");
    } else {
        gs.print("Fertig.");
        gs.print("  Hinzugefuegt         : " + countAdded);
        gs.print("  Bereits in Gruppe    : " + countSkipped);
        gs.print("  Kein User-Feld       : " + countNullUser);
    }
}
