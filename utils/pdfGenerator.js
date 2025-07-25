import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure pdfs directory exists
const pdfDirectory = path.join(__dirname, '..', 'pdfs');
if (!fs.existsSync(pdfDirectory)) {
    fs.mkdirSync(pdfDirectory, { recursive: true });
}

export const generatePurchaseReturnPDF = (returnBill) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50 });
            
            // Create PDF file path
            const filename = `${returnBill.returnInvoiceNumber}.pdf`;
            const filepath = path.join(pdfDirectory, filename);
            
            // Pipe PDF to file
            const stream = fs.createWriteStream(filepath);
            doc.pipe(stream);

            // Add company header
            doc.fontSize(20)
               .fillColor('#1a237e')
               .font('Helvetica-Bold')
               .text('MEDICINE INVENTORY MANAGEMENT', { align: 'center' });

            doc.moveDown();
            doc.fontSize(16)
               .fillColor('#0d47a1')
               .text('Purchase Return Bill', { align: 'center' });

            // Add bill details
            doc.moveDown();
            doc.fontSize(12)
               .fillColor('#000000')
               .font('Helvetica');

            // Create a table-like structure for bill header
            const startX = 50;
            let startY = doc.y;
            const colWidth = (doc.page.width - 100) / 2;

            // Left column
            doc.text('Return Invoice Number:', startX, startY)
               .text(returnBill.returnInvoiceNumber, startX + 150, startY);
            
            // Right column
            doc.text('Date:', startX + colWidth, startY)
               .text(new Date(returnBill.date).toLocaleDateString(), startX + colWidth + 100, startY);

            startY += 25;
            doc.text('Receipt Number:', startX, startY)
               .text(returnBill.receiptNumber, startX + 150, startY);

            doc.text('Supplier Name:', startX + colWidth, startY)
               .text(returnBill.supplierName, startX + colWidth + 100, startY);

            startY += 25;
            doc.text('Supplier GST:', startX, startY)
               .text(returnBill.supplierGST, startX + 150, startY);

            // Add items table
            doc.moveDown(2);
            startY = doc.y;

            // Table headers
            const tableHeaders = ['Item Name', 'Batch', 'Qty', 'Rate', 'Disc%', 'GST%', 'Amount'];
            const tableWidths = [150, 80, 50, 70, 50, 50, 80];
            
            // Draw table header
            doc.fillColor('#ffffff')
               .rect(startX, startY, doc.page.width - 100, 25)
               .fill();

            let currentX = startX;
            doc.fillColor('#1a237e');
            tableHeaders.forEach((header, i) => {
                doc.text(header, currentX + 5, startY + 7, {
                    width: tableWidths[i],
                    align: 'left'
                });
                currentX += tableWidths[i];
            });

            // Draw table rows
            startY += 25;
            doc.fillColor('#000000');

            returnBill.items.forEach((item, index) => {
                const isEvenRow = index % 2 === 0;
                if (isEvenRow) {
                    doc.fillColor('#f5f5f5')
                       .rect(startX, startY, doc.page.width - 100, 25)
                       .fill();
                }

                currentX = startX;
                doc.fillColor('#000000');
                
                doc.text(item.itemName, currentX + 5, startY + 7, { width: tableWidths[0] });
                currentX += tableWidths[0];
                
                doc.text(item.batch, currentX + 5, startY + 7, { width: tableWidths[1] });
                currentX += tableWidths[1];
                
                doc.text(item.quantity.toString(), currentX + 5, startY + 7, { width: tableWidths[2] });
                currentX += tableWidths[2];
                
                doc.text(item.purchaseRate.toFixed(2), currentX + 5, startY + 7, { width: tableWidths[3] });
                currentX += tableWidths[3];
                
                doc.text(item.discount.toString(), currentX + 5, startY + 7, { width: tableWidths[4] });
                currentX += tableWidths[4];
                
                doc.text(item.gstPercentage.toString(), currentX + 5, startY + 7, { width: tableWidths[5] });
                currentX += tableWidths[5];
                
                doc.text(item.netAmount.toFixed(2), currentX + 5, startY + 7, { width: tableWidths[6] });
                
                startY += 25;

                // Add new page if needed
                if (startY > doc.page.height - 100) {
                    doc.addPage();
                    startY = 50;
                }
            });

            // Add totals
            doc.moveDown();
            const totalsStartY = startY + 20;
            
            doc.font('Helvetica-Bold');
            
            // Draw totals box
            doc.fillColor('#e3f2fd')
               .rect(doc.page.width - 250, totalsStartY, 200, 120)
               .fill();
            
            doc.fillColor('#000000');
            
            // Total Amount
            doc.text('Total Amount:', doc.page.width - 240, totalsStartY + 10);
            doc.text(returnBill.totalAmount.toFixed(2), doc.page.width - 100, totalsStartY + 10, { align: 'right' });
            
            // Discount
            doc.text('Discount:', doc.page.width - 240, totalsStartY + 35);
            doc.text(returnBill.totalDiscount.toFixed(2), doc.page.width - 100, totalsStartY + 35, { align: 'right' });
            
            // GST
            doc.text('GST:', doc.page.width - 240, totalsStartY + 60);
            doc.text(returnBill.totalGst.toFixed(2), doc.page.width - 100, totalsStartY + 60, { align: 'right' });
            
            // Net Amount
            doc.fillColor('#1a237e');
            doc.text('Net Amount:', doc.page.width - 240, totalsStartY + 85);
            doc.text(returnBill.netAmount.toFixed(2), doc.page.width - 100, totalsStartY + 85, { align: 'right' });

            // Add footer
            doc.moveDown(4);
            doc.fontSize(10)
               .fillColor('#666666')
               .text('This is a computer generated document.', { align: 'center' });

            // Finalize PDF
            doc.end();

            // When stream is finished, resolve with the file path
            stream.on('finish', () => {
                resolve(filepath);
            });

        } catch (error) {
            reject(error);
        }
    });
}; 

export const generateSaleBillPDF = (saleBill) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50 });
            const filename = `${saleBill.saleInvoiceNumber}.pdf`;
            const filepath = path.join(pdfDirectory, filename);
            const stream = fs.createWriteStream(filepath);
            doc.pipe(stream);

            // Header
            doc.fontSize(20)
               .fillColor('#1a237e')
               .font('Helvetica-Bold')
               .text('MEDICINE INVENTORY MANAGEMENT', { align: 'center' });
            doc.moveDown();
            doc.fontSize(16)
               .fillColor('#0d47a1')
               .text('Sales Invoice', { align: 'center' });

            // Bill details
            doc.moveDown();
            doc.fontSize(12)
               .fillColor('#000000')
               .font('Helvetica');
            const startX = 50;
            let startY = doc.y;
            const colWidth = (doc.page.width - 100) / 2;
            doc.text('Invoice Number:', startX, startY)
               .text(saleBill.saleInvoiceNumber, startX + 120, startY);
            doc.text('Date:', startX + colWidth, startY)
               .text(new Date(saleBill.date).toLocaleDateString(), startX + colWidth + 60, startY);
            startY += 25;
            doc.text('Party Name:', startX, startY)
               .text(saleBill.partyName, startX + 120, startY);
            doc.text('Receipt Number:', startX + colWidth, startY)
               .text(saleBill.receiptNumber || '', startX + colWidth + 100, startY);
            startY += 25;
            doc.text('GST Number:', startX, startY)
               .text(saleBill.gstNumber || '', startX + 120, startY);

            // Items table
            doc.moveDown(2);
            startY = doc.y;
            const tableHeaders = ['Item Name', 'Batch', 'Qty', 'MRP', 'Disc%', 'GST%', 'Amount'];
            const tableWidths = [120, 60, 40, 60, 50, 50, 80];
            doc.fillColor('#ffffff')
               .rect(startX, startY, doc.page.width - 100, 25)
               .fill();
            let currentX = startX;
            doc.fillColor('#1a237e');
            tableHeaders.forEach((header, i) => {
                doc.text(header, currentX + 5, startY + 7, {
                    width: tableWidths[i],
                    align: 'left'
                });
                currentX += tableWidths[i];
            });
            startY += 25;
            doc.fillColor('#000000');
            saleBill.items.forEach((item, index) => {
                const isEvenRow = index % 2 === 0;
                if (isEvenRow) {
                    doc.fillColor('#f5f5f5')
                       .rect(startX, startY, doc.page.width - 100, 25)
                       .fill();
                }
                currentX = startX;
                doc.fillColor('#000000');
                doc.text(item.itemName, currentX + 5, startY + 7, { width: tableWidths[0] });
                currentX += tableWidths[0];
                doc.text(item.batch, currentX + 5, startY + 7, { width: tableWidths[1] });
                currentX += tableWidths[1];
                doc.text(item.quantity.toString(), currentX + 5, startY + 7, { width: tableWidths[2] });
                currentX += tableWidths[2];
                doc.text(item.mrp?.toFixed(2) || '', currentX + 5, startY + 7, { width: tableWidths[3] });
                currentX += tableWidths[3];
                doc.text(item.discount?.toString() || '', currentX + 5, startY + 7, { width: tableWidths[4] });
                currentX += tableWidths[4];
                doc.text(item.gstPercentage?.toString() || '', currentX + 5, startY + 7, { width: tableWidths[5] });
                currentX += tableWidths[5];
                doc.text(item.amount?.toFixed(2) || '', currentX + 5, startY + 7, { width: tableWidths[6] });
                startY += 25;
                if (startY > doc.page.height - 100) {
                    doc.addPage();
                    startY = 50;
                }
            });
            // Totals
            doc.moveDown();
            const totalsStartY = startY + 20;
            doc.font('Helvetica-Bold');
            doc.fillColor('#e3f2fd')
               .rect(doc.page.width - 250, totalsStartY, 200, 100)
               .fill();
            doc.fillColor('#000000');
            doc.text('Total Amount:', doc.page.width - 240, totalsStartY + 10);
            doc.text(saleBill.totalAmount?.toFixed(2) || '', doc.page.width - 100, totalsStartY + 10, { align: 'right' });
            doc.text('Discount:', doc.page.width - 240, totalsStartY + 35);
            doc.text(saleBill.discountAmount?.toFixed(2) || '', doc.page.width - 100, totalsStartY + 35, { align: 'right' });
            doc.text('GST:', doc.page.width - 240, totalsStartY + 60);
            doc.text(saleBill.totalGstAmount?.toFixed(2) || '', doc.page.width - 100, totalsStartY + 60, { align: 'right' });
            doc.fillColor('#1a237e');
            doc.text('Net Amount:', doc.page.width - 240, totalsStartY + 85);
            doc.text(saleBill.netAmount?.toFixed(2) || '', doc.page.width - 100, totalsStartY + 85, { align: 'right' });
            doc.moveDown(4);
            doc.fontSize(10)
               .fillColor('#666666')
               .text('This is a computer generated document.', { align: 'center' });
            doc.end();
            stream.on('finish', () => {
                resolve(filepath);
            });
        } catch (error) {
            reject(error);
        }
    });
}; 