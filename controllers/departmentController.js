import { CONFLICT, CREATED, NOT_FOUND, OK } from "../constant/HttpStatus.js";
import DepartmentSchema from "../models/DepartmentSchema.js";
import EmployeeSchema from "../models/EmployeeSchema.js";
import { createError } from "../utils/error.js";

export const createDepartment = async (req, res, next) => {
    try {
        const newDepartment = new DepartmentSchema({
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

export const getDepartmentSpecific = async (req, res, next) => {
    const query = req.query.query;
    try {
        if (!query) {
            const department = await DepartmentSchema.find();
            res.status(OK).json({
                success: true,
                status: OK,
                message: department,
            });
        }
        const regex = new RegExp(query, 'i');
        const departmentName = await DepartmentSchema.find({ name: regex });

        if (departmentName.length !== 0) {
            res.status(OK).json({
                success: true,
                status: OK,
                message: departmentName,
            });
        } else {
            res.status(OK).json({
                success: true,
                status: OK,
                message: [],
            });
        }
    } catch (err) {
        next(err);
    }
};

export const updateDepartment = async (req, res, next) => {
    const department_name = req.query.name;
    try {
        const department = await DepartmentSchema.findOne({ name: department_name });
        if (!department) return next(createError(NOT_FOUND, "Department not found!"))

        const employees = await EmployeeSchema.find({ department_name: department_name });
        if (!employees) return next(createError(NOT_FOUND, "Employee not found!"))

        const updateDepartment = await DepartmentSchema.findOneAndUpdate(
            { name: department_name },
            { $set: req.body },
            { $new: true },
        )

        for (const employee of employees) {
            employee.department_name = updateDepartment.name;
            await employee.save();
        }
        
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

export const deleteDepartmentByName = async (req, res, next) => {
    const department_name = req.query.name;
    try {
        const department = await DepartmentSchema.findOne({ name: department_name });
        if (!department) return next(createError(NOT_FOUND, "Department not found!"))

        await DepartmentSchema.findOneAndDelete({ name: department_name });
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
    const department_name = req.query.name;
    const employeeID = req.body.employeeID;
    try {
        const department = await DepartmentSchema.findOne({ name: department_name });
        if (!department) return next(createError(NOT_FOUND, "Department not found!"))

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))

        if (department.members.includes(employee)) return next(createError(CONFLICT, "Employee already exists in the department!"));

        // Add the employee ID to the members array
        department.members.push(employee);
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

