import express from 'express';
import {
    checkAttendance, createRequest, getAttendanceByCurrentMonth,
    getAttendanceCurrentTime, getDateDesignInMonthByEmployee, updateAttendance
} from '../controllers/employeeController.js';
import { verifyTokenEmployee } from '../utils/verifyToken.js';
import multer from 'multer';

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const router = express.Router();

// verify wifi
// router.post('/verify-wifi', verifyTokenEmployee, verifyWifi);

// attendance
router.post('/check-attendance', verifyTokenEmployee, checkAttendance);
router.post('/update-attendance', verifyTokenEmployee, upload.single('image'), updateAttendance);
router.get('/get-attendance-month', verifyTokenEmployee, getAttendanceByCurrentMonth);
router.get('/get-attendance-now', verifyTokenEmployee, getAttendanceCurrentTime);

// request
router.post('/create-request', verifyTokenEmployee, createRequest);

// schedule
router.get('/get-schedules', verifyTokenEmployee, getDateDesignInMonthByEmployee);
export default router;