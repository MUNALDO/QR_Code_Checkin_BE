import { CREATED, NOT_FOUND, OK } from "../constant/HttpStatus.js";
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

        const updateGroup = await GroupSchema.findOneAndUpdate(
            group_code,
            { $set: req.body },
            { $new: true },
        )

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

        // Add the employee ID to the members array
        group.members.push(employeeID);

        // Save the updated group
        const updateGroup = await group.save();

        res.status(OK).json({
            success: true,
            status: OK,
            message: updateGroup,
        });
    } catch (err) {
        next(err);
    }
};

