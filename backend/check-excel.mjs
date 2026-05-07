import XLSX from 'xlsx';

const workbook = XLSX.readFile('../Price Comparisons.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet);

console.log('Columns:', Object.keys(data[0] || {}));
console.log('\nFirst 5 items:');
data.slice(0, 5).forEach(row => {
    console.log(`\n${row['Item Name'] || row.Name || 'Unknown'}`);
    console.log('  Category:', row.Category || row.Type);
    console.log('  Price:', row.Price);
    console.log('  Raw row keys:', Object.keys(row));
});
