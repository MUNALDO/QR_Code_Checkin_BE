import express from 'express';
import {
    checkAttendance, getAttendanceHistory
} from '../controllers/employeeController.js';

const router = express.Router();

router.post('/check-attendance', checkAttendance);
router.get('/get-attendance/:employeeID', getAttendanceHistory);

export default router;