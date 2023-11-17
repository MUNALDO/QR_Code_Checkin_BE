import { CREATED, FORBIDDEN, NOT_FOUND, OK } from "../constant/HttpStatus.js";
import DepartmentSchema from "../models/DepartmentSchema.js";
import EmployeeSchema from "../models/EmployeeSchema.js";

export const createDepartment = async (req, res, next) => {
    const department_code = req.body.code;

    try {
        const department = await DepartmentSchema.findOne({ code: department_code });
        if (department) {
            res.status(FORBIDDEN).json("Department already exists", department);
        }

        const newDepartment = new DepartmentSchema({
            code: department_code,
            ...req.body,
        });

        await newDepartment.save();
        res.status(CREATED).json(newDepartment);
    } catch (err) {
        next(err);
    }
};

export const getAllDepartments = async (req, res, next) => {
    try {
        const departments = await DepartmentSchema.find();
        if (!departments) {
            res.status(NOT_FOUND).json("Not Found any department");
        }

        res.status(OK).json(departments)
    } catch (err) {
        next(err);
    }
};

export const getDepartmentByCode = async (req, res, next) => {
    const department_code = req.query.code;
    try {
        const department = await DepartmentSchema.findOne({ code: department_code });
        if (!department) {
            res.status(NOT_FOUND).json("Not Found any department");
        }

        res.status(OK).json(department)
    } catch (err) {
        next(err);
    }
};

export const getDepartmentByName = async (req, res, next) => {
    const department_name = req.query.name;
    try {
        const department = await DepartmentSchema.findOne({ name: department_name });
        if (!department) {
            res.status(NOT_FOUND).json("Not Found any department");
        }

        res.status(OK).json(department)
    } catch (err) {
        next(err);
    }
};

export const updateDepartment = async (req, res, next) => {
    const department_code = req.query.code;

    try {
        const department = await DepartmentSchema.findOne({ code: department_code });
        if (!department) {
            res.status(NOT_FOUND).json("Not Found any department");
        }

        const updateDepartment = await DepartmentSchema.findOneAndUpdate(
            department_code,
            { $set: req.body },
            { $new: true },
        )

        await updateDepartment.save();
        res.status(OK).json(updateDepartment);
    } catch (err) {
        next(err);
    }
};

export const deleteDepartmentByCode = async (req, res, next) => {
    const department_code = req.query.code;

    try {
        const department = await DepartmentSchema.findOne({ code: department_code });
        if (!department) {
            res.status(NOT_FOUND).json("Not Found any department");
        }

        await DepartmentSchema.findOneAndDelete({ code: department_code });
        res.status(OK).json("Department deleted successfully");
    } catch (err) {
        next(err);
    }
};

export const addMemberDepartment = async (req, res, next) => {
    const department_code = req.query.code;
    const employeeID = req.body.employeeID;

    try {
        const department = await DepartmentSchema.findOne({ code: department_code });

        if (!department) {
            res.status(NOT_FOUND).json("Not Found any department");
        }

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) {
            res.status(NOT_FOUND).json("Not Found any employee");
        }

        // Add the employee ID to the members array
        department.members.push(employeeID);

        // Save the updated department
        const updatedDepartment = await department.save();

        res.status(OK).json(updatedDepartment);
    } catch (err) {
        next(err);
    }
};

