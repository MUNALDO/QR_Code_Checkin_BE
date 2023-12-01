import { CONFLICT, CREATED, NOT_FOUND, OK } from "../constant/HttpStatus.js";
import DateDesignSchema from "../models/DateDesignSchema.js";
import EmployeeSchema from "../models/EmployeeSchema.js";
import ShiftSchema from "../models/ShiftSchema.js";
import { createError } from "../utils/error.js";

export const createDateDesign = async (req, res, next) => {
    const shiftCode = req.body.code;
    const employeeID = req.body.employeeID;

    try {
        const shift = await ShiftSchema.findOne({ code: shiftCode });
        if (!shift) return next(createError(NOT_FOUND, "Shift not found!"))

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))

        const newDesign = new DateDesignSchema({
            date: req.body.date,
            shift_code: shiftCode,
            time_slot: shift.time_slot
        });

        // Add the employee to the members array
        newDesign.members.push(employee);
        employee.schedules.push({
            work_schedules: {
                date: newDesign.date,
                shift_code: newDesign.shift_code,
                time_slot: newDesign.time_slot
            }
        });
        await newDesign.save();
        res.status(CREATED).json({
            success: true,
            status: CREATED,
            message: newDesign,
        });
    } catch (err) {
        next(err);
    }
};

export const addMemberDate = async (req, res, next) => {
    const date = req.query.date;
    const employeeID = req.body.employeeID;

    try {
        const dateDesign = await DateDesignSchema.findOne({ date: date });
        if (!dateDesign) return next(createError(NOT_FOUND, "Date design not found!"))

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))

        if (dateDesign.members.includes(employee)) return next(createError(CONFLICT, "Employee already exists in the date design!"));

        // Add the employee to the members array
        dateDesign.members.push(employee);
        // console.log(employee.schedules);
        employee.schedules.push({
            work_schedules: {
                date: dateDesign.date,
                shift_code: dateDesign.shift_code,
                time_slot: dateDesign.time_slot
            }
        });

        // Save the updated group
        const updateDate = await DateDesignSchema.save();
        const updateEmployee = await employee.save();

        res.status(OK).json({
            success: true,
            status: OK,
            message: updateDate, updateEmployee
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

export const getDateById = async (req, res, next) => {
    const id = req.query.id;
    try {
        const date = await DateDesignSchema.findOne({ _id: id });
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

export const updateDate = async (req, res, next) => {
    const id = req.query.id;

    try {
        const date = await DateDesignSchema.findOne({ _id: id });
        if (!date) return next(createError(NOT_FOUND, "Date not found!"))

        const employees = await EmployeeSchema.find({ grouped_work_code: group_code });
        if (!employees) return next(createError(NOT_FOUND, "Employee not found!"))

        const updateGroup = await GroupSchema.findOneAndUpdate(
            { code: group_code },
            { $set: req.body },
            { $new: true },
        )

        for (const employee of employees) {
            employee.grouped_work_code = updateGroup.code;
            employee.schedules.forEach((schedule) => {
                schedule.work_schedules = updateGroup.shift_design;
            });
            await employee.save();
        }

        await updateGroup.save();
        res.status(OK).json({
            success: true,
            status: OK,
            message: updateGroup,
        });
    } catch (err) {
        next(err);
    }
};

export const deleteDateById = async (req, res, next) => {
    const id = req.query.id;

    try {
        const date = await DateDesignSchema.findOne({ _id: id });
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

