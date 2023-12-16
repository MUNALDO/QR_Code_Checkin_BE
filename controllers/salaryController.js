import { BAD_REQUEST, NOT_FOUND, OK } from "../constant/HttpStatus.js";
import AttendanceSchema from "../models/AttendanceSchema.js";
import EmployeeSchema from "../models/EmployeeSchema.js";
import { createError } from "../utils/error.js";

export const salaryCalculate = async (req, res, next) => {
    const employeeID = req.params.employeeID;
    const year = parseInt(req.query.year);
    const month = parseInt(req.query.month);
    const date = req.query.date;

    if (!year || !month || !employeeID) {
        return res.status(BAD_REQUEST).json({
            success: false,
            status: BAD_REQUEST,
            message: "Year, month, and employee ID are required parameters",
        });
    }

    const employee = await EmployeeSchema.findOne({ id: employeeID });
    if (!employee) {
        return next(createError(NOT_FOUND, "Employee not found!"));
    }

    const existStat = employee.salary.find(stat => stat.year === year && stat.month === month);
    let a = req.body.a_new ?? 0;
    let b = req.body.b_new ?? 0;
    let c = req.body.c_new ?? 0;
    let d = req.body.d_new ?? 0.25;

    if (existStat) {
        a = a ?? existStat.a_parameter;
        b = b ?? existStat.b_parameter;
        c = c ?? existStat.c_parameter;
        d = d ?? existStat.d_parameter;
    } else if (employee.salary.length === 0) {
        a = a;
        b = b;
        c = c;
        d = d;
    } else {
        const latestSalary = employee.salary[employee.salary.length - 1];
        a = a ?? latestSalary.a_parameter;
        b = b ?? latestSalary.b_parameter;
        c = c ?? latestSalary.c_parameter;
        d = d ?? latestSalary.d_parameter;
    }

    // Define the date range based on the presence of the date parameter
    const dateRange = date
        ? {
            $gte: new Date(year, month - 1, date, 0, 0, 0, 0),
            $lt: new Date(year, month - 1, date, 23, 59, 59, 999),
        }
        : {
            $gte: new Date(year, month - 1, 1, 0, 0, 0, 0),
            $lt: new Date(year, month, 0, 23, 59, 59, 999),
        };

    // Find employee attendance for the specified date range
    const employeeAttendance = await AttendanceSchema.find({
        employee_id: employeeID,
        date: dateRange,
    });

    // Initialize variables to calculate hours
    let hourNormal = 0;
    let hourOvertime = 0;
    let kmNumber = 0;

    // Calculate hours based on attendance data
    employeeAttendance.forEach(attendance => {
        const totalKm = attendance.total_km;
        kmNumber += totalKm;
        const totalHour = attendance.shift_info.total_hour;
        const totalMinutes = attendance.shift_info.total_minutes / 60;
        if (attendance.shift_info.shift_type === "normal") {
            hourNormal += totalHour + totalMinutes;
        } else if (attendance.shift_info.shift_type === "overtime") {
            hourOvertime += totalHour + totalMinutes;
        }
    });

    // day-off salary calculation
    const days_off = employee.default_day_off - employee.realistic_day_off;
    const salary_day_off = [(b * 3) / 65] * days_off;

    const salary = (hourNormal + hourOvertime) * a - b - c + salary_day_off - employee.house_rent_money + kmNumber * d;

    if (existStat) {
        existStat.date_calculate = new Date();
        existStat.total_salary = salary;
        existStat.hour_normal = hourNormal;
        existStat.hour_overtime = hourOvertime;
        existStat.a_parameter = a;
        existStat.b_parameter = b;
        existStat.c_parameter = c;
        existStat.d_parameter = d;

        await employee.save();
        return res.status(OK).json({
            success: true,
            status: OK,
            message: existStat
        });
    } else {
        // Create new salary record
        const newSalary = {
            year: year,
            month: month,
            date_calculate: new Date(),
            hour_normal: hourNormal,
            hour_overtime: hourOvertime,
            total_salary: salary,
            a_parameter: a,
            b_parameter: b,
            c_parameter: c,
            d_parameter: d
        };
        employee.salary.push(newSalary);
        await employee.save();
        return res.status(OK).json({
            success: true,
            status: OK,
            message: newSalary
        });
    }
};

export const getSalaryForEmployee = async (req, res, next) => {
    try {
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

        const salary = employee.salary.find(stat =>
            stat.year === year && stat.month === month
        );

        const objectReturn = {
            employee_id: employee.id,
            employee_name: employee.name,
            email: employee.email,
            department_name: employee.department_name,
            role: employee.role,
            position: employee.position,
            salary: salary
        }

        if (salary) {
            return res.status(OK).json({
                success: true,
                status: OK,
                message: objectReturn,
            });
        } else {
            return res.status(NOT_FOUND).json({
                success: false,
                status: NOT_FOUND,
                message: "Salary record not found for the specified month and year.",
            });
        }
    } catch (err) {
        next(err);
    }
};

export const getSalaryForAllEmployees = async (req, res, next) => {
    try {
        const year = parseInt(req.query.year);
        const month = parseInt(req.query.month);

        if (!year || !month) {
            return res.status(BAD_REQUEST).json({
                success: false,
                status: BAD_REQUEST,
                message: "Year and month are required parameters",
            });
        }

        const employees = await EmployeeSchema.find();
        if (!employees) return next(createError(NOT_FOUND, "Employees not found!"));

        let salaries = [];

        for (const employee of employees) {
            const salary = employee.salary.find(stat =>
                stat.year === year && stat.month === month
            );
            if (salary) {
                salaries.push({
                    employee_id: employee.id,
                    employee_name: employee.name,
                    email: employee.email,
                    department_name: employee.department_name,
                    role: employee.role,
                    position: employee.position,
                    salary: salary
                });
            } else {
                salaries.push({
                    employee_id: employee.id,
                    employee_name: employee.name,
                    email: employee.email,
                    department_name: employee.department_name,
                    role: employee.role,
                    position: employee.position,
                    salary: null,
                    message: "Salary record not found for the specified month and year."
                });
            }
        }
        return res.status(OK).json({
            success: true,
            status: OK,
            salaries: salaries,
        });
    } catch (err) {
        next(err);
    }
};
