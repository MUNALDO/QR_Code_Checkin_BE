import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { createError } from "../utils/error.js";
import { BAD_REQUEST, CONFLICT, CREATED, NOT_FOUND, OK } from "../constant/HttpStatus.js";
import dotenv from 'dotenv';
import AdminSchema from "../models/AdminSchema.js";
import EmployeeSchema from "../models/EmployeeSchema.js";

dotenv.config();

export const registerAdmin = async (req, res, next) => {
    try {
        const salt = bcrypt.genSaltSync(10)
        const hash = bcrypt.hashSync(req.body.password, salt)
        const newAdmin = new AdminSchema({
            ...req.body,
            password: hash,
        })
        await newAdmin.save()
        res.status(CREATED).json("Admin has been created")
    } catch (err) {
        next(err)
    }
};

export const loginAdmin = async (req, res, next) => {
    try {
        const admin = await AdminSchema.findOne({ name: req.body.name })
        if (!admin) return next(createError(NOT_FOUND, "Admin not found!"))
        const isPasswordCorrect = await bcrypt.compare(
            req.body.password,
            admin.password
        )
        if (!isPasswordCorrect) return next(createError(BAD_REQUEST, "Wrong password!"))
        const token_admin = jwt.sign(
            { id: admin._id, role: admin.role == "admin" },
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
        .status(OK).
        json("Admin has been successfully logged out.");
};

export const addEmployee = async (req, res, next) => {
    const employeeID = req.body.employeeID;

    const existingEmployee = await EmployeeSchema.findOne({ id: employeeID });

    try {
        if (existingEmployee) {
            res.status(CONFLICT).json("Employee already exists", existingEmployee);
        } else {
            const newEmployee = new EmployeeSchema({
                id: employeeID,
                role: "employee",
                ...req.body,
            });
            await newEmployee.save();
            res.status(CREATED).json(newEmployee);
        }
    } catch (err) {
        next(err);
    }
};

export const getAllEmployees = async (req, res, next) => {
    try {
        const employee = await EmployeeSchema.find();
        res.status(OK).json(employee);
    } catch (err) {
        next(err);
    }
};

export const getEmployeeById = async (req, res, next) => {
    const employeeID = req.query.employeeID;
    try {
        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) {
            res.status(NOT_FOUND).json("Employee not found");
        }
        res.status(OK).json(employee);
    } catch (err) {
        next(err);
    }
};

export const getEmployeeByName = async (req, res, next) => {
    const employeeName = req.query.employeeName;
    try {
        const employee = await EmployeeSchema.find({ name: employeeName });
        if (!employee) {
            res.status(NOT_FOUND).json("Employee not found");
        }
        res.status(OK).json(employee);
    } catch (err) {
        next(err);
    }
};

export const createSchedule = async (req, res, next) => {
    const employeeID = req.query.employeeID;
    const newSchedule = req.body.newSchedule;

    try {
        const employee = await EmployeeSchema.findOne({ id: employeeID });

        if (!employee) {
            res.status(NOT_FOUND).json({ error: "Employee not found" });
            return;
        }

        const currentTime = new Date();
        const scheduleDate = new Date(newSchedule.date);

        if (scheduleDate <= currentTime) {
            res
                .status(BAD_REQUEST)
                .json("Cannot create a past time schedule");
            return;
        }

        const existingSchedule = employee.schedules.find(
            (schedule) =>
                schedule.date.toISOString() === scheduleDate.toISOString() &&
                schedule.shifts.some(
                    (shift) => shift.shift === newSchedule.shift && !shift.isChecked
                )
        );

        if (existingSchedule) {
            res
                .status(BAD_REQUEST)
                .json(`Shift '${newSchedule.shift}' already exists for ${newSchedule.date}`);
            return;
        }

        const newShift = {
            shift: newSchedule.shift,
            startTime: newSchedule.startTime,
            endTime: newSchedule.endTime,
            isBooked: false,
        };

        const scheduleToUpdate = employee.schedules.find(
            (schedule) =>
                schedule.date.toISOString() === scheduleDate.toISOString()
        );

        if (scheduleToUpdate) {
            scheduleToUpdate.shifts.push(newShift);
        } else {
            const newScheduleEntry = {
                date: scheduleDate,
                shifts: [newShift],
            };
            employee.schedules.push(newScheduleEntry);
        }

        const updatedEmployee = await employee.save();
        res.status(OK).json(updatedEmployee);
    } catch (err) {
        next(err);
    }
};

export const getEmployeeSchedule = async (req, res, next) => {
    const employeeID = req.query.employeeID;

    try {
        const employee = await EmployeeSchema.findOne({ id: employeeID });

        if (!employee) {
            res.status(NOT_FOUND).json({ error: "Employee not found" });
            return;
        }
        res.status(OK).json(employee.schedules);
    } catch (err) {
        next(err);
    }
};