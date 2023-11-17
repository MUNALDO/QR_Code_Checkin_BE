import { CREATED, FORBIDDEN, NOT_FOUND, OK } from "../constant/HttpStatus.js";
import EmployeeSchema from "../models/EmployeeSchema.js";
import GroupSchema from "../models/GroupSchema.js";
import ShiftSchema from "../models/ShiftSchema.js";

export const createGroup = async (req, res, next) => {
    const group_code = req.body.code; 
    const shift_design = req.body.shift_design;

    try {
        const group = await GroupSchema.findOne({ code: group_code });
        if (group) {
            res.status(FORBIDDEN).json("Group already exists");
            return;
        }

        const newGroup = new GroupSchema({
            code: group_code,
            name: req.body.name,
            shift_type: req.body.shift_type,
            shift_design: shift_design.map(day => ({
                date: day.date,
                shift_code: day.shift_code,
                time_range: [] 
            })),
        });

        for (const day of newGroup.shift_design) {
            const shift = await ShiftSchema.findOne({ code: day.shift_code });
            if (shift) {
                day.time_range = shift.time_range;
            }
        }

        await newGroup.save();
        res.status(CREATED).json(newGroup);
    } catch (err) {
        next(err);
    }
};

export const getAllGroups = async (req, res, next) => {
    try {
        const groups = await GroupSchema.find();
        if (!groups) {
            res.status(NOT_FOUND).json("Not Found any group");
        }

        res.status(OK).json(groups)
    } catch (err) {
        next(err);
    }
};

export const getGroupByCode = async (req, res, next) => {
    const group_code = req.query.code;
    try {
        const group = await GroupSchema.findOne({ code: group_code });
        if (!group) {
            res.status(NOT_FOUND).json("Not Found any group");
        }

        res.status(OK).json(group)
    } catch (err) {
        next(err);
    }
};

export const getGroupByName = async (req, res, next) => {
    const group_name = req.query.name;
    try {
        const group = await GroupSchema.findOne({ name: group_name });
        if (!group) {
            res.status(NOT_FOUND).json("Not Found any group");
        }

        res.status(OK).json(group)
    } catch (err) {
        next(err);
    }
};

export const updateGroup = async (req, res, next) => {
    const group_code = req.query.code;

    try {
        const group = await GroupSchema.findOne({ code: group_code });
        if (!group) {
            res.status(NOT_FOUND).json("Not Found any group");
        }

        const updateGroup = await GroupSchema.findOneAndUpdate(
            group_code,
            { $set: req.body },
            { $new: true },
        )

        await updateGroup.save();
        res.status(OK).json(updateGroup);
    } catch (err) {
        next(err);
    }
};

export const deleteGroupByCode = async (req, res, next) => {
    const group_code = req.query.code;

    try {
        const group = await GroupSchema.findOne({ code: group_code });
        if (!group) {
            res.status(NOT_FOUND).json("Not Found any group");
        }

        await GroupSchema.findOneAndDelete({ code: group_code });
        res.status(OK).json("Group deleted successfully");
    } catch (err) {
        next(err);
    }
};

export const addMemberGroup = async (req, res, next) => {
    const group_code = req.query.code;
    const employeeID = req.body.employeeID;

    try {
        const group = await GroupSchema.findOne({ code: group_code });

        if (!group) {
            res.status(NOT_FOUND).json("Not Found any group");
        }

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) {
            res.status(NOT_FOUND).json("Not Found any employee");
        }

        // Add the employee ID to the members array
        group.members.push(employeeID);

        // Save the updated group
        const updatedGroup = await group.save();

        res.status(OK).json(updatedGroup);
    } catch (err) {
        next(err);
    }
};

