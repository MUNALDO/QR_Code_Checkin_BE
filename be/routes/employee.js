import express from 'express';
import {
    checkAttendance, createRequest, getAttendanceHistory, getDateDesignInMonthByEmployee
} from '../controllers/employeeController.js';
import { verifyTokenEmployee } from '../utils/verifyToken.js';

const router = express.Router();

// attendance
router.post('/check-attendance', verifyTokenEmployee, checkAttendance);
router.get('/get-attendance', verifyTokenEmployee, getAttendanceHistory);

// request
router.post('/create-request', verifyTokenEmployee, createRequest);

// schedule
router.get('/get-schedules', verifyTokenEmployee, getDateDesignInMonthByEmployee);
export default router;