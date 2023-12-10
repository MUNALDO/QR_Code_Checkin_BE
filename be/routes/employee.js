import express from 'express';
import {
    checkAttendance, createRequest, getAttendanceHistory, getDateDesignInMonthByEmployee
} from '../controllers/employeeController.js';
import { verifyTokenEmployee } from '../utils/verifyToken.js';

const router = express.Router();

// attendance
router.post('/check-attendance', checkAttendance);
router.get('/get-attendance', getAttendanceHistory);

// request
router.post('/create-request', createRequest);

// schedule
router.get('/get-schedules', getDateDesignInMonthByEmployee);
export default router;