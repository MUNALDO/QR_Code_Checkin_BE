import express from 'express';
import { checkAttendance, getAttendanceHistory, loginEmployee, logoutEmployee } from '../controllers/employeeController.js';
import { verifyTokenEmployee } from '../utils/verifyToken.js';

const router = express.Router();

router.post('/loginEmployee', loginEmployee);
router.post('/logoutEmployee', verifyTokenEmployee, logoutEmployee);

router.post('/check-attendance', verifyTokenEmployee, checkAttendance);
router.get('/get-attendance/:employeeID', verifyTokenEmployee, getAttendanceHistory);

export default router;