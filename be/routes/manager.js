import express from 'express';
import { verifyUserManager } from '../utils/verifyToken.js';
import {
    deleteEmployeeById, getAllEmployees, getEmployeeSchedule,
    getEmployeeSpecific, updateEmployee
} from '../controllers/managerController.js';

const router = express.Router();

router.put("/manage-employee/update", verifyUserManager, updateEmployee);
router.delete("manage-employee/delete-byId", verifyUserManager, deleteEmployeeById);
router.get("/manage-employee/get-all", verifyUserManager, getAllEmployees);
router.get("/manage-employee/get-specific", verifyUserManager, getEmployeeSpecific);
router.get("/manage-employee/get-schedule", verifyUserManager, getEmployeeSchedule);

export default router;