import XLSX from 'xlsx';

const filePath = '../Price Comparisons.xlsx';

const workbook = XLSX.readFile(filePath);
console.log('📊 Available Sheets:', workbook.SheetNames);

workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);
    console.log(`\n📋 Sheet: "${sheetName}"`);
    console.log(`   Rows: ${data.length}`);
    if (data.length > 0) {
        console.log(`   Columns: ${Object.keys(data[0]).join(', ')}`);
        console.log(`   First item: ${JSON.stringify(data[0], null, 2)}`);
    }
});
