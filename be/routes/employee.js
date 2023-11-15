import express from 'express';
import {
    checkAttendance, createSchedule,
    getAttendanceHistory, loginEmployee,
    logoutEmployee,
    signalQRScan
} from '../controllers/employeeController.js';
import { verifyTokenEmployee } from '../utils/verifyToken.js';

const router = express.Router();

router.post('/loginEmployee', loginEmployee);
router.post('/logoutEmployee', verifyTokenEmployee, logoutEmployee);

router.post('/check-attendance', verifyTokenEmployee, checkAttendance);
router.post('/signal-qr-scan', verifyTokenEmployee, signalQRScan);
router.get('/get-attendance/:employeeID', verifyTokenEmployee, getAttendanceHistory);
router.post('/create-schedule', verifyTokenEmployee, createSchedule);

export default router;