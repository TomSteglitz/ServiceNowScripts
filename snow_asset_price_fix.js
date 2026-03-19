// ============================================================
//  ServiceNow Background Script – Hardware Asset Price Fix
//  Table: alm_hardware
//  All assets matching the given Display Name will be updated
// ============================================================

// ============================================================
//  !! CONFIGURATION – Edit this section only !!
// ============================================================

var DRY_RUN = true; // true = preview only, false = changes will be saved

var ASSET_DISPLAY_NAME = 'Enter Display Name here'; // e.g. 'Dell Latitude 5520'
var NEW_PRICE          = 0.00;                       // e.g. 1299.99

// ============================================================
//  LOGIC – Do not modify below this line
// ============================================================

gs.print('');
gs.print('======================================================');
gs.print('  Hardware Asset Price Fix Script');
gs.print('  Mode: ' + (DRY_RUN ? 'DRY RUN - No changes will be saved' : 'LIVE - Changes will be saved'));
gs.print('======================================================');
gs.print('');

// Input validation
if (!ASSET_DISPLAY_NAME || ASSET_DISPLAY_NAME === 'Enter Display Name here') {
    gs.print('ERROR: Please enter a valid Display Name in ASSET_DISPLAY_NAME.');
    gs.print('Script execution aborted.');
    throw new Error('No asset Display Name configured.');
}

if (isNaN(NEW_PRICE) || NEW_PRICE < 0) {
    gs.print('ERROR: NEW_PRICE must be a positive number.');
    gs.print('Script execution aborted.');
    throw new Error('Invalid price configured.');
}

gs.print('Searching all assets with Display Name: "' + ASSET_DISPLAY_NAME + '"');
gs.print('');

// Query assets
var gr = new GlideRecord('alm_hardware');
gr.addQuery('display_name', ASSET_DISPLAY_NAME);
gr.query();

var countFound    = 0;
var countChanged  = 0;
var countIdentical = 0;

while (gr.next()) {
    countFound++;

    var sysId        = gr.getValue('sys_id');
    var assetTag     = gr.getValue('asset_tag') || '(no asset tag)';
    var currentPrice = parseFloat(gr.getValue('cost')) || 0.00;

    gs.print('--------------------------------------------------');
    gs.print('  Asset #' + countFound);
    gs.print('  Asset Tag     : ' + assetTag);
    gs.print('  Sys ID        : ' + sysId);
    gs.print('  Current Price : ' + currentPrice.toFixed(2) + ' EUR');
    gs.print('  New Price     : ' + parseFloat(NEW_PRICE).toFixed(2) + ' EUR');

    if (currentPrice === parseFloat(NEW_PRICE)) {
        gs.print('  INFO: Price already identical - no change necessary.');
        countIdentical++;
    } else if (DRY_RUN) {
        gs.print('  DRY RUN: Would change price from ' + currentPrice.toFixed(2) + ' EUR to ' + parseFloat(NEW_PRICE).toFixed(2) + ' EUR.');
        countChanged++;
    } else {
        gr.setValue('cost', NEW_PRICE);
        gr.update();
        gs.print('  OK: Price changed: ' + currentPrice.toFixed(2) + ' EUR -> ' + parseFloat(NEW_PRICE).toFixed(2) + ' EUR');
        countChanged++;
    }
}

gs.print('');
gs.print('======================================================');
gs.print('  Summary');
gs.print('======================================================');

if (countFound === 0) {
    gs.print('  ERROR: No assets found with Display Name "' + ASSET_DISPLAY_NAME + '".');
    gs.print('  Please verify the name (case-sensitive).');
} else {
    gs.print('  Found           : ' + countFound + ' asset(s)');
    gs.print('  Already correct : ' + countIdentical + ' asset(s)');
    if (DRY_RUN) {
        gs.print('  Would be changed: ' + countChanged + ' asset(s)  <- DRY RUN, not yet saved');
        gs.print('');
        gs.print('  >> Set DRY_RUN = false to actually save all changes.');
    } else {
        gs.print('  Changed         : ' + countChanged + ' asset(s)');
    }
}

gs.print('======================================================');
gs.print('  Script finished.');
gs.print('======================================================');