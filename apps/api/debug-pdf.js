try {
    const pdfmake = require('pdfmake');
    console.log('pdfmake type:', typeof pdfmake);
    console.log('pdfmake keys:', Object.keys(pdfmake));
    
    try {
        const printer = new pdfmake({});
        console.log('Success with new pdfmake()');
    } catch (e) {
        console.log('Failed with new pdfmake():', e.message);
    }

    try {
        const PdfPrinter = require('pdfmake/src/printer');
        console.log('Success loading pdfmake/src/printer');
        const printer = new PdfPrinter({});
        console.log('Success with new PdfPrinter() from src/printer');
    } catch (e) {
        console.log('Failed with pdfmake/src/printer:', e.message);
    }
} catch (e) {
    console.error('Core Load Error:', e.message);
}
