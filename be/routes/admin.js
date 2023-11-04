import express from 'express';
import {
    addEmployee, createSchedule, getAllEmployees,
    getEmployeeById, getEmployeeByName,
    getEmployeeSchedule,
    loginAdmin, logoutAdmin, registerAdmin
} from '../controllers/adminController.js';
import { verifyTokenAdmin } from '../utils/verifyToken.js';

const router = express.Router();

router.post('/registerAdmin', registerAdmin);
router.post('/loginAdmin', loginAdmin);
router.post('/logoutAdmin', logoutAdmin);

router.post('/add-employee', verifyTokenAdmin, addEmployee);
router.get('/get-all-employees', verifyTokenAdmin, getAllEmployees);
router.get('/get-employee-byId', verifyTokenAdmin, getEmployeeById);
router.get('/get-employee-byName', verifyTokenAdmin, getEmployeeByName);

router.post('/create-schedule', verifyTokenAdmin, createSchedule);
router.get('/get-schedule', verifyTokenAdmin, getEmployeeSchedule);

export default router;