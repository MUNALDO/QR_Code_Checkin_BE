import { createError } from "../utils/error.js";
import { FORBIDDEN, NOT_FOUND, OK } from "../constant/HttpStatus.js";
import EmployeeSchema from "../models/EmployeeSchema.js";
import AttendanceSchema from "../models/AttendanceSchema.js";
import AdminSchema from "../models/AdminSchema.js";

export const updateEmployee = async (req, res, next) => {
    const manager_name = req.body.manager_name;
    const employeeID = req.query.employeeID;
    try {
        const manager = await AdminSchema.findOne({ name: manager_name });
        if (!manager) return next(createError(NOT_FOUND, "manager not found!"));

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))

        if (manager.department_name !== employee.department_name) {
            return next(createError(FORBIDDEN, "Permission denied. Manager can only update an employee in their department."));
        }

        const updateEmployee = await EmployeeSchema.findOneAndUpdate(
            { id: employeeID },
            { $set: req.body },
            { $new: true },
        )

        await updateEmployee.save();
        res.status(OK).json({
            success: true,
            status: OK,
            message: updateEmployee,
        });
    } catch (err) {
        next(err);
    }
};

export const deleteEmployeeById = async (req, res, next) => {
    const manager_name = req.body.manager_name;
    const employeeID = req.query.employeeID;
    try {
        const manager = await AdminSchema.findOne({ name: manager_name });
        if (!manager) return next(createError(NOT_FOUND, "Manager not found!"));

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))

        if (manager.department_name !== employee.department_name) {
            return next(createError(FORBIDDEN, "Permission denied. Manager can only delete an employee in their department."));
        }

        await EmployeeSchema.findOneAndDelete({ id: employeeID });
        res.status(OK).json({
            success: true,
            status: OK,
            message: "Employee deleted successfully",
        });
    } catch (err) {
        next(err);
    }
};

export const getAllEmployees = async (req, res, next) => {
    const manager_name = req.body.manager_name;
    try {
        const manager = await AdminSchema.findOne({ name: manager_name });
        if (!manager) return next(createError(NOT_FOUND, "Manager not found!"));

        const employee = await EmployeeSchema.find({ department_name: manager.department_name });
        if (!employee) return next(createError(NOT_FOUND, "Employees of this department not found!"))

        res.status(OK).json({
            success: true,
            status: OK,
            message: employee,
        });
    } catch (err) {
        next(err);
    }
};

export const getEmployeeSpecific = async (req, res, next) => {
    const query = req.query.query;
    const manager_name = req.body.manager_name;
    try {
        const manager = await AdminSchema.findOne({ name: manager_name });
        if (!manager) return next(createError(NOT_FOUND, "Manager not found!"));

        if (!query) {
            const employee = await EmployeeSchema.find({ department_name: manager.department_name });
            if (!employee) return next(createError(NOT_FOUND, "Employees of this department not found!"))

            res.status(OK).json({
                success: true,
                status: OK,
                message: employee,
            });
        }
        const regex = new RegExp(query, 'i');
        const employeeName = await EmployeeSchema.find({ name: regex });
        const employeeID = await EmployeeSchema.find({ id: regex });
        const employeeRole = await EmployeeSchema.find({ role: query });
        const employeePosition = await EmployeeSchema.find({ position: query });

        if (employeeName.length !== 0) {
            const filteredEmployees = employeeName.filter(employee => employee.department_name === manager.department_name);
            res.status(OK).json({
                success: true,
                status: OK,
                message: filteredEmployees,
            });
        } else if (employeeID.length !== 0) {
            const filteredEmployees = employeeID.filter(employee => employee.department_name === manager.department_name);
            res.status(OK).json({
                success: true,
                status: OK,
                message: filteredEmployees,
            });
        } else if (employeeRole.length !== 0) {
            const filteredEmployees = employeeRole.filter(employee => employee.department_name === manager.department_name);
            res.status(OK).json({
                success: true,
                status: OK,
                message: filteredEmployees,
            });
        } else if (employeePosition.length !== 0) {
            const filteredEmployees = employeePosition.filter(employee => employee.department_name === manager.department_name);
            res.status(OK).json({
                success: true,
                status: OK,
                message: filteredEmployees,
            });
        }

        res.status(OK).json({
            success: true,
            status: OK,
            message: [],
        });
    } catch (err) {
        next(err);
    }
};

export const getEmployeeSchedule = async (req, res, next) => {
    const employeeID = req.query.employeeID;
    const manager_name = req.body.manager_name;
    try {
        const manager = await AdminSchema.findOne({ name: manager_name });
        if (!manager) return next(createError(NOT_FOUND, "Manager not found!"));

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))

        if (manager.department_name !== employee.department_name) {
            return next(createError(FORBIDDEN, "Permission denied. Manager can only delete an employee in their department."));
        }

        res.status(OK).json({
            success: true,
            status: OK,
            message: employee.schedules,
        });
    } catch (err) {
        next(err);
    }
};

export const getAttendanceByTime = async (req, res, next) => {
    const year = req.query.year;
    const month = req.query.month;

    try {
        const query = {
            date: {
                $gte: new Date(year, month ? month - 1 : 0, 1, 0, 0, 0, 0),
                $lt: new Date(year, month ? month : 12, 1, 0, 0, 0, 0),
            },
        };

        const attendanceList = await AttendanceSchema.find(query);

        if (Array.isArray(attendanceList) && attendanceList.length === 0) {
            return res.status(NOT_FOUND).json({ error: "Cannot find attendance history" });
        }

        return res.status(OK).json({ success: 'Attendance found', attendanceList });
    } catch (err) {
        next(err);
    }
}

