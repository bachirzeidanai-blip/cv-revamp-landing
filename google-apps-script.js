/**
 * Google Apps Script — CV Revamp Lead Form Webhook
 *
 * SETUP:
 * 1. Create a new Google Sheet
 * 2. Rename the first sheet tab to "Leads" (or update SHEET_NAME below)
 * 3. Go to Extensions > Apps Script
 * 4. Delete any existing code and paste this entire file
 * 5. Click Deploy > New deployment
 *    - Type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 6. Click Deploy, authorize when prompted
 * 7. Copy the Web app URL and paste it into index.html:
 *      var GOOGLE_SHEET_WEBHOOK = 'https://script.google.com/macros/s/xxxxx/exec';
 *
 * NOTE: The CV file itself cannot be received via Apps Script fetch.
 *       This logs the file name/size. For actual file storage,
 *       consider Google Forms or a backend with cloud storage.
 */

var SHEET_NAME = 'Leads';

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

    // Create header row if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Timestamp',
        'Name',
        'Email',
        'Phone',
        'LinkedIn',
        'CV File Name',
        'Language',
        'Submitted At'
      ]);
      // Bold the header row
      sheet.getRange(1, 1, 1, 8).setFontWeight('bold');
    }

    var params = e.parameter;

    sheet.appendRow([
      new Date().toLocaleString('en-US', { timeZone: 'Asia/Dubai' }),
      params.name || '',
      params.email || '',
      params.phone || '',
      params.linkedin || '',
      params.cvFile ? params.cvFile : '(no file name)',
      params.lang || 'en',
      params.timestamp || ''
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Allow GET requests to verify the endpoint is live
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'CV Revamp webhook is live' }))
    .setMimeType(ContentService.MimeType.JSON);
}
