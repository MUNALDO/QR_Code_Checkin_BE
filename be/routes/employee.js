import express from 'express';
import {
    checkAttendance, getAttendanceHistory, getDateDesignInMonthByEmployee
} from '../controllers/employeeController.js';
import { verifyTokenEmployee } from '../utils/verifyToken.js';

const router = express.Router();

router.post('/check-attendance', verifyTokenEmployee, checkAttendance);
router.get('/get-attendance', verifyTokenEmployee, getAttendanceHistory);

router.get('/get-schedules', verifyTokenEmployee, getDateDesignInMonthByEmployee);
export default router;