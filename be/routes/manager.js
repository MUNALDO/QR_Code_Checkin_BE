import express from 'express';
import { verifyUserManager } from '../utils/verifyToken.js';
import {
    createDateDesignByManager, deleteDateSpecificByManager, getAllDatesByManager,
    getAllEmployees, getDateDesignInMonthByManager, getDateSpecificByManager,
    getEmployeeSpecific, getEmployeesByDateAndShiftByManager, getEmployeesByDateByManager,
} from '../controllers/managerController.js';

const router = express.Router();

// manage employee
router.get("/manage-employee/get-all", verifyUserManager, getAllEmployees);
router.get("/manage-employee/get-specific", verifyUserManager, getEmployeeSpecific);
router.get("/manage-employee/get-by-date", verifyUserManager, getEmployeesByDateByManager);
router.get("/manage-employee/get-by-date&shift", verifyUserManager, getEmployeesByDateAndShiftByManager);

// manage date design
router.post("/manage-date-design/create", verifyUserManager, createDateDesignByManager);
router.get('/manage-date-design/get-all', verifyUserManager, getAllDatesByManager);
router.get('/manage-date-design/get-by-month', verifyUserManager, getDateDesignInMonthByManager);
router.get('/manage-date-design/get-by-date', verifyUserManager, getDateSpecificByManager);
router.delete('/manage-date-design/delete', verifyUserManager, deleteDateSpecificByManager);

export default router;