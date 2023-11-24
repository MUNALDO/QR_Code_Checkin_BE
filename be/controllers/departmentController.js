import { CONFLICT, CREATED, NOT_FOUND, OK } from "../constant/HttpStatus.js";
import DepartmentSchema from "../models/DepartmentSchema.js";
import EmployeeSchema from "../models/EmployeeSchema.js";
import { createError } from "../utils/error.js";

export const createDepartment = async (req, res, next) => {
    const department_code = req.body.code;

    try {
        const newDepartment = new DepartmentSchema({
            code: department_code,
            ...req.body,
        });

        await newDepartment.save();
        res.status(CREATED).json({
            success: true,
            status: CREATED,
            message: newDepartment,
        });
    } catch (err) {
        next(err);
    }
};

export const getAllDepartments = async (req, res, next) => {
    try {
        const departments = await DepartmentSchema.find();
        if (!departments) return next(createError(NOT_FOUND, "Department not found!"))

        res.status(OK).json(departments)
    } catch (err) {
        next(err);
    }
};

export const getDepartmentByCode = async (req, res, next) => {
    const department_code = req.query.code;
    try {
        const department = await DepartmentSchema.findOne({ code: department_code });
        if (!department) return next(createError(NOT_FOUND, "Department not found!"))

        res.status(OK).json({
            success: true,
            status: OK,
            message: department,
        });
    } catch (err) {
        next(err);
    }
};

export const getDepartmentByName = async (req, res, next) => {
    const department_name = req.query.name;
    try {
        const department = await DepartmentSchema.findOne({ name: department_name });
        if (!department) return next(createError(NOT_FOUND, "Department not found!"))

        res.status(OK).json({
            success: true,
            status: OK,
            message: department,
        });
    } catch (err) {
        next(err);
    }
};

export const updateDepartment = async (req, res, next) => {
    const department_code = req.query.code;

    try {
        const department = await DepartmentSchema.findOne({ code: department_code });
        if (!department) return next(createError(NOT_FOUND, "Department not found!"))

        const updateDepartment = await DepartmentSchema.findOneAndUpdate(
            department_code,
            { $set: req.body },
            { $new: true },
        )

        await updateDepartment.save();
        res.status(OK).json({
            success: true,
            status: OK,
            message: updateDepartment,
        });
    } catch (err) {
        next(err);
    }
};

export const deleteDepartmentByCode = async (req, res, next) => {
    const department_code = req.query.code;

    try {
        const department = await DepartmentSchema.findOne({ code: department_code });
        if (!department) return next(createError(NOT_FOUND, "Department not found!"))

        await DepartmentSchema.findOneAndDelete({ code: department_code });
        res.status(OK).json({
            success: true,
            status: OK,
            message: "Department was deleted successfully",
        });
    } catch (err) {
        next(err);
    }
};

export const addMemberDepartment = async (req, res, next) => {
    const department_code = req.query.code;
    const employeeID = req.body.employeeID;

    try {
        const department = await DepartmentSchema.findOne({ code: department_code });
        if (!department) return next(createError(NOT_FOUND, "Department not found!"))

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))

        if (department.members.includes(employeeID)) return next(createError(CONFLICT, "Employee already exists in the department!"));

        // Add the employee ID to the members array
        department.members.push(employeeID);
        employee.department_code = department_code;
        employee.department_name = department.name;

        // Save the updated department
        const updateDepartment = await department.save();
        const updateEmployee = await employee.save();

        res.status(OK).json({
            success: true,
            status: OK,
            message: updateDepartment, updateEmployee
        });
    } catch (err) {
        next(err);
    }
};

