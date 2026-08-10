const XLSX = require('xlsx');
const wb = XLSX.readFile(process.argv[2]);
console.log(JSON.stringify(wb.SheetNames));
