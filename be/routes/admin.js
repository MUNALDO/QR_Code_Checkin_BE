import express from 'express';
import {
    deleteEmployeeById,
    getAllEmployees, getAttendanceByTime,
    getEmployeeById, getEmployeeByName,
    getEmployeeByRole,
    getEmployeeSchedule,
    getEmployeeSpecific,
    loginAdmin, logoutAdmin, registerAdmin,
    registerEmployee, scanAndUpdateAttendance, updateEmployee
} from '../controllers/adminController.js';
import {
    addMemberDepartment, createDepartment, getAllDepartments,
    getDepartmentByCode, getDepartmentByName, getDepartmentSpecific, updateDepartment
} from '../controllers/departmentController.js';
import {
    createShift, getAllShifts,
    getShiftByCode, getShiftByName, updateShift
} from '../controllers/shiftController.js';
import {
    addMemberGroup, createGroup, getAllGroups,
    getGroupByCode, getGroupByName, updateGroup
} from '../controllers/groupController.js';
import { verifyTokenAdmin } from '../utils/verifyToken.js';
import { salaryCalculate } from '../controllers/salaryController.js';
import { exportAttendanceToExcel } from '../controllers/xlsxController.js';
import {
    addMemberDayOff, createDayOff, getAllDaysOff,
    getDayOffByCode, getDayOffByName, updateDayOff
} from '../controllers/dayOffController.js';

const router = express.Router();

// authenticate
router.post('/registerAdmin', registerAdmin);
router.post('/loginAdmin', loginAdmin);
router.post('/logoutAdmin', logoutAdmin);

// employee
router.post('/manage-employee/add-employee', registerEmployee);
router.get('/manage-employee/get-all-employees', getAllEmployees);
router.get('/manage-employee/get-employee-specific', getEmployeeSpecific);
router.get('/manage-employee/get-employee-byId', getEmployeeById);
router.get('/manage-employee/get-employee-byName', getEmployeeByName);
router.get('/manage-employee/get-employee-byRole', getEmployeeByRole);
router.get('/manage-employee/get-schedule', getEmployeeSchedule);
router.get('/manage-employee/export-attendance', exportAttendanceToExcel);
router.delete('/manage-employee/delete-employee-byId', deleteEmployeeById);
router.put('/manage-employee/update', updateEmployee);

// department
router.post('/department/create-department', createDepartment);
router.get('/department/get-all', getAllDepartments);
router.get('/department/get-by-code', getDepartmentByCode);
router.get('/department/get-by-name', getDepartmentByName);
router.get('/department/get-department-specific', getDepartmentSpecific);
router.put('/department/update', updateDepartment);
router.put('/department/add-member', addMemberDepartment);

// shift
router.post('/shift/create-shift', createShift);
router.get('/shift/get-all', getAllShifts);
router.get('/shift/get-by-code', getShiftByCode);
router.get('/shift/get-by-name', getShiftByName);
router.put('/shift/update', updateShift);

// group
router.post('/group/create-group', createGroup);
router.get('/group/get-all', getAllGroups);
router.get('/group/get-by-code', getGroupByCode);
router.get('/group/get-by-name', getGroupByName);
router.put('/group/update', updateGroup);
router.put('/group/add-member', addMemberGroup);

// day off
router.post('/day-off/create-dayOff', createDayOff);
router.get('/day-off/get-all', getAllDaysOff);
router.get('/day-off/get-by-code', getDayOffByCode);
router.get('/day-off/get-by-name', getDayOffByName);
router.put('/day-off/update', updateDayOff);
router.put('/day-off/add-member', addMemberDayOff);
router.get('/get-attendance', getAttendanceByTime);
router.post('/scan-attendance', scanAndUpdateAttendance);

router.post('/salary-calculate', verifyTokenAdmin, salaryCalculate);
export default router;