/*
 * Skript:   set_ritm_service_and_offering.js
 * Zweck:    Setzt die Felder 'business_service' und 'service_offering' in sc_req_item
 *           anhand des Katalog-Codes am Anfang der Kurzbeschreibung (short_description).
 *           Beispiel: "AC001 Create AD Account" -> Code "AC001"
 *
 * Ausfuehrung: System Definition > Scripts - Background (global scope)
 *
 * Konfiguration:
 *   DRY_RUN - true  = nur loggen, keine Aenderungen
 *             false = Felder tatsaechlich setzen und speichern
 *
 * RITMs mit bereits gesetztem business_service werden immer uebersprungen.
 *
 * Hinweise zu Duplikaten in der Vorlage:
 *   AC006 - in Vorlage doppelt (Sharepoint + GCP)  -> hier GCP verwendet
 *   AC011 - in Vorlage doppelt (ServiceNow + AD)   -> hier AD verwendet
 *   SE012, SE032, SE037 - kein Service/Offering in der Vorlage -> werden uebersprungen
 */

var DRY_RUN = true;

// ---------------------------------------------------------------------------
// Mapping: Katalog-Code -> { service: "<Name in cmdb_ci_service>",
//                            serviceOffering: "<Name in service_offering>" }
// ---------------------------------------------------------------------------
var MAPPING = {
    "AC001": { service: "Active Directory - SI",                    serviceOffering: "Active Directory - TSO" },
    "AC002": { service: "Active Directory - SI",                    serviceOffering: "Active Directory - TSO" },
    "AC003": { service: "Active Directory - SI",                    serviceOffering: "Active Directory - TSO" },
    "AC004": { service: "MOST.io - SI",                             serviceOffering: "MOST.io - TSO" },
    "AC005": { service: "AWS - SI",                                 serviceOffering: "AWS - TSO" },
    "AC006": { service: "Google Cloud Platform (GCP) - SI",        serviceOffering: "Google Cloud Platform (GCP) - TSO" },
    "AC007": { service: "Sharepoint - SI",                         serviceOffering: "Sharepoint - TSO" },
    "AC008": { service: "Microsoft 365 - SI",                      serviceOffering: "Microsoft 365 - TSO" },
    "AC009": { service: "SAP GUI - SI",                            serviceOffering: "SAP GUI - TSO" },
    "AC010": { service: "Tangro - SI",                             serviceOffering: "Tangro - TSO" },
    "AC011": { service: "Active Directory - SI",                   serviceOffering: "Active Directory - TSO" },
    "AC012": { service: "ServiceNow - SI",                         serviceOffering: "ServiceNow - TSO" },
    "AC013": { service: "Active Directory - SI",                   serviceOffering: "Active Directory - TSO" },
    "AC014": { service: "Active Directory - SI",                   serviceOffering: "Active Directory - TSO" },
    "AC015": { service: "End-User Devices - SI",                   serviceOffering: "End-User Devices - TSO" },
    "AC016": { service: "Active Directory - SI",                   serviceOffering: "Active Directory - TSO" },
    "AC017": { service: "ServiceNow - SI",                         serviceOffering: "ServiceNow - TSO" },
    "AC018": { service: "ServiceNow - SI",                         serviceOffering: "ServiceNow - TSO" },
    "AC019": { service: "BeNeering - SI",                          serviceOffering: "BeNeering - TSO" },
    "AC020": { service: "Interfacing EPC - SI",                    serviceOffering: "Interfacing EPC - TSO" },
    "AC022": { service: "Spider - SI",                             serviceOffering: "Spider - TSO" },
    "AC023": { service: "SAP GUI - SI",                            serviceOffering: "SAP GUI - TSO" },
    "AC024": { service: "Application Service DXP - SI",            serviceOffering: "Application Service DXP - TSO" },
    "AC027": { service: "Azure - SI",                              serviceOffering: "Azure - TSO" },
    "AC028": { service: "ChatGPT Enterprise - SI",                 serviceOffering: "ChatGPT Enterprise - TSO" },
    "AC029": { service: "Application Service DXP - SI",            serviceOffering: "Application Service DXP - TSO" },
    "AC046": { service: "Active Directory - SI",                   serviceOffering: "Active Directory - TSO" },
    "AC048": { service: "Active Directory - SI",                   serviceOffering: "Active Directory - TSO" },
    "AC050": { service: "Google Cloud Platform (GCP) - SI",        serviceOffering: "Google Cloud Platform (GCP) - TSO" },
    "AC051": { service: "Colibri - SI",                            serviceOffering: "Colibri - TSO" },
    "AC052": { service: "Colibri - SI",                            serviceOffering: "Colibri - TSO" },
    "AC053": { service: "Colibri - SI",                            serviceOffering: "Colibri - TSO" },
    "AC054": { service: "Colibri - SI",                            serviceOffering: "Colibri - TSO" },
    "AC055": { service: "Colibri - SI",                            serviceOffering: "Colibri - TSO" },
    "AC056": { service: "SAP FI/CO - SI",                          serviceOffering: "SAP FI/CO - TSO" },
    "AC057": { service: "Altea Reservation (RES) - SI",            serviceOffering: "Altea Reservation (RES) - TSO" },
    "AC059": { service: "Active Directory - SI",                   serviceOffering: "Active Directory - TSO" },
    "AC061": { service: "JIRA - SI",                               serviceOffering: "JIRA - TSO" },
    "AC063": { service: "JIRA - SI",                               serviceOffering: "JIRA - TSO" },
    "AC064": { service: "Confluence - SI",                         serviceOffering: "Confluence - TSO" },
    "AC065": { service: "JIRA - SI",                               serviceOffering: "JIRA - TSO" },
    "AC066": { service: "SAP HCM - SI",                            serviceOffering: "SAP HCM - TSO" },
    "AC068": { service: "JIRA - SI",                               serviceOffering: "JIRA - TSO" },
    "AC069": { service: "Tangro - SI",                             serviceOffering: "Tangro - TSO" },
    "AC071": { service: "DocuSign - SI",                           serviceOffering: "DocuSign - TSO" },
    "AC072": { service: "Active Directory - SI",                   serviceOffering: "Active Directory - TSO" },
    "AC073": { service: "Confluence - SI",                         serviceOffering: "Confluence - TSO" },
    "AC074": { service: "JIRA - SI",                               serviceOffering: "JIRA - TSO" },
    "AC075": { service: "Netline Crew - SI",                       serviceOffering: "Netline Crew - TSO" },
    "AC076": { service: "NetLine Ops++ - SI",                      serviceOffering: "NetLine Ops++ - TSO" },
    "AC078": { service: "ASES - SI",                               serviceOffering: "ASES -TSO" },
    "AC079": { service: "ASES - SI",                               serviceOffering: "ASES -TSO" },
    "AC080": { service: "Guidecom Service - SI",                   serviceOffering: "Guidecom Service - TSO" },
    "AC081": { service: "Guidecom Service - SI",                   serviceOffering: "Guidecom Service - TSO" },
    "AC084": { service: "Salesforce Core and Service Cloud - SI",  serviceOffering: "Salesforce Core and Service Cloud - TSO" },
    "AC091": { service: "Microsoft Authenticator - SI",            serviceOffering: "Microsoft Authenticator - TSO" },
    "AC092": { service: "Airpas - SI",                             serviceOffering: "Airpas - TSO" },
    "AC093": { service: "AWS - SI",                                serviceOffering: "AWS - TSO" },
    "AC094": { service: "Active Directory - SI",                   serviceOffering: "Active Directory - TSO" },
    "AC095": { service: "Splunk - SI",                             serviceOffering: "Splunk - TSO" },
    "AC096": { service: "Splunk - SI",                             serviceOffering: "Splunk - TSO" },
    "AC097": { service: "Splunk - SI",                             serviceOffering: "Splunk - TSO" },
    "AC098": { service: "Splunk - SI",                             serviceOffering: "Splunk - TSO" },
    "AC099": { service: "Splunk - SI",                             serviceOffering: "Splunk - TSO" },
    "AP001": { service: "Client Software - SI",                    serviceOffering: "Standard Software - TSO" },
    "FM001": { service: "ServiceNow - SI",                         serviceOffering: "ServiceNow - TSO" },
    "IN001": { service: "End-User Devices - SI",                   serviceOffering: "End-User Devices - TSO" },
    "IN002": { service: "Wide Area Network - SI",                  serviceOffering: "Wide Area Network - TSO" },
    "IN003": { service: "End-User Devices - SI",                   serviceOffering: "End-User Devices - TSO" },
    "IN005": { service: "Local Area Network - SI",                 serviceOffering: "Local Area Network - TSO" },
    "IN006": { service: "Microsoft Teams - SI",                    serviceOffering: "Microsoft Teams - TSO" },
    "IN007": { service: "Sharepoint - SI",                         serviceOffering: "Sharepoint - TSO" },
    "IN008": { service: "Microsoft Teams - SI",                    serviceOffering: "Microsoft Teams - TSO" },
    "IN009": { service: "Local Area Network - SI",                 serviceOffering: "Local Area Network - TSO" },
    "IN010": { service: "Wide Area Network - SI",                  serviceOffering: "Wide Area Network - TSO" },
    "IN012": { service: "Wide Area Network - SI",                  serviceOffering: "Wide Area Network - TSO" },
    "IN013": { service: "Active Directory - SI",                   serviceOffering: "Active Directory - TSO" },
    "IN014": { service: "Local Area Network - SI",                 serviceOffering: "Local Area Network - TSO" },
    "IN015": { service: "Wide Area Network - SI",                  serviceOffering: "Wide Area Network - TSO" },
    "IN016": { service: "CheckMK - SI",                            serviceOffering: "CheckMK - TSO" },
    "IN019": { service: "Network Device Service - SI",             serviceOffering: "Network Device Service - TSO" },
    "IN024": { service: "Microsoft Teams - SI",                    serviceOffering: "Microsoft Teams - TSO" },
    "SE001": { service: "End-User Devices - SI",                   serviceOffering: "End-User Devices - TSO" },
    "SE002": { service: "End-User Devices - SI",                   serviceOffering: "End-User Devices - TSO" },
    "SE003": { service: "End-User Devices - SI",                   serviceOffering: "End-User Devices - TSO" },
    "SE004": { service: "AWS - SI",                                serviceOffering: "AWS - TSO" },
    "SE005": { service: "Microsoft Exchange - SI",                 serviceOffering: "Microsoft Exchange - TSO" },
    "SE006": { service: "Microsoft Exchange - SI",                 serviceOffering: "Microsoft Exchange - TSO" },
    "SE007": { service: "Microsoft Exchange - SI",                 serviceOffering: "Microsoft Exchange - TSO" },
    "SE008": { service: "Microsoft Exchange - SI",                 serviceOffering: "Microsoft Exchange - TSO" },
    "SE009": { service: "Microsoft Exchange - SI",                 serviceOffering: "Microsoft Exchange - TSO" },
    "SE010": { service: "Microsoft Exchange - SI",                 serviceOffering: "Microsoft Exchange - TSO" },
    "SE011": { service: "End-User Devices - SI",                   serviceOffering: "End-User Devices - TSO" },
    // SE012: kein Service/Offering in der Vorlage -> nicht im Mapping
    "SE013": { service: "AWS - SI",                                serviceOffering: "AWS - TSO" },
    "SE014": { service: "Telephony - SI",                          serviceOffering: "Landline - TSO" },
    "SE015": { service: "Telephony - SI",                          serviceOffering: "Landline - TSO" },
    "SE017": { service: "Telephony - SI",                          serviceOffering: "Landline - TSO" },
    "SE018": { service: "ServiceNow - SI",                         serviceOffering: "ServiceNow - TSO" },
    "SE019": { service: "Telephony - SI",                          serviceOffering: "Landline - TSO" },
    "SE020": { service: "Sharepoint - SI",                         serviceOffering: "Sharepoint - TSO" },
    "SE021": { service: "VPN - SI",                                serviceOffering: "VPN - TSO" },
    "SE022": { service: "VPN - SI",                                serviceOffering: "VPN - TSO" },
    "SE023": { service: "Microsoft Exchange - SI",                 serviceOffering: "Microsoft Exchange - TSO" },
    "SE024": { service: "AWS - SI",                                serviceOffering: "AWS - TSO" },
    "SE025": { service: "Microsoft Authenticator - SI",            serviceOffering: "Microsoft Authenticator - TSO" },
    "SE026": { service: "Airpas - SI",                             serviceOffering: "Airpas - TSO" },
    "SE027": { service: "Splunk - SI",                             serviceOffering: "Splunk - TSO" },
    "SE028": { service: "Microsoft Exchange - SI",                 serviceOffering: "Microsoft Exchange - TSO" },
    "SE029": { service: "SAP HCM - SI",                            serviceOffering: "SAP HCM - TSO" },
    "SE030": { service: "End-User Devices - SI",                   serviceOffering: "End-User Devices - TSO" },
    "SE031": { service: "Microsoft Exchange - SI",                 serviceOffering: "Microsoft Exchange - TSO" },
    // SE032: kein Service/Offering in der Vorlage -> nicht im Mapping
    "SE033": { service: "Network Device Service - SI",             serviceOffering: "Network Device Service - TSO" },
    "SE034": { service: "End-User Devices - SI",                   serviceOffering: "End-User Devices - TSO" },
    "SE035": { service: "Uniflow - SI",                            serviceOffering: "Uniflow - TSO" },
    // SE037: kein Service/Offering in der Vorlage -> nicht im Mapping
    "SE038": { service: "CCD - SI",                                serviceOffering: "CCD - TSO" },
    "SW002": { service: "Client Software - SI",                    serviceOffering: "Non-Standard Software - TSO" },
    "SW003": { service: "Client Software - SI",                    serviceOffering: "Non-Standard Software - TSO" },
    "SW004": { service: "Client Software - SI",                    serviceOffering: "Non-Standard Software - TSO" },
    "SW005": { service: "Gambit - SI",                             serviceOffering: "Gambit - TSO" },
    "SW006": { service: "Client Software - SI",                    serviceOffering: "Standard Software - TSO" },
    "SW007": { service: "Client Software - SI",                    serviceOffering: "Non-Standard Software - TSO" },
    "SW009": { service: "Client Software - SI",                    serviceOffering: "Non-Standard Software - TSO" },
    "SW010": { service: "Client Software - SI",                    serviceOffering: "Non-Standard Software - TSO" },
    "SW011": { service: "Client Software - SI",                    serviceOffering: "Non-Standard Software - TSO" },
    "SW012": { service: "Microsoft Fabric - Power BI (DAISY) - SI", serviceOffering: "Microsoft Fabric - Power BI (DAISY) - TSO" }
};

// ---------------------------------------------------------------------------
// Hilfsfunktionen mit Cache fuer Service- und Offering-Lookups
// ---------------------------------------------------------------------------
var _serviceCache  = {};
var _offeringCache = {};

function lookupService(name) {
    if (_serviceCache[name] !== undefined) return _serviceCache[name];
    var rec = new GlideRecord('cmdb_ci_service');
    rec.addQuery('name', name);
    rec.setLimit(1);
    rec.query();
    _serviceCache[name] = rec.next() ? rec.getUniqueValue() : null;
    return _serviceCache[name];
}

function lookupServiceOffering(name) {
    if (_offeringCache[name] !== undefined) return _offeringCache[name];
    var rec = new GlideRecord('service_offering');
    rec.addQuery('name', name);
    rec.setLimit(1);
    rec.query();
    _offeringCache[name] = rec.next() ? rec.getUniqueValue() : null;
    return _offeringCache[name];
}

// ---------------------------------------------------------------------------
// Hauptlogik
// ---------------------------------------------------------------------------
gs.print("=== set_ritm_service_and_offering ===");
gs.print("Modus : " + (DRY_RUN ? "DRY RUN (keine Aenderungen)" : "LIVE (Felder werden gesetzt)"));
gs.print("-------------------------------------");

var CODE_REGEX = /^([A-Z]{2}\d{3})/;

var cntTotal         = 0;
var cntNoCode        = 0;
var cntNoMapping     = 0;
var cntLookupFailed  = 0;
var cntProcessed     = 0;

var grRitm = new GlideRecord('sc_req_item');
grRitm.addNullQuery('business_service');
grRitm.query();

while (grRitm.next()) {
    cntTotal++;

    var shortDesc = grRitm.getValue('short_description') || '';
    var match     = shortDesc.match(CODE_REGEX);

    if (!match) {
        cntNoCode++;
        continue;
    }

    var code    = match[1];
    var mapping = MAPPING[code];

    if (!mapping) {
        cntNoMapping++;
        gs.print("[NO_MAPPING] " + grRitm.getValue('number') + " -> Code '" + code + "' nicht in Mapping");
        continue;
    }

    var serviceSysId  = lookupService(mapping.service);
    var offeringSysId = lookupServiceOffering(mapping.serviceOffering);

    if (!serviceSysId) {
        gs.print("[WARN] Service nicht gefunden     : '" + mapping.service + "' (RITM: " + grRitm.getValue('number') + ")");
        cntLookupFailed++;
        continue;
    }
    if (!offeringSysId) {
        gs.print("[WARN] ServiceOffering nicht gefunden: '" + mapping.serviceOffering + "' (RITM: " + grRitm.getValue('number') + ")");
        cntLookupFailed++;
        continue;
    }

    cntProcessed++;

    if (DRY_RUN) {
        gs.print("[DRY_RUN] " + grRitm.getValue('number') +
                 " | Code: " + code +
                 " | Service: " + mapping.service +
                 " | Offering: " + mapping.serviceOffering);
    } else {
        grRitm.setValue('business_service', serviceSysId);
        grRitm.setValue('service_offering', offeringSysId);
        grRitm.update();
        gs.print("[UPDATED] " + grRitm.getValue('number') +
                 " | Code: " + code +
                 " | Service: " + mapping.service +
                 " | Offering: " + mapping.serviceOffering);
    }
}

gs.print("-------------------------------------");
gs.print("Gesamt verarbeitet : " + cntTotal);
gs.print("  Kein Code        : " + cntNoCode);
gs.print("  Kein Mapping     : " + cntNoMapping);
gs.print("  Lookup fehlgesch.: " + cntLookupFailed);
gs.print("  " + (DRY_RUN ? "Wuerden aktualisiert" : "Aktualisiert") + ": " + cntProcessed);
if (DRY_RUN) {
    gs.print("Zum tatsaechlichen Ausfuehren: DRY_RUN = false setzen.");
}
gs.print("=== Ende ===");
