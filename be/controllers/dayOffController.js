import { CONFLICT, CREATED, NOT_FOUND, OK } from "../constant/HttpStatus.js";
import DayOffSchema from "../models/DayOffSchema.js";
import EmployeeSchema from "../models/EmployeeSchema.js";
import { createError } from "../utils/error.js";

export const createDayOff = async (req, res, next) => {
    const date = req.body.date;
    const employeeID = req.query.employeeID;
    try {
        const newDayOff = new DayOffSchema({
            date: new Date(date),
            name: req.body.name,
            type: req.body.type,
        });

        const dateChecking = await DayOffSchema.findOne({
            date: newDayOff.date,
            type: newDayOff.type
        });
        if (dateChecking) return next(createError(CONFLICT, "Day Off is already exists!"));

        if (newDayOff.type === 'specific') {
            const employee = await EmployeeSchema.findOne({ id: employeeID });
            if (!employee) return next(createError(NOT_FOUND, "Employee not found!"));

            employee.dayOff_schedule.push({
                date: newDayOff.date,
                name: newDayOff.name,
                type: newDayOff.type
            });

            newDayOff.members.push({
                id: employee.id,
                name: employee.name,
                email: employee.email,
                department_name: employee.department_name,
                role: employee.role,
                position: employee.position,
                status: employee.status
            });

            await employee.save();
        } else if (newDayOff.type === 'global') {
            // Get information of all employees and add to the allowed field
            const employees = await EmployeeSchema.find();
            employees.forEach(employee => {
                newDayOff.members.push({
                    id: employee.id,
                    name: employee.name,
                    email: employee.email,
                    department_name: employee.department_name,
                    role: employee.role,
                    position: employee.position,
                    status: employee.status
                });

                // Add the new day off to all employees
                employee.dayOff_schedule.push({
                    date: newDayOff.date,
                    name: newDayOff.name,
                    type: newDayOff.type
                });
                employee.save();
            });
        }

        await newDayOff.save();
        return res.status(CREATED).json({
            success: true,
            status: CREATED,
            message: newDayOff,
        });
    } catch (err) {
        next(err);
    }
};

export const getAllGlobalDayOffs = async (req, res, next) => {
    try {
        const globalDayOffs = await DayOffSchema.find({ type: 'global' });
        if (!globalDayOffs) return next(createError(NOT_FOUND, "Day Off not found!"));

        return res.status(OK).json({
            success: true,
            status: OK,
            message: globalDayOffs,
        });
    } catch (err) {
        next(err);
    }
};

export const getDayOffById = async (req, res, next) => {
    try {
        const day_off = await DayOffSchema.findOne({ _id: req.params._id });
        if (!day_off) return next(createError(NOT_FOUND, "Day Off not found!"));

        return res.status(OK).json({
            success: true,
            status: OK,
            message: day_off,
        });
    } catch (err) {
        next(err);
    }
};

export const deleteDayOffById = async (req, res, next) => {
    try {
        const day_off = await DayOffSchema.findOneAndDelete({ _id: req.params._id });
        if (!day_off) return next(createError(NOT_FOUND, "Day Off not found!"));

        return res.status(OK).json({
            success: true,
            status: OK,
            message: "Day Off delete successfully!",
        });
    } catch (err) {
        next(err);
    }
};

export const getEmployeeDayOffs = async (req, res, next) => {
    const employeeID = req.query.employeeID;
    try {
        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return res.status(NOT_FOUND).json({
            success: false,
            status: NOT_FOUND,
            message: "Employee not found!",
        });

        return res.status(OK).json({
            success: true,
            status: OK,
            message: employee.dayOff_schedule,
        });
    } catch (err) {
        next(err);
    }
};

export const deleteEmployeeDayOff = async (req, res, next) => {
    const employeeID = req.query.employeeID;
    try {
        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return res.status(NOT_FOUND).json({
            success: false,
            status: NOT_FOUND,
            message: "Employee not found!",
        });

        const dayOffIndex = employee.dayOff_schedule.findIndex(dayOff => dayOff._id == req.params._id);
        if (dayOffIndex === -1) return res.status(NOT_FOUND).json({
            success: false,
            status: NOT_FOUND,
            message: "Day Off not found for the employee!",
        });

        employee.dayOff_schedule.splice(dayOffIndex, 1);
        await employee.save();

        return res.status(NO_CONTENT).json({
            success: true,
            status: NO_CONTENT,
            message: "Day Off deleted successfully!",
        });
    } catch (err) {
        next(err);
    }
};
