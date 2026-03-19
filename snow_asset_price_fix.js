// ============================================================
//  ServiceNow Background Script – Hardware Asset Preis-Änderung
//  Tabelle: alm_hardware
//  Alle Assets mit dem angegebenen Display Name werden geändert
// ============================================================

// ============================================================
//  !! KONFIGURATION – Hier anpassen !!
// ============================================================

var DRY_RUN = true; // true = nur Vorschau, false = Änderung wird gespeichert

var ASSET_DISPLAY_NAME = 'Hier Display Name eintragen'; // z.B. 'Dell Latitude 5520'
var NEUER_PREIS        = 0.00;                           // z.B. 1299.99

// ============================================================
//  LOGIK – Bitte nicht verändern
// ============================================================

gs.print('');
gs.print('======================================================');
gs.print('  Hardware Asset Preis-Fix Script');
gs.print('  Modus: ' + (DRY_RUN ? 'DRY RUN - Keine Aenderungen werden gespeichert' : 'LIVE - Aenderungen werden gespeichert'));
gs.print('======================================================');
gs.print('');

// Validierung der Konfiguration
if (!ASSET_DISPLAY_NAME || ASSET_DISPLAY_NAME === 'Hier Display Name eintragen') {
    gs.print('FEHLER: Bitte einen gueltigen Display Name in ASSET_DISPLAY_NAME eintragen.');
    gs.print('Script wird abgebrochen.');
    throw new Error('Kein Asset Display Name konfiguriert.');
}

if (isNaN(NEUER_PREIS) || NEUER_PREIS < 0) {
    gs.print('FEHLER: NEUER_PREIS muss eine positive Zahl sein.');
    gs.print('Script wird abgebrochen.');
    throw new Error('Ungueltiger Preis konfiguriert.');
}

gs.print('Suche alle Assets mit Display Name: "' + ASSET_DISPLAY_NAME + '"');
gs.print('');

// Assets suchen
var gr = new GlideRecord('alm_hardware');
gr.addQuery('display_name', ASSET_DISPLAY_NAME);
gr.query();

var anzahlGefunden  = 0;
var anzahlGeaendert = 0;
var anzahlIdentisch = 0;

while (gr.next()) {
    anzahlGefunden++;

    var sysId          = gr.getValue('sys_id');
    var assetTag       = gr.getValue('asset_tag') || '(kein Asset Tag)';
    var aktuellerPreis = parseFloat(gr.getValue('cost')) || 0.00;

    gs.print('--------------------------------------------------');
    gs.print('  Asset #' + anzahlGefunden);
    gs.print('  Asset Tag    : ' + assetTag);
    gs.print('  Sys ID       : ' + sysId);
    gs.print('  Akt. Preis   : ' + aktuellerPreis.toFixed(2) + ' EUR');
    gs.print('  Neuer Preis  : ' + parseFloat(NEUER_PREIS).toFixed(2) + ' EUR');

    if (aktuellerPreis === parseFloat(NEUER_PREIS)) {
        gs.print('  INFO: Preis bereits identisch - keine Aenderung notwendig.');
        anzahlIdentisch++;
    } else if (DRY_RUN) {
        gs.print('  DRY RUN: Wuerde Preis von ' + aktuellerPreis.toFixed(2) + ' EUR auf ' + parseFloat(NEUER_PREIS).toFixed(2) + ' EUR aendern.');
        anzahlGeaendert++;
    } else {
        gr.setValue('cost', NEUER_PREIS);
        gr.update();
        gs.print('  OK: Preis geaendert: ' + aktuellerPreis.toFixed(2) + ' EUR -> ' + parseFloat(NEUER_PREIS).toFixed(2) + ' EUR');
        anzahlGeaendert++;
    }
}

gs.print('');
gs.print('======================================================');
gs.print('  Zusammenfassung');
gs.print('======================================================');

if (anzahlGefunden === 0) {
    gs.print('  FEHLER: Keine Assets mit Display Name "' + ASSET_DISPLAY_NAME + '" gefunden.');
    gs.print('  Bitte den Namen pruefen (Gross-/Kleinschreibung beachten).');
} else {
    gs.print('  Gefunden         : ' + anzahlGefunden + ' Asset(s)');
    gs.print('  Bereits korrekt  : ' + anzahlIdentisch + ' Asset(s)');
    if (DRY_RUN) {
        gs.print('  Wuerden geaendert: ' + anzahlGeaendert + ' Asset(s)  <- DRY RUN, noch nicht gespeichert');
        gs.print('');
        gs.print('  >> Setze DRY_RUN = false um alle Aenderungen tatsaechlich zu speichern.');
    } else {
        gs.print('  Geaendert        : ' + anzahlGeaendert + ' Asset(s)');
    }
}

gs.print('======================================================');
gs.print('  Script beendet.');
gs.print('======================================================');
