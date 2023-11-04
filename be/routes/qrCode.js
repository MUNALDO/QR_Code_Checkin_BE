import express from 'express';
import { generateQRCode, scanQRCode } from '../controllers/qrController.js';

const router = express.Router();

// Define your routes
router.get('/generate-qr-code', generateQRCode);
router.get('/scan-qr-code', scanQRCode);

export default router;
