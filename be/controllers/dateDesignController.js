import { CONFLICT, CREATED, NOT_FOUND, OK } from "../constant/HttpStatus.js";
import DateDesignSchema from "../models/DateDesignSchema.js";
import EmployeeSchema from "../models/EmployeeSchema.js";
import ShiftSchema from "../models/ShiftSchema.js";
import { createError } from "../utils/error.js";

export const createDateDesign = async (req, res, next) => {
    const shiftCode = req.body.shift_code;
    const employeeID = req.body.employeeID;
    try {
        const shift = await ShiftSchema.findOne({ code: shiftCode });
        if (!shift) return next(createError(NOT_FOUND, "Shift not found!"))

        // console.log(shift);

        const date = await DateDesignSchema.findOne({ date: req.body.date });
        if (!date) {
            const employee = await EmployeeSchema.findOne({ id: employeeID });
            if (employee) {
                const newDesign = new DateDesignSchema({
                    date: req.body.date,
                    shift_design: {
                        shift_code: shift.code,
                        time_slot: shift.time_slot
                    }
                });

                // Add the employee to the members array
                newDesign.members.push({
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
                    date: newDesign.date,
                    shift_design: newDesign.shift_design
                });
                await newDesign.save();
                await employee.save();
                res.status(CREATED).json({
                    success: true,
                    status: CREATED,
                    message: newDesign,
                });
            } else {
                const newDesign = new DateDesignSchema({
                    date: req.body.date,
                    shift_code: shiftCode,
                    time_slot: shift.time_slot
                });
                await newDesign.save();
                res.status(CREATED).json({
                    success: true,
                    status: CREATED,
                    message: newDesign,
                });
            }
        } else {
            const employee = await EmployeeSchema.findOne({ id: employeeID });
            if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))

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
        }
    } catch (err) {
        next(err);
    }
};

export const addMemberDate = async (req, res, next) => {
    const employeeID = req.body.employeeID;
    try {
        const date = await DateDesignSchema.findOne({ date: req.query.date });
        if (!date) return next(createError(NOT_FOUND, "Date not found!"));

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))

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
    const employeeID = req.body.employeeID;
    try {
        const date = await DateDesignSchema.findOne({ date: req.query.date });
        if (!date) return next(createError(NOT_FOUND, "Date not found!"));

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"));

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

export const getAllDates = async (req, res, next) => {
    try {
        const dates = await DateDesignSchema.find();
        if (!dates) return next(createError(NOT_FOUND, "Date design not found!"))

        res.status(OK).json({
            success: true,
            status: OK,
            message: dates,
        });
    } catch (err) {
        next(err);
    }
};

export const getDateSpecific = async (req, res, next) => {
    try {
        const date = await DateDesignSchema.findOne({ date: req.query.date });
        if (!date) return next(createError(NOT_FOUND, "Date not found!"))

        res.status(OK).json({
            success: true,
            status: OK,
            message: date,
        });
    } catch (err) {
        next(err);
    }
};

export const deleteDateSpecific = async (req, res, next) => {
    try {
        const date = await DateDesignSchema.findOne({ date: req.query.date });
        if (!date) return next(createError(NOT_FOUND, "Date not found!"))

        await DateDesignSchema.findOneAndDelete({ _id: id });
        res.status(OK).json({
            success: true,
            status: OK,
            message: "Date deleted successfully",
        });
    } catch (err) {
        next(err);
    }
};

