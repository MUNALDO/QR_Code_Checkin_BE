import express from 'express';
import { verifyUserInhaber } from '../utils/verifyToken.js';
import {
    deleteEmployeeById, getAllEmployees, getEmployeeSchedule,
    getEmployeeSpecific, updateEmployee
} from '../controllers/inhaberController.js';

const router = express.Router();

router.put("/manage-employee/update", verifyUserInhaber, updateEmployee);
router.delete("manage-employee/delete-byId", verifyUserInhaber, deleteEmployeeById);
router.get("/manage-employee/get-all", verifyUserInhaber, getAllEmployees);
router.get("/manage-employee/get-specific", verifyUserInhaber, getEmployeeSpecific);
router.get("/manage-employee/get-schedule", verifyUserInhaber, getEmployeeSchedule);

export default router;