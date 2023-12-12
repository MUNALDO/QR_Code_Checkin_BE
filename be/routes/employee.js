import express from 'express';
import {
    checkAttendance, createRequest, getAttendanceByCurrentMonth,
    getAttendanceCurrentTime, getDateDesignInMonthByEmployee
} from '../controllers/employeeController.js';
import { verifyTokenEmployee } from '../utils/verifyToken.js';
// import multer from 'multer';
// const upload = multer({ dest: 'uploads/' });

const router = express.Router();

// attendance
router.post('/check-attendance', verifyTokenEmployee, checkAttendance);

// Update your route to include the multer middleware
// router.post('/update-attendance', verifyTokenEmployee, upload.single('image'), updateAttendance);
router.get('/get-attendance-month', verifyTokenEmployee, getAttendanceByCurrentMonth);
router.get('/get-attendance-now', verifyTokenEmployee, getAttendanceCurrentTime);

// request
router.post('/create-request', verifyTokenEmployee, createRequest);

// schedule
router.get('/get-schedules', verifyTokenEmployee, getDateDesignInMonthByEmployee);
export default router;