// ============================================================
// ServiceNow Background Script – Create Missing Asset for CI
// Table: alm_hardware
// Creates an alm_hardware record linked to a single CI when no asset exists.
// ============================================================

var DRY_RUN = true; // true = preview only, false = apply changes

var CI_TABLE = 'cmdb_ci';                        // CI table to search (single CI)
var CI_SYS_ID = '';                              // Set the CI sys_id here
var CI_NAME = '';                                // Optional: fallback by CI name if CI_SYS_ID is empty

var ASSET_TABLE = 'alm_hardware';                // Asset table to create
var ASSET_INSTALL_STATUS = 1;                    // 1 = Installed (standard ServiceNow value)
var ASSET_STATE = 1;                             // 1 = In Use (standard ServiceNow value)

function log(msg) {
    gs.print('[CREATE-MISSING-ASSET] ' + msg);
}

function abort(msg) {
    gs.print('ERROR: ' + msg);
    throw new Error(msg);
}

log('=== Start ' + (DRY_RUN ? '(DRY RUN)' : '(LIVE)') + ' ===');

if (!CI_SYS_ID && !CI_NAME) {
    abort('Please set CI_SYS_ID or CI_NAME in the configuration section.');
}

var ci = new GlideRecord(CI_TABLE);
if (CI_SYS_ID) {
    if (!ci.get(CI_SYS_ID)) {
        abort('CI not found for sys_id: ' + CI_SYS_ID);
    }
} else {
    ci.addQuery('name', CI_NAME);
    ci.query();
    if (!ci.next()) {
        abort('CI not found for name: ' + CI_NAME);
    }
}

var ciSysId = ci.getUniqueValue();
var ciName = ci.getValue('name') || '(unnamed CI)';

log('CI found: ' + ciName + ' [' + ciSysId + ']');

// Check for existing linked asset(s)
var asset = new GlideRecord(ASSET_TABLE);
asset.addQuery('cmdb_ci', ciSysId);
asset.query();

if (asset.next()) {
    log('Existing asset already linked to this CI: ' + asset.getDisplayValue('name') + ' [' + asset.getUniqueValue() + ']');
    log('=== End ===');
    throw 'Asset already exists for this CI.';
}

log('No existing asset found. Creating new asset record...');

var newAsset = new GlideRecord(ASSET_TABLE);
newAsset.initialize();
newAsset.setValue('name', ciName);
newAsset.setValue('cmdb_ci', ciSysId);
newAsset.setValue('model_id', ci.getValue('model_id') || ci.getValue('model'));
newAsset.setValue('serial_number', ci.getValue('serial_number'));
newAsset.setValue('asset_tag', ci.getValue('serial_number') || 'ASSET-' + ciSysId.substring(0, 8));
newAsset.setValue('install_status', ASSET_INSTALL_STATUS);
newAsset.setValue('asset_state', ASSET_STATE);
newAsset.setValue('location', ci.getValue('location'));
newAsset.setValue('department', ci.getValue('department'));
newAsset.setValue('owned_by', ci.getValue('owned_by'));
newAsset.setValue('assigned_to', ci.getValue('owned_by'));
newAsset.setValue('cost', ci.getValue('cost'));
newAsset.setValue('description', 'Created automatically for CI ' + ciName + ' [' + ciSysId + ']');

if (DRY_RUN) {
    log('[DRY RUN] New asset would be created with the following values:');
    log('  name          : ' + newAsset.getValue('name'));
    log('  cmdb_ci       : ' + newAsset.getValue('cmdb_ci'));
    log('  model_id      : ' + newAsset.getValue('model_id'));
    log('  serial_number : ' + newAsset.getValue('serial_number'));
    log('  asset_tag     : ' + newAsset.getValue('asset_tag'));
    log('  install_status: ' + newAsset.getValue('install_status'));
    log('  asset_state   : ' + newAsset.getValue('asset_state'));
    log('  location      : ' + newAsset.getValue('location'));
    log('  department    : ' + newAsset.getValue('department'));
    log('  owned_by      : ' + newAsset.getValue('owned_by'));
    log('  assigned_to   : ' + newAsset.getValue('assigned_to'));
    log('  cost          : ' + newAsset.getValue('cost'));
    log('=== End ===');
} else {
    var newId = newAsset.insert();
    if (!newId) {
        abort('Failed to create new asset record.');
    }
    log('New asset created: ' + newAsset.getDisplayValue('name') + ' [' + newId + ']');
    log('=== End ===');
}
