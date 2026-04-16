// ============================================================
// ServiceNow Background Script – Create Missing Asset for CI
// Table: cmdb_ci_computer → alm_hardware
// Creates an alm_hardware record linked to a single computer CI when no asset exists.
// ============================================================

var DRY_RUN = true; // true = preview only, false = apply changes

var CI_TABLE = 'cmdb_ci_computer';               // CI table to search (single computer CI)
var CI_SYS_ID = '';                              // Set the CI sys_id here

var ASSET_TABLE = 'alm_hardware';                // Asset table to create
var ASSET_CI_FIELD = 'cmdb_ci';                   // Candidate CI reference field on alm_hardware
var ASSET_CI_CANDIDATES = ['cmdb_ci', 'ci', 'computer', 'installed_on', 'asset_ci'];

var CI_ASSET_FIELD = 'asset';                     // Candidate asset reference field on CI
var CI_ASSET_CANDIDATES = ['asset', 'alm_asset', 'hardware_asset', 'installed_asset'];

var ASSET_INSTALL_STATUS = 1;                    // 1 = Installed (standard ServiceNow value)
var ASSET_STATE = 1;                             // 1 = In Use (standard ServiceNow value)

function log(msg) {
    gs.print('[CREATE-MISSING-ASSET] ' + msg);
}

function abort(msg) {
    gs.print('ERROR: ' + msg);
    throw new Error(msg);
}

function resolveAssetCiField(table) {
    var gr = new GlideRecord(table);
    if (gr.isValidField(ASSET_CI_FIELD)) {
        return ASSET_CI_FIELD;
    }
    for (var i = 0; i < ASSET_CI_CANDIDATES.length; i++) {
        var field = ASSET_CI_CANDIDATES[i];
        if (gr.isValidField(field)) {
            log('Using asset CI field: ' + field);
            return field;
        }
    }
    abort('No valid CI reference field found on ' + table + '. Checked: ' + ASSET_CI_CANDIDATES.join(', '));
}

function resolveCiAssetField(table) {
    var gr = new GlideRecord(table);
    if (gr.isValidField(CI_ASSET_FIELD)) {
        return CI_ASSET_FIELD;
    }
    for (var i = 0; i < CI_ASSET_CANDIDATES.length; i++) {
        var field = CI_ASSET_CANDIDATES[i];
        if (gr.isValidField(field)) {
            log('Using CI asset field: ' + field);
            return field;
        }
    }
    abort('No valid asset reference field found on ' + table + '. Checked: ' + CI_ASSET_CANDIDATES.join(', '));
}

log('=== Start ' + (DRY_RUN ? '(DRY RUN)' : '(LIVE)') + ' ===');

if (!CI_SYS_ID) {
    abort('Please set CI_SYS_ID in the configuration section.');
}

var ci = new GlideRecord(CI_TABLE);
if (!ci.get(CI_SYS_ID)) {
    abort('CI not found for sys_id: ' + CI_SYS_ID);
}

var ciSysId = ci.getUniqueValue();
var ciName = ci.getValue('name') || '(unnamed CI)';

log('CI found: ' + ciName + ' [' + ciSysId + ']');

var assetCiField = resolveAssetCiField(ASSET_TABLE);
var ciAssetField = resolveCiAssetField(CI_TABLE);

// Check for existing linked asset(s) - both directions
var asset = new GlideRecord(ASSET_TABLE);
asset.addQuery(assetCiField, ciSysId);
asset.query();

var existingAssetId = null;
if (asset.next()) {
    existingAssetId = asset.getUniqueValue();
    log('Existing asset found linked to this CI: ' + (asset.getDisplayValue('name') || '(no name)') + ' [' + existingAssetId + ']');

    // Check if CI already has an asset reference to this asset
    if (ci.getValue(ciAssetField) === existingAssetId) {
        log('CI already correctly linked to this asset. No action needed.');
        log('=== End ===');
        // Exit gracefully without error
    } else {
        log('CI is missing the asset reference. Will update CI to link to existing asset.');
    }
} else {
    // Also check if CI already has an asset reference (but asset doesn't point back)
    if (ci.getValue(ciAssetField)) {
        log('CI has an asset reference, but asset does not point back to CI. This is an inconsistent state.');
        log('Will create a new asset and fix the linkage.');
    }
}

if (existingAssetId) {
    // Asset exists, just need to link CI to it
    log('Updating CI to link to existing asset...');

    if (DRY_RUN) {
        log('[DRY RUN] CI would be updated to link to asset [' + existingAssetId + '] via field: ' + ciAssetField);
        log('=== End ===');
    } else {
        if (ci.get(ciSysId)) {
            ci.setValue(ciAssetField, existingAssetId);
            ci.update();
            log('CI updated to link to existing asset via field: ' + ciAssetField);
        } else {
            log('WARNING: Could not update CI with asset reference (CI not found for update)');
        }
        log('=== End ===');
    }
} else {
    // No existing asset, create new one
    log('No existing asset found. Creating new asset record...');

    var newAsset = new GlideRecord(ASSET_TABLE);
    newAsset.initialize();
    newAsset.setValue('name', ciName);
    if (newAsset.isValidField(assetCiField)) {
        newAsset.setValue(assetCiField, ciSysId);
    } else {
        abort('Cannot set CI field on asset record: ' + assetCiField);
    }
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

    if (DRY_RUN) {
        log('[DRY RUN] New asset would be created with the following values:');
        log('  name          : ' + newAsset.getValue('name'));
        log('  ' + assetCiField + ' : ' + newAsset.getValue(assetCiField));
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
        log('[DRY RUN] CI would be updated to link to the new asset via field: ' + ciAssetField);
        log('=== End ===');
    } else {
        var newId = newAsset.insert();
        if (!newId) {
            abort('Failed to create new asset record.');
        }
        log('New asset created: ' + newAsset.getDisplayValue('name') + ' [' + newId + ']');

        // Update CI to link back to the asset
        if (ci.get(ciSysId)) {
            ci.setValue(ciAssetField, newId);
            ci.update();
            log('CI updated to link to asset via field: ' + ciAssetField);
        } else {
            log('WARNING: Could not update CI with asset reference (CI not found for update)');
        }

        log('=== End ===');
    }
}
