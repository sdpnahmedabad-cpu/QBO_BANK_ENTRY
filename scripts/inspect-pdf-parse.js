const pdf = require('pdf-parse');
console.log('Type of pdf:', typeof pdf);
console.log('Keys of pdf:', Object.keys(pdf));
console.log('Is pdf.default available?', !!pdf.default);
if (typeof pdf === 'object') {
    console.log('String representation:', pdf.toString());
}
