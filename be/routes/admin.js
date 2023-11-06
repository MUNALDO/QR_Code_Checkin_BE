import express from 'express';
import {
    createSchedule, getAllEmployees,
    getAttendanceByMonth,
    getEmployeeById, getEmployeeByName,
    getEmployeeSchedule,
    loginAdmin, logoutAdmin, registerAdmin, registerEmployee
} from '../controllers/adminController.js';
import { verifyTokenAdmin } from '../utils/verifyToken.js';

const router = express.Router();

router.post('/registerAdmin', verifyTokenAdmin, registerAdmin);
router.post('/loginAdmin', loginAdmin);
router.post('/logoutAdmin', verifyTokenAdmin, logoutAdmin);

router.post('/add-employee', verifyTokenAdmin, registerEmployee);
router.get('/get-all-employees', verifyTokenAdmin, getAllEmployees);
router.get('/get-employee-byId', verifyTokenAdmin, getEmployeeById);
router.get('/get-employee-byName', verifyTokenAdmin, getEmployeeByName);

router.post('/create-schedule', verifyTokenAdmin, createSchedule);
router.get('/get-schedule', verifyTokenAdmin, getEmployeeSchedule);

router.get('/get-attendance-byMonth', verifyTokenAdmin, getAttendanceByMonth)

export default router;