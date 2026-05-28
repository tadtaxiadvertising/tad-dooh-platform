const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const creds = require('../../taxi-advertisig-c30861d203c5.json');

const sheetId = '1x2PQInj1F5CJnotWVNkCuGEKqULeO9Vv7qkUvmtd-LY';

async function testSheet() {
  try {
    const serviceAccountAuth = new JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
      ],
    });

    const doc = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
    await doc.loadInfo(); 
    console.log(`Document Title: ${doc.title}`);

    for (let i = 0; i < doc.sheetCount; i++) {
        const sheet = doc.sheetsByIndex[i];
        console.log(`\nSheet ${i}: ${sheet.title} (Rows: ${sheet.rowCount}, Cols: ${sheet.columnCount})`);
        
        try {
            await sheet.loadHeaderRow();
            console.log(`Headers Found: `, sheet.headerValues.join(', '));
            const rows = await sheet.getRows({ limit: 1 });
            if (rows.length > 0) {
                console.log('Row 1 Data Sample:', rows[0].toObject());
            } else {
                console.log('No data rows yet (only headers).');
            }
        } catch (e) {
            console.log('Status:', e.message);
        }
    }
  } catch (err) {
    console.error('Error fetching sheet:', err.message);
  }
}

testSheet();
