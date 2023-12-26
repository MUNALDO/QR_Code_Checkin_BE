import { BAD_REQUEST, NOT_FOUND, OK } from "../constant/HttpStatus.js";
import AttendanceSchema from "../models/AttendanceSchema.js";
import EmployeeSchema from "../models/EmployeeSchema.js";
import SalarySchema from "../models/SalarySchema.js";
import StatsSchema from "../models/StatsSchema.js";
import { createError } from "../utils/error.js";

export const salaryCalculate = async (req, res, next) => {
    const employeeID = req.params.employeeID;
    const year = parseInt(req.query.year);
    const month = parseInt(req.query.month);

    if (!year || !month || !employeeID) {
        return res.status(BAD_REQUEST).json({
            success: false,
            status: BAD_REQUEST,
            message: "Year, month, and employee ID are required parameters",
        });
    }

    const employee = await EmployeeSchema.findOne({ id: employeeID });
    if (!employee) return next(createError(NOT_FOUND, "Employee not found!"));
    if (employee.status === "inactive") return next(createError(NOT_FOUND, "Employee not active!"));

    let stats = await StatsSchema.findOne({
        employee_id: employeeID,
        year: year,
        month: month
    });

    let existSalary = await SalarySchema.findOne({
        employee_id: employeeID,
        year: year,
        month: month
    });

    // Initialize parameters for calculation
    let a = req.body.a_new;
    let b = req.body.b_new;
    let c = req.body.c_new;
    let d = req.body.d_new ?? 0.25;

    if (!a) {
        if (existSalary) {
            a = existSalary.a_parameter;
        } else {
            return res.status(BAD_REQUEST).json({
                success: false,
                status: BAD_REQUEST,
                message: "You need to provided a parameter",
            });
        }
    }

    if (!b) {
        if (existSalary) {
            b = existSalary.b_parameter;
        } else {
            return res.status(BAD_REQUEST).json({
                success: false,
                status: BAD_REQUEST,
                message: "You need to provided b parameter",
            });
        }
    }

    if (!c) {
        if (existSalary) {
            c = existSalary.c_parameter;
        } else {
            return res.status(BAD_REQUEST).json({
                success: false,
                status: BAD_REQUEST,
                message: "You need to provided c parameter",
            });
        }
    }

    // Define the date range for the whole month
    const dateRange = {
        $gte: new Date(year, month - 1, 1, 0, 0, 0, 0),
        $lt: new Date(year, month, 0, 23, 59, 59, 999),
    };

    // Find employee attendance for the specified date range
    const employeeAttendance = await AttendanceSchema.find({
        employee_id: employeeID,
        date: dateRange,
    });

    // Initialize the salary record
    let salaryRecord = {
        employee_id: employee.id,
        employee_name: employee.name,
        year: year,
        month: month,
        date_calculate: new Date(),
        total_salary: 0,
        total_times: stats.attendance_total_times + stats.attendance_overtime,
        day_off: employee.default_day_off - employee.realistic_day_off,
        hour_normal: [],
        total_hour_work: stats.attendance_total_times,
        total_hour_overtime: stats.attendance_overtime,
        total_km: 0,
        a_parameter: a,
        b_parameter: b,
        c_parameter: c,
        d_parameter: d
    };

    employeeAttendance.forEach(attendance => {
        const { department_name, shift_info, total_km } = attendance;
        const { total_hour, total_minutes } = shift_info;

        // Check if the employee has the position in the department for Autofahrer
        const isAutofahrer = employee.department.some(dep =>
            dep.name === department_name && dep.position.includes("Autofahrer")
        );

        if (isAutofahrer) {
            salaryRecord.total_km += total_km;
        }

        let departmentRecord = salaryRecord.hour_normal.find(dep => dep.department_name === department_name);
        if (!departmentRecord) {
            departmentRecord = {
                department_name: department_name,
                total_hour: 0,
                total_minutes: 0
            };
            salaryRecord.hour_normal.push(departmentRecord);
        }
        departmentRecord.total_hour += total_hour;
        departmentRecord.total_minutes += total_minutes;
    });

    // Calculate day-off salary
    const days_off = employee.default_day_off - employee.realistic_day_off;
    const salary_day_off = [(b * 3) / 65] * days_off;

    // Calculate total salary
    salaryRecord.total_salary = salaryRecord.total_times * a - b - c + salary_day_off - employee.house_rent_money + salaryRecord.total_km * d;

    await employee.save();
    // Save or update the salary record
    if (existSalary) {
        const updateSalary = await SalarySchema.findOneAndUpdate(
            { _id: existSalary._id },
            { $set: salaryRecord },
            { new: true }
        )
        return res.status(OK).json({
            success: true,
            status: OK,
            message: updateSalary
        });
    } else {
        // console.log(salaryRecord);
        const newSalary = new SalarySchema(salaryRecord);
        await newSalary.save();
        return res.status(OK).json({
            success: true,
            status: OK,
            message: newSalary
        });
    }
};

export const getSalary = async (req, res, next) => {
    try {
        const { year, month, employeeID, department_name } = req.query;

        let query = {};

        // Adding year and month to the query if they are provided
        if (year) {
            query.year = parseInt(year);
        }

        if (month) {
            query.month = parseInt(month);
        }

        // If department_name is provided, find all employees in that department
        let employeeIdsInDepartment = [];
        if (department_name) {
            const employees = await EmployeeSchema.find({'department.name': department_name}).select('id');
            employeeIdsInDepartment = employees.map(emp => emp.id);
        }

        // If employeeID is provided, add it to the query
        if (employeeID) {
            // Combine with department filter if both are provided
            if (employeeIdsInDepartment.length > 0) {
                query.employee_id = { $in: employeeIdsInDepartment, $eq: employeeID };
            } else {
                query.employee_id = employeeID;
            }
        } else if (employeeIdsInDepartment.length > 0) {
            // Only department filter is provided
            query.employee_id = { $in: employeeIdsInDepartment };
        }

        const salaries = await SalarySchema.find(query);

        if (salaries.length === 0) {
            return res.status(NOT_FOUND).json({
                success: false,
                status: NOT_FOUND,
                message: "No salary records found."
            });
        }

        return res.status(OK).json({
            success: true,
            status: OK,
            message: salaries
        });
    } catch (err) {
        next(err);
    }
};