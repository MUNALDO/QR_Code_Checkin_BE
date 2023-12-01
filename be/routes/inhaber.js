import express from 'express';
import { verifyUserInhaber } from '../utils/verifyToken.js';
import {
    addMemberDate, createDateDesign, deleteEmployeeById,
    getAllEmployees, getEmployeeSchedule,
    getEmployeeSpecific, removeMemberDate, updateEmployee
} from '../controllers/inhaberController.js';
import {
    createShift, getAllShifts, getShiftByCode,
    getShiftByName, updateShift
} from '../controllers/shiftController.js';
import { deleteDateSpecific, getAllDates, getDateSpecific } from '../controllers/dateDesignController.js';

const router = express.Router();

// manage employee
router.put("/manage-employee/update", verifyUserInhaber, updateEmployee);
router.delete("/manage-employee/delete-byId", verifyUserInhaber, deleteEmployeeById);
router.get("/manage-employee/get-all", verifyUserInhaber, getAllEmployees);
router.get("/manage-employee/get-specific", verifyUserInhaber, getEmployeeSpecific);
router.get("/manage-employee/get-schedule", verifyUserInhaber, getEmployeeSchedule);

// manage date design
router.post("/manage-date-design/create", verifyUserInhaber, createDateDesign);
router.put("/manage-date-design/add-member", verifyUserInhaber, addMemberDate);
router.put("/manage-date-design/remove-member", verifyUserInhaber, removeMemberDate);
router.get('/manage-date-design/get-all', verifyUserInhaber, getAllDates);
router.get('/manage-date-design/get-specific', verifyUserInhaber, getDateSpecific);
router.put('/manage-date-design/delete', verifyUserInhaber, deleteDateSpecific);

// manage shift
router.post('/manage-shift/create', verifyUserInhaber, createShift);
router.get('/manage-shift/get-all', verifyUserInhaber, getAllShifts);
router.get('/manage-shift/get-by-code', verifyUserInhaber, getShiftByCode);
router.get('/manage-shift/get-by-name', verifyUserInhaber, getShiftByName);
router.put('/manage-shift/update', verifyUserInhaber, updateShift);

export default router;