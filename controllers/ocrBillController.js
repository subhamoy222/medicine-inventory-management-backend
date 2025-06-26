import Bill from '../models/Bill.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import vision from '@google-cloud/vision';

// Google Vision setup (assume credentials are set in environment)
const client = new vision.ImageAnnotatorClient();

// Helper: Parse OCR text to Bill fields
function parseBillTextToModelFields(text) {
  // TODO: Implement robust parsing logic for your bill format
  // This is a placeholder. You must adapt it to your bill layout.
  // Only return fields present in Bill.js
  return {
    supplierInvoiceNumber: '',
    receiptNumber: '',
    partyName: '',
    date: '',
    items: [],
    purchaseAmount: 0,
    totalAmount: 0,
    discountAmount: 0,
    // email: '', // Not from OCR, set on frontend or session
  };
}

export const ocrBillUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const filePath = req.file.path;
    let ocrResult;

    // Handle image or PDF
    if (req.file.mimetype === 'application/pdf') {
      [ocrResult] = await client.documentTextDetection(filePath);
    } else {
      [ocrResult] = await client.textDetection(filePath);
    }
    const text = ocrResult.fullTextAnnotation ? ocrResult.fullTextAnnotation.text : '';

    // Parse text to Bill model fields
    const billData = parseBillTextToModelFields(text);

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    return res.json(billData);
  } catch (error) {
    console.error('OCR Bill Upload Error:', error);
    return res.status(500).json({ message: 'Failed to process bill', error: error.message });
  }
}; 