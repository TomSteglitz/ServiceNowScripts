// =============================================================================
// Script:      fix_duplicate_changes_by_requester.js
// Description: Loads all change_request records requested by a specific user,
//              groups them by short_description, keeps the newest record per
//              group and deletes all older duplicates.
// Author:      Background Script
// Usage:       Run in ServiceNow Background Scripts (scope: global)
//              Set DRY_RUN = false to perform actual deletions
// =============================================================================

// =============================================================================
// Configuration – adjust before running
// =============================================================================
var DRY_RUN          = true;                    // !! Set to false to perform actual deletions !!
var REQUESTER_SYS_ID = 'sys_id_of_requester';   // sys_id of the user in sys_user table

// =============================================================================
// Input validation
// =============================================================================
if (!REQUESTER_SYS_ID || REQUESTER_SYS_ID === 'sys_id_of_requester') {
    gs.error('[CHG-DEDUP-REQUESTER] REQUESTER_SYS_ID is not set. Aborting.');
    gs.error('[CHG-DEDUP-REQUESTER] Please set REQUESTER_SYS_ID to the sys_id of the target user.');
} else {

    // =============================================================================
    // Step 1: Resolve requester display name for log output
    // =============================================================================
    var requesterName = 'Unknown';
    var grUser = new GlideRecord('sys_user');
    if (grUser.get(REQUESTER_SYS_ID)) {
        requesterName = grUser.getDisplayValue('name');
    } else {
        gs.warn('[CHG-DEDUP-REQUESTER] Could not resolve user for sys_id: ' + REQUESTER_SYS_ID + '. Proceeding anyway.');
    }

    gs.info('[CHG-DEDUP-REQUESTER] === Start (' + (DRY_RUN ? 'DRY-RUN' : 'LIVE') + ') ===');
    gs.info('[CHG-DEDUP-REQUESTER] Requester : ' + requesterName + ' [' + REQUESTER_SYS_ID + ']');

    // =============================================================================
    // Step 2: Fetch all change_requests for the given requester
    // =============================================================================
    var changesByTitle = {};

    var grFetch = new GlideRecord('change_request');
    grFetch.addQuery('requested_by', REQUESTER_SYS_ID);
    grFetch.orderBy('short_description');
    grFetch.orderByDesc('sys_created_on'); // newest first within each group
    grFetch.query();

    var totalLoaded = 0;

    while (grFetch.next()) {
        var title     = grFetch.getValue('short_description');
        var sysId     = grFetch.getValue('sys_id');
        var createdOn = grFetch.getValue('sys_created_on');
        var number    = grFetch.getValue('number');
        var state     = grFetch.getDisplayValue('state');

        if (!changesByTitle[title]) {
            changesByTitle[title] = [];
        }

        changesByTitle[title].push({
            sys_id:     sysId,
            number:     number,
            created_on: createdOn,
            state:      state
        });

        totalLoaded++;
    }

    gs.info('[CHG-DEDUP-REQUESTER] Total records loaded  : ' + totalLoaded);

    // =============================================================================
    // Step 3: Identify duplicate groups (more than one record per title)
    // =============================================================================
    var duplicateGroups = [];

    for (var title in changesByTitle) {
        if (changesByTitle[title].length > 1) {
            duplicateGroups.push({
                title:   title,
                records: changesByTitle[title] // already sorted: index 0 = newest
            });
        }
    }

    gs.info('[CHG-DEDUP-REQUESTER] Duplicate groups found : ' + duplicateGroups.length);

    if (duplicateGroups.length === 0) {
        gs.info('[CHG-DEDUP-REQUESTER] No duplicates found. Nothing to do.');
    }

    // =============================================================================
    // Step 4: Process duplicates – keep newest, delete the rest
    // =============================================================================
    var totalKept    = 0;
    var totalDeleted = 0;

    for (var i = 0; i < duplicateGroups.length; i++) {
        var group   = duplicateGroups[i];
        var records = group.records;
        var kept    = records[0];         // index 0 = newest (kept)
        var toDelete = records.slice(1);  // all others = deleted

        gs.info('[CHG-DEDUP-REQUESTER] ---');
        gs.info('[CHG-DEDUP-REQUESTER] Title    : "' + group.title + '" | Total records: ' + records.length);
        gs.info('[CHG-DEDUP-REQUESTER]   KEEP   → ' + kept.number +
                ' | state: ' + kept.state +
                ' | created: ' + kept.created_on);

        for (var j = 0; j < toDelete.length; j++) {
            var rec = toDelete[j];
            gs.info('[CHG-DEDUP-REQUESTER]   DELETE → ' + rec.number +
                    ' | state: ' + rec.state +
                    ' | created: ' + rec.created_on);

            if (!DRY_RUN) {
                var grDelete = new GlideRecord('change_request');
                if (grDelete.get(rec.sys_id)) {
                    grDelete.deleteRecord();
                    gs.info('[CHG-DEDUP-REQUESTER]            [DELETED]');
                } else {
                    gs.warn('[CHG-DEDUP-REQUESTER]            [NOT FOUND – skipped]');
                }
            } else {
                gs.info('[CHG-DEDUP-REQUESTER]            [DRY-RUN – not deleted]');
            }

            totalDeleted++;
        }

        totalKept++;
    }

    // =============================================================================
    // Step 5: Summary
    // =============================================================================
    gs.info('[CHG-DEDUP-REQUESTER] === Summary (' + (DRY_RUN ? 'DRY-RUN' : 'LIVE') + ') ===');
    gs.info('[CHG-DEDUP-REQUESTER] Requester        : ' + requesterName + ' [' + REQUESTER_SYS_ID + ']');
    gs.info('[CHG-DEDUP-REQUESTER] Records loaded   : ' + totalLoaded);
    gs.info('[CHG-DEDUP-REQUESTER] Duplicate groups : ' + duplicateGroups.length);
    gs.info('[CHG-DEDUP-REQUESTER] Records kept     : ' + totalKept);
    gs.info('[CHG-DEDUP-REQUESTER] Records deleted  : ' + totalDeleted + (DRY_RUN ? ' (DRY-RUN)' : ''));
    if (DRY_RUN) {
        gs.info('[CHG-DEDUP-REQUESTER] To apply changes, set DRY_RUN = false and re-run the script.');
    }
    gs.info('[CHG-DEDUP-REQUESTER] === End ===');
}
