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
        // Find the department to update
        const department = await DepartmentSchema.findOne({ name: department_name });
        if (!department) return next(createError(NOT_FOUND, "Department not found!"));

        // Update the department details
        Object.assign(department, req.body);
        await department.save();

        // Find employees who are members of this department
        const employees = await EmployeeSchema.find({ "department.name": department_name });

        for (const employee of employees) {
            // Update each employee's department data
            const departmentIndex = employee.department.findIndex(d => d.name === department_name);
            if (departmentIndex !== -1) {
                employee.department[departmentIndex] = {
                    ...employee.department[departmentIndex],
                    ...req.body,
                };
            }

            await employee.save();
        }

        res.status(OK).json({
            success: true,
            status: OK,
            message: department,
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
    const department_name = req.params.name;
    const employeeID = req.body.employeeID;
    try {
        const department = await DepartmentSchema.findOne({ name: department_name });
        if (!department) return next(createError(NOT_FOUND, "Department not found!"))

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))

        if (department.members.includes(employee)) return next(createError(CONFLICT, "Employee already exists in the department!"));
        const departmentObject = {
            name: department_name,
            position: req.body.position
        }

        // Add the employee ID to the members array
        department.members.push({
            id: employee.id,
            name: employee.name,
            email: employee.email,
            role: employee.role,
            position: departmentObject.position,
            status: employee.status
        });
        employee.department.push(departmentObject);

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

export const removeMemberDepartment = async (req, res, next) => {
    const department_name = req.params.name;
    const employeeID = req.body.employeeID;
    try {
        // Find the department
        const department = await DepartmentSchema.findOne({ name: department_name });
        if (!department) return next(createError(NOT_FOUND, "Department not found!"));

        // Find the employee
        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"));

        // Check if the employee is in the department
        if (!department.members.some(member => member.id === employeeID)) {
            return next(createError(NOT_FOUND, "Employee not a member of the department!"));
        }

        // Remove the employee from the department's members array
        department.members = department.members.filter(member => member.id !== employeeID);

        // Remove the department from the employee's department array
        employee.department = employee.department.filter(dep => dep.name !== department_name);

        // Save the updated department and employee
        const updatedDepartment = await department.save();
        const updatedEmployee = await employee.save();

        res.status(OK).json({
            success: true,
            status: OK,
            message: { updatedDepartment, updatedEmployee }
        });
    } catch (err) {
        next(err);
    }
};


