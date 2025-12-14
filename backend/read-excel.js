const XLSX = require('xlsx');

const workbook = XLSX.readFile('c:\\KardexCare\\backend\\data\\Repaired_2025_Zonewise_Open_Closed_Offer funnel_ on 04032025.xlsx');

console.log('Sheet Names:', workbook.SheetNames);

const summarySheet = workbook.Sheets['Summary'];
if (summarySheet) {
    const data = XLSX.utils.sheet_to_json(summarySheet, { header: 1 });
    console.log('\n=== SUMMARY SHEET ===\n');
    data.forEach((row, i) => {
        console.log(`Row ${i}: ${JSON.stringify(row)}`);
    });
} else {
    console.log('Summary sheet not found');
    // Try first sheet
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
    console.log('\n=== First Sheet ===\n');
    data.slice(0, 50).forEach((row, i) => {
        console.log(`Row ${i}: ${JSON.stringify(row)}`);
    });
}
