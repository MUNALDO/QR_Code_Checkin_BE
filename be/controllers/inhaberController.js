import { createError } from "../utils/error.js";
import { BAD_REQUEST, CONFLICT, CREATED, FORBIDDEN, NOT_FOUND, OK } from "../constant/HttpStatus.js";
import EmployeeSchema from "../models/EmployeeSchema.js";
import AttendanceSchema from "../models/AttendanceSchema.js";
import AdminSchema from "../models/AdminSchema.js";
import DateDesignSchema from "../models/DateDesignSchema.js";
import ShiftSchema from "../models/ShiftSchema.js";

export const updateEmployee = async (req, res, next) => {
    const inhaber_name = req.body.inhaber_name;
    const employeeID = req.query.employeeID;
    try {
        const inhaber = await AdminSchema.findOne({ name: inhaber_name });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))

        if (inhaber.department_name !== employee.department_name) {
            return next(createError(FORBIDDEN, "Permission denied. Inhaber can only intervention an employee in their department."));
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
    const inhaber_name = req.body.inhaber_name;
    const employeeID = req.query.employeeID;
    try {
        const inhaber = await AdminSchema.findOne({ name: inhaber_name });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))

        if (inhaber.department_name !== employee.department_name) {
            return next(createError(FORBIDDEN, "Permission denied. Inhaber can only intervention an employee in their department."));
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
    const inhaber_name = req.body.inhaber_name;
    try {
        const inhaber = await AdminSchema.findOne({ name: inhaber_name });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        const employee = await EmployeeSchema.find({ department_name: inhaber.department_name });
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
    const inhaber_name = req.body.inhaber_name;
    try {
        const inhaber = await AdminSchema.findOne({ name: inhaber_name });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        if (!query) {
            const employee = await EmployeeSchema.find({ department_name: inhaber.department_name });
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
            const filteredEmployees = employeeName.filter(employee => employee.department_name === inhaber.department_name);
            res.status(OK).json({
                success: true,
                status: OK,
                message: filteredEmployees,
            });
        } else if (employeeID.length !== 0) {
            const filteredEmployees = employeeID.filter(employee => employee.department_name === inhaber.department_name);
            res.status(OK).json({
                success: true,
                status: OK,
                message: filteredEmployees,
            });
        } else if (employeeRole.length !== 0) {
            const filteredEmployees = employeeRole.filter(employee => employee.department_name === inhaber.department_name);
            res.status(OK).json({
                success: true,
                status: OK,
                message: filteredEmployees,
            });
        } else if (employeePosition.length !== 0) {
            const filteredEmployees = employeePosition.filter(employee => employee.department_name === inhaber.department_name);
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
    const inhaber_name = req.body.inhaber_name;
    try {
        const inhaber = await AdminSchema.findOne({ name: inhaber_name });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))

        if (inhaber.department_name !== employee.department_name) {
            return next(createError(FORBIDDEN, "Permission denied. Inhaber can only intervention an employee in their department."));
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

export const createDateDesign = async (req, res, next) => {
    const inhaber_name = req.query.inhaber_name;
    const shiftCode = req.body.shift_code;
    const employeeID = req.body.employeeID;
    try {
        const inhaber = await AdminSchema.findOne({ name: inhaber_name });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        const shift = await ShiftSchema.findOne({ code: shiftCode });
        if (!shift) return next(createError(NOT_FOUND, "Shift not found!"))

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))

        if (inhaber.department_name !== employee.department_name) {
            return next(createError(FORBIDDEN, "Permission denied. Inhaber can only intervention an employee in their department."));
        }

        const existingDateInSchedules = employee.schedules.find(schedule => {
            return schedule.date.getTime() === new Date(req.body.date).getTime();
        });
        // console.log(existingDateInSchedules);

        if (!existingDateInSchedules) {
            // date not exists
            employee.schedules.push({
                date: req.body.date,
                shift_design: [{
                    shift_code: shift.code,
                    time_slot: shift.time_slot
                }]
            });
            await employee.save();
            res.status(CREATED).json({
                success: true,
                status: CREATED,
                message: employee,
            });
        } else {
            // date exists
            const existingShiftDesign = existingDateInSchedules.shift_design.find(design => {
                return design.shift_code === shiftCode
            });

            if (existingShiftDesign) {
                // Shift design already exists for the day
                res.status(BAD_REQUEST).json({
                    success: false,
                    status: BAD_REQUEST,
                    message: "Shift design already exists for the day"
                });
            } else {
                // If there is no existing shift_design with the same shiftCode, create a new shift_design
                existingDateInSchedules.shift_design.push({
                    shift_code: shift.code,
                    time_slot: shift.time_slot
                });
                await employee.save();
                res.status(CREATED).json({
                    success: true,
                    status: CREATED,
                    message: employee,
                });
            }
        }
    } catch (err) {
        next(err);
    }
};

export const addMemberDate = async (req, res, next) => {
    const inhaber_name = req.query.inhaber_name;
    const employeeID = req.body.employeeID;
    try {
        const date = await DateDesignSchema.findOne({ date: req.query.date });
        if (!date) return next(createError(NOT_FOUND, "Date not found!"));

        const inhaber = await AdminSchema.findOne({ name: inhaber_name });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))

        if (inhaber.department_name !== employee.department_name) {
            return next(createError(FORBIDDEN, "Permission denied. Inhaber can only intervention an employee in their department."));
        }

        if (date.members.some(member => member.id === employeeID)) {
            return next(createError(CONFLICT, "Employee already exists in the date!"));
        }
        date.members.push({
            id: employee.id,
            name: employee.name,
            email: employee.email,
            address: employee.address,
            dob: employee.dob,
            gender: employee.gender,
            department_name: employee.department_name,
            position: employee.position
        });
        employee.schedules.work_schedules.push({
            date: date.date,
            shift_design: date.shift_design
        });
        await date.save();
        await employee.save();
        res.status(OK).json({
            success: true,
            status: OK,
            message: date,
        });
    } catch (err) {
        next(err);
    }
};

export const removeMemberDate = async (req, res, next) => {
    const inhaber_name = req.query.inhaber_name;
    const employeeID = req.body.employeeID;
    try {
        const date = await DateDesignSchema.findOne({ date: req.query.date });
        if (!date) return next(createError(NOT_FOUND, "Date not found!"));

        const inhaber = await AdminSchema.findOne({ name: inhaber_name });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"));

        if (inhaber.department_name !== employee.department_name) {
            return next(createError(FORBIDDEN, "Permission denied. Inhaber can only intervene with an employee in their department."));
        }

        // Use $pull to remove the member with a specific ID from the array
        await DateDesignSchema.updateOne(
            { _id: date._id },
            { $pull: { members: { id: employee.id } } }
        );

        // Remove the corresponding entry from employee's schedules
        employee.schedules.work_schedules = employee.schedules.work_schedules.filter(
            (schedule) => schedule.date.toString() !== date.date.toString()
        );

        await date.save();
        await employee.save();

        res.status(OK).json({
            success: true,
            status: OK,
            message: date,
        });
    } catch (err) {
        next(err);
    }
};
