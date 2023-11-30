import { CONFLICT, CREATED, NOT_FOUND, OK } from "../constant/HttpStatus.js";
import EmployeeSchema from "../models/EmployeeSchema.js";
import GroupSchema from "../models/GroupSchema.js";
import ShiftSchema from "../models/ShiftSchema.js";
import { createError } from "../utils/error.js";

export const createGroup = async (req, res, next) => {
    const group_code = req.body.code;
    const shift_design = req.body.shift_design;

    try {
        const newGroup = new GroupSchema({
            code: group_code,
            name: req.body.name,
            shift_type: req.body.shift_type,
            shift_design: shift_design.map(day => ({
                date: day.date,
                shift_code: day.shift_code,
                // time_slot
            })),
        });

        // Populate time_slot based on the shift_code
        for (const day of newGroup.shift_design) {
            const shift = await ShiftSchema.findOne({ code: day.shift_code });
            if (shift) {
                // console.log(shift.time_slot);
                day.time_slot = shift.time_slot;
            }
        }

        await newGroup.save();
        res.status(CREATED).json({
            success: true,
            status: CREATED,
            message: newGroup,
        });
    } catch (err) {
        next(err);
    }
};

export const getAllGroups = async (req, res, next) => {
    try {
        const groups = await GroupSchema.find();
        if (!groups) return next(createError(NOT_FOUND, "Group not found!"))

        res.status(OK).json({
            success: true,
            status: OK,
            message: groups,
        });
    } catch (err) {
        next(err);
    }
};

export const getGroupByCode = async (req, res, next) => {
    const group_code = req.query.code;
    try {
        const group = await GroupSchema.findOne({ code: group_code });
        if (!group) return next(createError(NOT_FOUND, "Group not found!"))

        res.status(OK).json({
            success: true,
            status: OK,
            message: group,
        });
    } catch (err) {
        next(err);
    }
};

export const getGroupByName = async (req, res, next) => {
    const group_name = req.query.name;
    try {
        const group = await GroupSchema.findOne({ name: group_name });
        if (!group) return next(createError(NOT_FOUND, "Group not found!"))

        res.status(OK).json({
            success: true,
            status: OK,
            message: group,
        });
    } catch (err) {
        next(err);
    }
};

export const updateGroup = async (req, res, next) => {
    const group_code = req.query.code;

    try {
        const group = await GroupSchema.findOne({ code: group_code });
        if (!group) return next(createError(NOT_FOUND, "Group not found!"))

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

export const deleteGroupByCode = async (req, res, next) => {
    const group_code = req.query.code;

    try {
        const group = await GroupSchema.findOne({ code: group_code });
        if (!group) return next(createError(NOT_FOUND, "Group not found!"))

        await GroupSchema.findOneAndDelete({ code: group_code });
        res.status(OK).json({
            success: true,
            status: OK,
            message: "Group deleted successfully",
        });
    } catch (err) {
        next(err);
    }
};

export const addMemberGroup = async (req, res, next) => {
    const group_code = req.query.code;
    const employeeID = req.body.employeeID;

    try {
        const group = await GroupSchema.findOne({ code: group_code });
        if (!group) return next(createError(NOT_FOUND, "Group not found!"))

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))

        if (group.members.includes(employeeID)) return next(createError(CONFLICT, "Employee already exists in the group!"));

        // Add the employee ID to the members array
        group.members.push(employeeID);
        employee.grouped_work_code = group_code;
        // console.log(employee.schedules);
        employee.schedules.push({ work_schedules: group.shift_design });

        // Save the updated group
        const updateGroup = await group.save();
        const updateEmployee = await employee.save();

        res.status(OK).json({
            success: true,
            status: OK,
            message: updateGroup, updateEmployee
        });
    } catch (err) {
        next(err);
    }
};

export const addWorkSchedule = async (req, res, next) => {
    const groupCode = req.query.code;
    const { date, shift_code } = req.body;

    try {
        const group = await GroupSchema.findOne({ code: groupCode });
        if (!group) return next(createError(NOT_FOUND, "Group not found!"));

        const existingDate = group.shift_design.find((schedule) => schedule.date === date);
        if (existingDate) return next(createError(CONFLICT, "Date already exists in shift design!"));

        const employees = await EmployeeSchema.find({ grouped_work_code: groupCode });
        if (!employees) return next(createError(NOT_FOUND, "Employee not found!"));

        const shift = await ShiftSchema.findOne({ code: day.shift_code });
        if (!shift) return next(createError(NOT_FOUND, "Shift not found!"));

        // Add the new schedule
        group.shift_design.push({ date, shift_code });
        for (const day of group.shift_design) {
            // console.log(shift.time_slot);
            day.time_slot = shift.time_slot;
        }
        const updatedWorkSchedule = await group.save();

        // Update each employee's schedules with the new group schedule
        for (const employee of employees) {
            employee.schedules.forEach((schedule) => {
                schedule.work_schedules = updatedWorkSchedule.shift_design;
            });
            await employee.save();
        }

        res.status(OK).json({
            success: true,
            status: OK,
            message: updatedWorkSchedule,
            log: employees
        });
    } catch (err) {
        next(err);
    }
};

export const removeWorkSchedule = async (req, res, next) => {
    const groupCode = req.query.code;
    const { date } = req.body;

    try {
        const group = await GroupSchema.findOne({ code: groupCode });
        if (!group) return next(createError(NOT_FOUND, "Group not found!"));

        const existingDate = dayOff.dayOff_schedule.find((schedule) => schedule.date === date);
        if (!existingDate) return next(createError(NOT_FOUND, "Date not exists in shift design!"));

        const employees = await EmployeeSchema.find({ grouped_work_code: groupCode });
        if (!employees) return next(createError(NOT_FOUND, "Employee not found!"));

        group.shift_design.pop(existingDate);
        const updatedWorkSchedule = await group.save();

        // Update each employee's schedules with the new day-off schedule
        for (const employee of employees) {
            employee.schedules.forEach((schedule) => {
                schedule.work_schedules = updatedWorkSchedule.shift_design;
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