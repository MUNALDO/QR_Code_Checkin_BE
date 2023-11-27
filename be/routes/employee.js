import express from 'express';
import {
    checkAttendance,
    getAttendanceHistory, loginEmployee,
    logoutEmployee,
    signalQRScan
} from '../controllers/employeeController.js';
import { verifyTokenEmployee } from '../utils/verifyToken.js';

const router = express.Router();

router.post('/loginEmployee', loginEmployee);
router.post('/logoutEmployee', logoutEmployee);

router.post('/check-attendance', checkAttendance);
router.post('/signal-qr-scan', signalQRScan);
router.get('/get-attendance/:employeeID', getAttendanceHistory);

export default router;