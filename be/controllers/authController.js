import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { createError } from "../utils/error.js";
import { BAD_REQUEST, CREATED, FORBIDDEN, NOT_FOUND, OK } from "../constant/HttpStatus.js";
import dotenv from 'dotenv';
import AdminSchema from "../models/AdminSchema.js";
import EmployeeSchema from "../models/EmployeeSchema.js";
import DepartmentSchema from "../models/DepartmentSchema.js";

dotenv.config();

export const registerAdmin = async (req, res, next) => {
    try {
        const salt = bcrypt.genSaltSync(10)
        const hash = bcrypt.hashSync(req.body.password, salt)
        const newAdmin = new AdminSchema({
            ...req.body,
            password: hash,
            role: "Admin"
        })
        await newAdmin.save()
        res.status(CREATED).json({
            success: true,
            status: CREATED,
            message: newAdmin,
        });
    } catch (err) {
        next(err)
    }
};

export const loginAdmin = async (req, res, next) => {
    try {
        const admin = await AdminSchema.findOne({ name: req.body.name });
        if (!admin) return next(createError(NOT_FOUND, "Admin not found!"))
        const isPasswordCorrect = await bcrypt.compare(
            req.body.password,
            admin.password
        )
        if (!isPasswordCorrect) return next(createError(BAD_REQUEST, "Wrong password!"))
        const token_admin = jwt.sign(
            { id: admin.id, role: admin.role == "Admin" },
            process.env.JWT_ADMIN,
            { expiresIn: "24h" },
        )
        const { password, ...otherDetails } = admin._doc;
        res.cookie("access_token_admin", token_admin, {
            httpOnly: true,
            sameSite: "none",
            secure: true,
        }).status(OK).json({ details: { ...otherDetails } })
    } catch (err) {
        next(err)
    }
};

export const logoutAdmin = (req, res, next) => {
    res.clearCookie("access_token_admin")
        .status(OK)
        .json("Admin has been successfully logged out.");
};

export const registerInhaberByAdmin = async (req, res, next) => {
    const inhaber_department_name = req.body.department_name;
    try {
        const department = await DepartmentSchema.findOne({ name: inhaber_department_name });
        if (!department) return next(createError(NOT_FOUND, "Department not found!"))

        const salt = bcrypt.genSaltSync(10)
        const hash = bcrypt.hashSync(req.body.password, salt)
        const newInhaber = new AdminSchema({
            ...req.body,
            password: hash,
            role: "Inhaber",
            department_name: inhaber_department_name
        })
        await newInhaber.save()
        res.status(CREATED).json({
            success: true,
            status: CREATED,
            message: newInhaber,
        });
    } catch (err) {
        next(err)
    }
};

export const loginInhaber = async (req, res, next) => {
    try {
        const inhaber = await AdminSchema.findOne({ name: req.body.name });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"))
        const isPasswordCorrect = await bcrypt.compare(
            req.body.password,
            inhaber.password
        )
        if (!isPasswordCorrect) return next(createError(BAD_REQUEST, "Wrong password!"))
        const token_admin = jwt.sign(
            { id: inhaber.id, role: inhaber.role == "Inhaber" },
            process.env.JWT_ADMIN,
            { expiresIn: "24h" },
        )
        const { password, ...otherDetails } = inhaber._doc;
        res.cookie("access_token_admin", token_admin, {
            httpOnly: true,
            sameSite: "none",
            secure: true,
        }).status(OK).json({ details: { ...otherDetails } })
    } catch (err) {
        next(err)
    }
};

export const logoutInhaber = (req, res, next) => {
    res.clearCookie("access_token_admin")
        .status(OK)
        .json("Inhaber has been successfully logged out.");
};

export const registerManagerByAdmin = async (req, res, next) => {
    const manager_department_name = req.body.department_name;
    try {
        const department = await DepartmentSchema.findOne({ name: manager_department_name });
        if (!department) return next(createError(NOT_FOUND, "Department not found!"))

        const salt = bcrypt.genSaltSync(10)
        const hash = bcrypt.hashSync(req.body.password, salt)
        const newManager = new AdminSchema({
            ...req.body,
            password: hash,
            role: "Manager",
            department_name: manager_department_name
        })
        await newManager.save()
        res.status(CREATED).json({
            success: true,
            status: CREATED,
            message: newManager,
        });
    } catch (err) {
        next(err)
    }
};

export const registerManagerByInhaber = async (req, res, next) => {
    const inhaber_name = req.query.inhaber_name;
    const manager_department_name = req.body.department_name;

    try {
        const inhaber = await AdminSchema.findOne({ name: inhaber_name });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        if (inhaber.department_name !== manager_department_name) {
            return next(createError(FORBIDDEN, "Permission denied. Inhaber can only intervention an manager in their department."));
        }

        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(req.body.password, salt);

        const newManager = new AdminSchema({
            ...req.body,
            password: hash,
            role: "Manager",
            department_name: manager_department_name
        });
        await newManager.save();
        res.status(CREATED).json({
            success: true,
            status: CREATED,
            message: newManager,
        });

    } catch (err) {
        next(err);
    }
};

export const loginManager = async (req, res, next) => {
    try {
        const manager = await AdminSchema.findOne({ name: req.body.name });
        if (!manager) return next(createError(NOT_FOUND, "Manager not found!"))
        const isPasswordCorrect = await bcrypt.compare(
            req.body.password,
            manager.password
        )
        if (!isPasswordCorrect) return next(createError(BAD_REQUEST, "Wrong password!"))
        const token_admin = jwt.sign(
            { id: manager.id, role: manager.role == "Manager" },
            process.env.JWT_ADMIN,
            { expiresIn: "24h" },
        )
        const { password, ...otherDetails } = manager._doc;
        res.cookie("access_token_admin", token_admin, {
            httpOnly: true,
            sameSite: "none",
            secure: true,
        }).status(OK).json({ details: { ...otherDetails } })
    } catch (err) {
        next(err)
    }
};

export const logoutManager = (req, res, next) => {
    res.clearCookie("access_token_admin")
        .status(OK)
        .json("Manager has been successfully logged out.");
};

export const registerEmployeeByAdmin = async (req, res, next) => {
    const employee_department_name = req.body.department_name;

    try {
        const department = await DepartmentSchema.findOne({ name: employee_department_name });
        if (!department) return next(createError(NOT_FOUND, "Department not found!"));

        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(req.body.password, salt);

        const newEmployee = new EmployeeSchema({
            ...req.body,
            password: hash,
            department_name: employee_department_name
        });
        await newEmployee.save();
        res.status(CREATED).json({
            success: true,
            status: CREATED,
            message: newEmployee,
        });

    } catch (err) {
        next(err);
    }
};

export const registerEmployeeByInhaber = async (req, res, next) => {
    const inhaber_name = req.query.inhaber_name;
    const employee_department_name = req.body.department_name;

    try {
        const inhaber = await AdminSchema.findOne({ name: inhaber_name });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        if (inhaber.department_name !== employee_department_name) {
            return next(createError(FORBIDDEN, "Permission denied. Inhaber can only intervention an employee in their department."));
        }

        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(req.body.password, salt);

        const newEmployee = new EmployeeSchema({
            ...req.body,
            password: hash,
            department_name: employee_department_name,
        });
        await newEmployee.save();
        res.status(CREATED).json({
            success: true,
            status: CREATED,
            message: newEmployee,
        });

    } catch (err) {
        next(err);
    }
};

export const registerEmployeeByManager = async (req, res, next) => {
    const manager_name = req.query.manager_name;
    const employee_department_name = req.body.department_name;

    try {
        const manager = await AdminSchema.findOne({ name: manager_name });
        if (!manager) return next(createError(NOT_FOUND, "Manager not found!"));

        if (manager.department_name !== employee_department_name) {
            return next(createError(FORBIDDEN, "Permission denied. Manager can only intervention an employee in their department."));
        }

        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(req.body.password, salt);

        const newEmployee = new EmployeeSchema({
            ...req.body,
            password: hash,
            department_name: employee_department_name,
        });
        await newEmployee.save();
        res.status(CREATED).json({
            success: true,
            status: CREATED,
            message: newEmployee,
        });

    } catch (err) {
        next(err);
    }
};

export const loginEmployee = async (req, res, next) => {
    try {
        const employee = await EmployeeSchema.findOne({ name: req.body.name })
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))
        const isPasswordCorrect = await bcrypt.compare(
            req.body.password,
            employee.password
        )
        if (!isPasswordCorrect) return next(createError(BAD_REQUEST, "Wrong password!"))
        const token_employee = jwt.sign(
            { id: employee.id },
            process.env.JWT_EMPLOYEE,
            { expiresIn: "24h" },
        )
        // console.log(token_employee);
        const { password, ...otherDetails } = employee._doc;
        res.cookie("access_token_employee", token_employee, {
            httpOnly: true,
            sameSite: "none",
            secure: true,
        }).status(OK).json({ details: { ...otherDetails } })
    } catch (err) {
        next(err)
    }
};

export const logoutEmployee = (req, res, next) => {
    res.clearCookie("access_token_employee")
        .status(OK).
        json("Employee has been successfully logged out.");
};
