import express from 'express';
import {
    loginAdmin, loginEmployee, loginInhaber, loginManager,
    logoutAdmin, logoutEmployee, logoutInhaber, logoutManager, registerAdmin,
    registerEmployeeByAdmin, registerEmployeeByInhaber, registerEmployeeByManager,
    registerInhaberByAdmin, registerManagerByAdmin, registerManagerByInhaber
} from '../controllers/authController.js';
import {
    verifyTokenEmployee, verifyUserAdmin,
    verifyUserInhaber, verifyUserManager
} from '../utils/verifyToken.js';

const router = express.Router();

// authen admin
router.post('/manage-admin/register-admin', verifyUserAdmin, registerAdmin);
router.post('/manage-admin/login-admin', loginAdmin);
router.post('/manage-admin/logout-admin', verifyUserAdmin, logoutAdmin);

// authen inhaber
router.post('/manage-admin/register-inhaber', verifyUserAdmin, registerInhaberByAdmin);
router.post('/manage-inhaber/login-inhaber', loginInhaber);
router.post('/manage-inhaber/logout-inhaber', verifyUserInhaber, logoutInhaber);

// authen manager
router.post('/manage-admin/register-manager', verifyUserAdmin, registerManagerByAdmin);
router.post('/manage-inhaber/register-manager', verifyUserInhaber, registerManagerByInhaber);
router.post('/manage-manager/login-manager', loginManager);
router.post('/manage-manager/logout-manager', verifyUserManager, logoutManager);

// authen employee
router.post('/manage-admin/register-employee', verifyUserAdmin, registerEmployeeByAdmin);
router.post('/manage-inhaber/register-employee', verifyUserInhaber, registerEmployeeByInhaber);
router.post('/manage-manager/register-employee', verifyUserManager, registerEmployeeByManager);
router.post('/manage-employee/login-employee', loginEmployee);
router.post('/manage-employee/logout-employee', verifyTokenEmployee, logoutEmployee);

export default router;