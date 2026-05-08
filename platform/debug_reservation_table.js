/*
 * Skript:   debug_reservation_table.js
 * Zweck:    Zeigt Gesamtanzahl der Datensaetze und die ersten 3 Eintraege
 *           aus sn_wsd_rsv_reservation mit allen Feldwerten.
 *           Hilft den korrekten User-Feldnamen zu finden.
 *
 * Ausfuehrung: System Definition > Scripts - Background
 */

gs.print("=== debug_reservation_table ===");

// 1) Gesamtanzahl
var grCount = new GlideRecord("sn_wsd_rsv_reservation");
grCount.query();
gs.print("Gesamtanzahl Datensaetze: " + grCount.getRowCount());
gs.print("-------------------------------------------");

// 2) Ersten 3 Datensaetze mit allen Feldern ausgeben
var grRes = new GlideRecord("sn_wsd_rsv_reservation");
grRes.setLimit(3);
grRes.query();

var recordNum = 0;
while (grRes.next()) {
    recordNum++;
    gs.print("--- Datensatz #" + recordNum + " (sys_id: " + grRes.sys_id + ") ---");

    var fields = grRes.getFields();
    for (var i = 0; i < fields.size(); i++) {
        var field = fields.get(i);
        var name  = field.getName();
        var val   = grRes.getValue(name);
        var disp  = grRes[name].getDisplayValue();

        // Nur befuellte Felder ausgeben
        if (val) {
            gs.print("  " + name + ": " + val + (disp && disp !== val ? " (" + disp + ")" : ""));
        }
    }
}

if (recordNum === 0) {
    gs.print("HINWEIS: Keine Datensaetze gefunden – Tabellenname oder Zugriffsrechte pruefen.");
}

gs.print("-------------------------------------------");
gs.print("Fertig.");
