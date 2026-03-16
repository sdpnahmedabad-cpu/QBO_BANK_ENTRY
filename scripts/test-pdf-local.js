const fs = require('fs');
const pdf = require('pdf-parse');
const path = require('path');

async function testPdf() {
    console.log('Testing pdf-parse...');
    try {
        // Create a dummy PDF buffer if real file doesn't exist, or use a sample
        // For simplicity, we'll try to use the test_upload.pdf if it exists, else a minimal valid PDF structure is hard to mock binary.
        // Let's just create a buffer that expects to fail or succeed. 
        // Actually, let's try to read the package.json as a buffer just to see if pdf-parse crashes on non-pdf or if it loads.
        // Better: require('pdf-parse') itself to see if it throws.

        console.log('Library loaded:', typeof pdf);

        const pdfPath = path.join(__dirname, 'test_upload.pdf');
        if (fs.existsSync(pdfPath)) {
            console.log('Reading test_upload.pdf...');
            const dataBuffer = fs.readFileSync(pdfPath);
            const data = await pdf(dataBuffer);
            console.log('Success! Text length:', data.text.length);
        } else {
            console.log('test_upload.pdf not found, cannot test parsing.');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

testPdf();
