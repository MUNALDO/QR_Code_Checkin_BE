import express from 'express';
import { verifyTokenManager } from '../utils/verifyToken.js';
import {
    createMultipleDateDesignsByManager, deleteDateSpecificByManager,
    getAttendanceForManager, getDateDesignForManager, getEmployeeByIdForManager, getEmployeesSchedulesByManager, 
    searchSpecificForManager
} from '../controllers/managerController.js';

const router = express.Router();

// manage employee
router.get("/manage-employee/search-specific", verifyTokenManager, searchSpecificForManager);
router.get("/manage-employee/get-all-schedules", verifyTokenManager, getEmployeesSchedulesByManager);
router.get("/manage-employee/get-byId", verifyTokenManager, getEmployeeByIdForManager);

// manage date design
router.post("/manage-date-design/create-days", verifyTokenManager, createMultipleDateDesignsByManager);
router.get('/manage-date-design/get-by-specific', verifyTokenManager, getDateDesignForManager);
router.delete('/manage-date-design/delete', verifyTokenManager, deleteDateSpecificByManager);

// manage attendance
router.get('/manage-attendance/get-by-specific', verifyTokenManager, getAttendanceForManager);

export default router;