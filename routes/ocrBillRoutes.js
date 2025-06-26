import express from 'express';
import multer from 'multer';
import path from 'path';
import { ocrBillUpload } from '../controllers/ocrBillController.js';

const router = express.Router();

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// POST /api/ocr-bill
router.post('/', upload.single('file'), ocrBillUpload);

export default router; 