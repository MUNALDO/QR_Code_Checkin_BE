import express from 'express';
import { verifyUserInhaber } from '../utils/verifyToken.js';
import {
    createDateDesignByInhaber, deleteDateSpecificByInhaber, deleteEmployeeById,
    getAllDatesByInhaber, getAllEmployees, getDateDesignInMonthByInhaber, getDateSpecificByInhaber,
    getEmployeeSpecific, getEmployeesByDateAndShiftByInhaber, getEmployeesByDateByInhaber, updateEmployee
} from '../controllers/inhaberController.js';
import {
    createShift, getAllShifts, getShiftByCode,
    getShiftByName, updateShift
} from '../controllers/shiftController.js';

const router = express.Router();

// manage employee
router.put("/manage-employee/update", verifyUserInhaber, updateEmployee);
router.delete("/manage-employee/delete-byId", verifyUserInhaber, deleteEmployeeById);
router.get("/manage-employee/get-all", verifyUserInhaber, getAllEmployees);
router.get("/manage-employee/get-specific", verifyUserInhaber, getEmployeeSpecific);
router.get("/manage-employee/get-by-date", verifyUserInhaber, getEmployeesByDateByInhaber);
router.get("/manage-employee/get-by-date&shift", verifyUserInhaber, getEmployeesByDateAndShiftByInhaber);

// manage date design
router.post("/manage-date-design/create", verifyUserInhaber, createDateDesignByInhaber);
router.get('/manage-date-design/get-all', verifyUserInhaber, getAllDatesByInhaber);
router.get('/manage-date-design/get-by-month', verifyUserInhaber, getDateDesignInMonthByInhaber);
router.get('/manage-date-design/get-by-date', verifyUserInhaber, getDateSpecificByInhaber);
router.delete('/manage-date-design/delete', verifyUserInhaber, deleteDateSpecificByInhaber);

// manage shift
router.post('/manage-shift/create', verifyUserInhaber, createShift);
router.get('/manage-shift/get-all', verifyUserInhaber, getAllShifts);
router.get('/manage-shift/get-by-code', verifyUserInhaber, getShiftByCode);
router.get('/manage-shift/get-by-name', verifyUserInhaber, getShiftByName);
router.put('/manage-shift/update', verifyUserInhaber, updateShift);

export default router;