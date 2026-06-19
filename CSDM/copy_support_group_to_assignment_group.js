// ============================================================
//  ServiceNow Background Script – Copy Support Group to Assignment Group
//  Table: service_offering
//  Copies the value of support_group into assignment_group
//  for all Service Offering records (existing values are overwritten)
// ============================================================

// ============================================================
//  !! CONFIGURATION – Edit this section only !!
// ============================================================

var DRY_RUN = true; // true = preview only, false = changes will be saved

// Optional: restrict to a specific service offering (leave empty to process all)
var FILTER_NAME = ''; // e.g. 'SAP Support' – leave '' for all records

// ============================================================
//  LOGIC – Do not modify below this line
// ============================================================

gs.print('');
gs.print('======================================================');
gs.print('  Copy Support Group -> Assignment Group');
gs.print('  Table : service_offering');
gs.print('  Mode  : ' + (DRY_RUN ? 'DRY RUN - No changes will be saved' : 'LIVE - Changes will be saved'));
gs.print('======================================================');
gs.print('');

var gr = new GlideRecord('service_offering');

if (FILTER_NAME) {
    gr.addQuery('name', FILTER_NAME);
    gs.print('Filter: name = "' + FILTER_NAME + '"');
    gs.print('');
}

gr.query();

var countFound   = 0;
var countChanged = 0;
var countSkipped = 0;

while (gr.next()) {
    countFound++;

    var sysId           = gr.getValue('sys_id');
    var name            = gr.getValue('name') || '(no name)';
    var supportGroupId  = gr.getValue('support_group');
    var supportGroupDv  = gr.getDisplayValue('support_group') || '(empty)';
    var assignGroupId   = gr.getValue('assignment_group');
    var assignGroupDv   = gr.getDisplayValue('assignment_group') || '(empty)';

    gs.print('--------------------------------------------------');
    gs.print('  Record #' + countFound);
    gs.print('  Name             : ' + name);
    gs.print('  Sys ID           : ' + sysId);
    gs.print('  support_group    : ' + supportGroupDv);
    gs.print('  assignment_group : ' + assignGroupDv);

    if (!supportGroupId) {
        gs.print('  SKIP: support_group is empty – nothing to copy.');
        countSkipped++;
        continue;
    }

    if (DRY_RUN) {
        gs.print('  DRY RUN: Would set assignment_group to "' + supportGroupDv + '".');
        countChanged++;
    } else {
        gr.setValue('assignment_group', supportGroupId);
        gr.update();
        gs.print('  OK: assignment_group set to "' + supportGroupDv + '".');
        countChanged++;
    }
}

gs.print('');
gs.print('======================================================');
gs.print('  Summary');
gs.print('======================================================');

if (countFound === 0) {
    gs.print('  No records found' + (FILTER_NAME ? ' matching name "' + FILTER_NAME + '"' : '') + '.');
} else {
    gs.print('  Found   : ' + countFound + ' record(s)');
    gs.print('  Skipped : ' + countSkipped + ' record(s)  (support_group was empty)');
    if (DRY_RUN) {
        gs.print('  Would be changed: ' + countChanged + ' record(s)  <- DRY RUN, not yet saved');
        gs.print('');
        gs.print('  >> Set DRY_RUN = false to actually save all changes.');
    } else {
        gs.print('  Changed : ' + countChanged + ' record(s)');
    }
}

gs.print('======================================================');
gs.print('  Script finished.');
gs.print('======================================================');
