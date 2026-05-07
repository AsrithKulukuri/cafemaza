import XLSX from 'xlsx';
import fs from 'fs';

const filePath = process.argv[2] || '../Price Comparisons.xlsx';

try {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log('📊 EXCEL FILE ANALYSIS');
    console.log('======================\n');

    // Show all column headers
    if (data.length > 0) {
        console.log('Column Headers:', Object.keys(data[0]));
        console.log('\nFirst 10 items:\n');

        data.slice(0, 10).forEach((row, idx) => {
            console.log(`${idx + 1}. ${row['Item Name'] || row.Name || 'Unknown'}`);
            console.log(`   Category: ${row.Category || row.Type}`);

            // Try to find price column
            const allKeys = Object.keys(row);
            const priceKeys = allKeys.filter(k =>
                k.toLowerCase().includes('price') ||
                k.toLowerCase().includes('cost') ||
                k.toLowerCase().includes('amount') ||
                k.toLowerCase().includes('₹') ||
                k.toLowerCase().includes('rate')
            );

            if (priceKeys.length > 0) {
                priceKeys.forEach(key => {
                    console.log(`   ${key}: ${row[key]}`);
                });
            } else {
                // Show all values for debugging
                allKeys.forEach(key => {
                    if (key !== 'Item Name' && key !== 'Category') {
                        console.log(`   ${key}: ${row[key]}`);
                    }
                });
            }
            console.log();
        });
    }
} catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
}
