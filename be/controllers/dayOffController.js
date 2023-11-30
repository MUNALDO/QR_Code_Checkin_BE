import { CONFLICT, CREATED, NOT_FOUND, OK } from "../constant/HttpStatus.js";
import DayOffSchema from "../models/DayOffSchema.js";
import EmployeeSchema from "../models/EmployeeSchema.js";
import { createError } from "../utils/error.js";

export const createDayOff = async (req, res, next) => {
    const dayOff_code = req.body.code;

    try {
        const newDayOff = new DayOffSchema({
            code: dayOff_code,
            ...req.body
        });

        await newDayOff.save();
        res.status(CREATED).json({
            success: true,
            status: CREATED,
            message: newDayOff,
        });
    } catch (err) {
        next(err);
    }
};

export const getAllDaysOff = async (req, res, next) => {
    try {
        const days_off = await DayOffSchema.find();
        if (!days_off) return next(createError(NOT_FOUND, "Day off not found!"))

        res.status(OK).json({
            success: true,
            status: OK,
            message: days_off,
        });
    } catch (err) {
        next(err);
    }
};

export const getDayOffByCode = async (req, res, next) => {
    const dayOff_code = req.query.code;
    try {
        const day_off = await DayOffSchema.findOne({ code: dayOff_code });
        if (!day_off) return next(createError(NOT_FOUND, "Day off not found!"))

        res.status(OK).json({
            success: true,
            status: OK,
            message: day_off,
        });
    } catch (err) {
        next(err);
    }
};

export const getDayOffByName = async (req, res, next) => {
    const dayOff_name = req.query.name;
    try {
        const day_off = await DayOffSchema.findOne({ name: dayOff_name });
        if (!day_off) return next(createError(NOT_FOUND, "Day off not found!"))

        res.status(OK).json({
            success: true,
            status: OK,
            message: days_off,
        });
    } catch (err) {
        next(err);
    }
};

export const updateDayOff = async (req, res, next) => {
    const dayOff_code = req.query.code;

    try {
        const day_off = await DayOffSchema.findOne({ code: dayOff_code });
        if (!day_off) return next(createError(NOT_FOUND, "Day off not found!"))

        const employees = await EmployeeSchema.find({ day_off_code: dayOff_code });
        if (!employees) return next(createError(NOT_FOUND, "Employee not found!"))

        const updateDayOff = await DayOffSchema.findOneAndUpdate(
            { code: dayOff_code },
            { $set: req.body },
            { $new: true },
        )

        for (const employee of employees) {
            employee.day_off_code = updateDayOff.code;
            employee.schedules.forEach((schedule) => {
                schedule.dayOff_schedules = updateDayOff.dayOff_schedule;
            }); 
            await employee.save();
        }

        await updateDayOff.save();
        res.status(OK).json({
            success: true,
            status: OK,
            message: updateDayOff,
        });
    } catch (err) {
        next(err);
    }
};

export const deleteDayOffByCode = async (req, res, next) => {
    const dayOff_code = req.query.code;

    try {
        const day_off = await DayOffSchema.findOne({ code: dayOff_code });
        if (!day_off) return next(createError(NOT_FOUND, "Day off not found!"))

        await DayOffSchema.findOneAndDelete({ code: dayOff_code });
        res.status(OK).json({
            success: true,
            status: OK,
            message: "Day-Off was successfully deleted",
        });
    } catch (err) {
        next(err);
    }
};

export const addMemberDayOff = async (req, res, next) => {
    const dayOff_code = req.query.code;
    const employeeID = req.body.employeeID;

    try {
        const day_off = await DayOffSchema.findOne({ code: dayOff_code });
        if (!day_off) return next(createError(NOT_FOUND, "Day off not found!"))

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))

        if (day_off.members.includes(employeeID)) return next(createError(CONFLICT, "Employee already exists in the day off!"));

        // Add the employee ID to the members array
        day_off.members.push(employeeID);
        employee.day_off_code = dayOff_code;
        employee.schedules.push({ dayOff_schedules: day_off.dayOff_schedule })

        // Save the updated day_off
        const updateDayOff = await day_off.save();
        const updateEmployee = await employee.save();

        res.status(OK).json({
            success: true,
            status: OK,
            message: updateDayOff, updateEmployee
        });
    } catch (err) {
        next(err);
    }
};

export const addDayOffSchedule = async (req, res, next) => {
    const dayOffCode = req.query.code;
    const { date, type, name } = req.body;

    try {
        const dayOff = await DayOffSchema.findOne({ code: dayOffCode });
        if (!dayOff) return next(createError(NOT_FOUND, "Day off not found!"));

        const existingDate = dayOff.dayOff_schedule.find((schedule) => schedule.date === date);
        if (existingDate) return next(createError(CONFLICT, "Date already exists in day-off schedule!"));

        const employees = await EmployeeSchema.find({ day_off_code: dayOffCode });
        if (!employees) return next(createError(NOT_FOUND, "Employee not found!"));

        // Add the new schedule
        dayOff.dayOff_schedule.push({ date, type, name });
        const updatedDayOff = await dayOff.save();

        // Update each employee's schedules with the new day-off schedule
        for (const employee of employees) {
            employee.schedules.forEach((schedule) => {
                schedule.dayOff_schedules = updatedDayOff.dayOff_schedule;
            });
            await employee.save();
        }

        res.status(OK).json({
            success: true,
            status: OK,
            message: updatedDayOff,
            log: employees
        });
    } catch (err) {
        next(err);
    }
};

export const removeDayOffSchedule = async (req, res, next) => {
    const dayOffCode = req.query.code;
    const { date } = req.body;

    try {
        const dayOff = await DayOffSchema.findOne({ code: dayOffCode });
        if (!dayOff) return next(createError(NOT_FOUND, "Day off not found!"));

        const existingDate = dayOff.dayOff_schedule.find((schedule) => schedule.date === date);
        if (!existingDate) return next(createError(NOT_FOUND, "Date not exists in day-off schedule!"));

        const employees = await EmployeeSchema.find({ day_off_code: dayOffCode });
        if (!employees) return next(createError(NOT_FOUND, "Employee not found!"));

        // Add the new schedule
        dayOff.dayOff_schedule.pop(existingDate);
        const updatedDayOff = await dayOff.save();

        // Update each employee's schedules with the new day-off schedule
        for (const employee of employees) {
            employee.schedules.forEach((schedule) => {
                schedule.dayOff_schedules = updatedDayOff.dayOff_schedule;
            });
            await employee.save();
        }

        res.status(OK).json({
            success: true,
            status: OK,
            message: updatedDayOff,
            log: employees
        });
    } catch (err) {
        next(err);
    }
};