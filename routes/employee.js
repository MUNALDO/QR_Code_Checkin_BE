import express from 'express';
import {
    checkAttendance, createRequest, getAttendanceByCurrentMonth,
    getAttendanceCurrentTime, getDateDesignInMonthByEmployee, updateAttendance
} from '../controllers/employeeController.js';
// import { verifyTokenEmployee } from '../utils/verifyToken.js';
import multer from 'multer';

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const router = express.Router();

// verify wifi
// router.post('/verify-wifi', verifyWifi);

// attendance
router.post('/check-attendance', checkAttendance);
router.post('/update-attendance', upload.single('image'), updateAttendance);
router.get('/get-attendance-month', getAttendanceByCurrentMonth);
router.get('/get-attendance-now', getAttendanceCurrentTime);

// request
router.post('/create-request', createRequest);

// schedule
router.get('/get-schedules', getDateDesignInMonthByEmployee);
export default router;