import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { createError } from "../utils/error.js";
import { BAD_REQUEST, CONFLICT, CREATED, NOT_FOUND, OK } from "../constant/HttpStatus.js";
import dotenv from 'dotenv';
import AdminSchema from "../models/AdminSchema.js";
import EmployeeSchema from "../models/EmployeeSchema.js";
import DepartmentSchema from "../models/DepartmentSchema.js";
import DayOffSchema from "../models/DayOffSchema.js";

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
        const admin = await AdminSchema.findOne({ name: newAdmin.name });
        if (admin) return next(createError(CONFLICT, "Admin is already exists!"))

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
        const admin = await AdminSchema.findOne({
            name: req.body.name,
            role: "Admin"
        });
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
        const inhaber = await AdminSchema.findOne({ name: newInhaber.name });
        if (inhaber) return next(createError(CONFLICT, "Inhaber is already exists!"))
        if (department.members.some(member => member.name === newInhaber.name)) {
            return next(createError(CONFLICT, "This Inhaber already exists in the department!"));
        }
        department.members.push({
            id: newInhaber.id,
            name: newInhaber.name,
            email: newInhaber.email,
            department_name: newInhaber.department_name,
            role: newInhaber.role,
            status: newInhaber.status
        });
        await department.save();
        await newInhaber.save();
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
        const inhaber = await AdminSchema.findOne({
            name: req.body.name,
            role: "Inhaber"
        });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"))
        const isPasswordCorrect = await bcrypt.compare(
            req.body.password,
            inhaber.password
        )
        if (!isPasswordCorrect) return next(createError(BAD_REQUEST, "Wrong password!"))
        const token_inhaber = jwt.sign(
            { id: inhaber.id, role: inhaber.role == "Inhaber" },
            process.env.JWT_INHABER,
            { expiresIn: "24h" },
        )
        const { password, ...otherDetails } = inhaber._doc;
        res.cookie("access_token_inhaber", token_inhaber, {
            httpOnly: true,
            sameSite: "none",
            secure: true,
        }).status(OK).json({ details: { ...otherDetails } })
    } catch (err) {
        next(err)
    }
};

export const logoutInhaber = (req, res, next) => {
    res.clearCookie("access_token_inhaber")
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
        const manager = await AdminSchema.findOne({ name: newManager.name });
        if (manager) return next(createError(CONFLICT, "Manager is already exists!"))
        if (department.members.some(member => member.name === newManager.name)) {
            return next(createError(CONFLICT, "This Manager already exists in the department!"));
        }
        department.members.push({
            id: newManager.id,
            name: newManager.name,
            email: newManager.email,
            department_name: newManager.department_name,
            role: newManager.role,
            status: newManager.status
        });
        await department.save();
        await newManager.save();
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

    try {
        const inhaber = await AdminSchema.findOne({ name: inhaber_name });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        const department = await DepartmentSchema.findOne({ name: inhaber.department_name });
        if (!department) return next(createError(NOT_FOUND, "Department not found!"))

        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(req.body.password, salt);

        const newManager = new AdminSchema({
            ...req.body,
            password: hash,
            role: "Manager",
            department_name: inhaber.department_name
        });
        const manager = await AdminSchema.findOne({ name: newManager.name });
        if (manager) return next(createError(CONFLICT, "Manager is already exists!"))
        if (department.members.some(member => member.name === newManager.name)) {
            return next(createError(CONFLICT, "This Manager already exists in the department!"));
        }
        department.members.push({
            id: newManager.id,
            name: newManager.name,
            email: newManager.email,
            department_name: newManager.department_name,
            role: newManager.role,
            status: newManager.status
        });
        await department.save();
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
        const manager = await AdminSchema.findOne({
            name: req.body.name,
            role: "Manager"
        });
        if (!manager) return next(createError(NOT_FOUND, "Manager not found!"))
        const isPasswordCorrect = await bcrypt.compare(
            req.body.password,
            manager.password
        )
        if (!isPasswordCorrect) return next(createError(BAD_REQUEST, "Wrong password!"))
        const token_manager = jwt.sign(
            { id: manager.id, role: manager.role == "Manager" },
            process.env.JWT_MANAGER,
            { expiresIn: "24h" },
        )
        const { password, ...otherDetails } = manager._doc;
        res.cookie("access_token_manager", token_manager, {
            httpOnly: true,
            sameSite: "none",
            secure: true,
        }).status(OK).json({ details: { ...otherDetails } })
    } catch (err) {
        next(err)
    }
};

export const logoutManager = (req, res, next) => {
    res.clearCookie("access_token_manager")
        .status(OK)
        .json("Manager has been successfully logged out.");
};

export const registerEmployeeByAdmin = async (req, res, next) => {
    const employee_department_name = req.body.department_name;
    try {
        const department = await DepartmentSchema.findOne({ name: employee_department_name });
        if (!department) return next(createError(NOT_FOUND, "Department not found!"));

        if (department.members.some(member => member.name === req.body.name)) {
            return next(createError(CONFLICT, "This Employee already exists in the department!"));
        }

        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(req.body.password, salt);

        const newEmployee = new EmployeeSchema({
            ...req.body,
            password: hash,
            department_name: employee_department_name
        });

        department.members.push({
            id: newEmployee.id,
            name: newEmployee.name,
            email: newEmployee.email,
            department_name: newEmployee.department_name,
            role: newEmployee.role,
            position: newEmployee.position,
            status: newEmployee.status
        });

        const globalDayOffs = await DayOffSchema.find({ type: 'global' });
        globalDayOffs.forEach(globalDayOff => {
            newEmployee.dayOff_schedule.push({
                date_start: globalDayOff.date_start,
                date_end: globalDayOff.date_end,
                duration: globalDayOff.duration,
                name: globalDayOff.name,
                type: globalDayOff.type,
                allowed: globalDayOff.allowed
            });

            globalDayOff.members.push({
                id: newEmployee.id,
                name: newEmployee.name,
                email: newEmployee.email,
                department_name: newEmployee.department_name,
                role: newEmployee.role,
                position: newEmployee.position,
                status: newEmployee.status
            });
            globalDayOff.save();
        })

        newEmployee.realistic_day_off = newEmployee.default_day_off;
        await department.save();
        await newEmployee.save();

        return res.status(CREATED).json({
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
    try {
        const inhaber = await AdminSchema.findOne({ name: inhaber_name });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        const department = await DepartmentSchema.findOne({ name: inhaber.department_name });
        if (!department) return next(createError(NOT_FOUND, "Department not found!"));

        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(req.body.password, salt);

        const newEmployee = new EmployeeSchema({
            ...req.body,
            password: hash,
            department_name: inhaber.department_name,
        });
        const employee = await EmployeeSchema.findOne({ name: newEmployee.name });
        if (employee) return next(createError(CONFLICT, "Employee is already exists!"))

        if (department.members.some(member => member.name === newEmployee.name)) {
            return next(createError(CONFLICT, "This Employee already exists in the department!"));
        }
        department.members.push({
            id: newEmployee.id,
            name: newEmployee.name,
            email: newEmployee.email,
            department_name: newEmployee.department_name,
            role: newEmployee.role,
            position: newEmployee.position,
            status: newEmployee.status
        });
        const globalDayOffs = await DayOffSchema.find({ type: 'global' });
        globalDayOffs.forEach(globalDayOff => {
            newEmployee.dayOff_schedule.push({
                date_start: globalDayOff.date_start,
                date_end: globalDayOff.date_end,
                duration: globalDayOff.duration,
                name: globalDayOff.name,
                type: globalDayOff.type,
                allowed: globalDayOff.allowed
            });

            globalDayOff.members.push({
                id: newEmployee.id,
                name: newEmployee.name,
                email: newEmployee.email,
                department_name: newEmployee.department_name,
                role: newEmployee.role,
                position: newEmployee.position,
                status: newEmployee.status
            });
            globalDayOff.save();
        })

        newEmployee.realistic_day_off = newEmployee.default_day_off;
        await department.save();
        await newEmployee.save();

        return res.status(CREATED).json({
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
    try {
        const manager = await AdminSchema.findOne({ name: manager_name });
        if (!manager) return next(createError(NOT_FOUND, "Manager not found!"));

        const department = await DepartmentSchema.findOne({ name: manager.department_name });
        if (!department) return next(createError(NOT_FOUND, "Department not found!"));

        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(req.body.password, salt);

        const newEmployee = new EmployeeSchema({
            ...req.body,
            password: hash,
            department_name: manager.department_name,
        });
        const employee = await EmployeeSchema.findOne({ name: newEmployee.name });
        if (employee) return next(createError(CONFLICT, "Employee is already exists!"))

        if (department.members.some(member => member.name === newEmployee.name)) {
            return next(createError(CONFLICT, "This Employee already exists in the department!"));
        }
        department.members.push({
            id: newEmployee.id,
            name: newEmployee.name,
            email: newEmployee.email,
            department_name: newEmployee.department_name,
            role: newEmployee.role,
            position: newEmployee.position,
            status: newEmployee.status
        });
        const globalDayOffs = await DayOffSchema.find({ type: 'global' });
        globalDayOffs.forEach(globalDayOff => {
            newEmployee.dayOff_schedule.push({
                date_start: globalDayOff.date_start,
                date_end: globalDayOff.date_end,
                duration: globalDayOff.duration,
                name: globalDayOff.name,
                type: globalDayOff.type,
                allowed: globalDayOff.allowed
            });

            globalDayOff.members.push({
                id: newEmployee.id,
                name: newEmployee.name,
                email: newEmployee.email,
                department_name: newEmployee.department_name,
                role: newEmployee.role,
                position: newEmployee.position,
                status: newEmployee.status
            });
            globalDayOff.save();
        })

        newEmployee.realistic_day_off = newEmployee.default_day_off;
        await department.save();
        await newEmployee.save();

        return res.status(CREATED).json({
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
            secure: false,
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
