import { BAD_REQUEST, NOT_FOUND, OK } from "../constant/HttpStatus.js";
import AttendanceSchema from "../models/AttendanceSchema.js";
import EmployeeSchema from "../models/EmployeeSchema.js";
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

    const existStat = employee.salary.find(stat => stat.year === year && stat.month === month);

    // Initialize parameters for calculation
    let a = req.body.a_new ?? 0;
    let b = req.body.b_new ?? 0;
    let c = req.body.c_new ?? 0;
    let d = req.body.d_new ?? 0.25;

    // Use existing parameters if they exist
    if (existStat) {
        a = a ?? existStat.a_parameter;
        b = b ?? existStat.b_parameter;
        c = c ?? existStat.c_parameter;
        d = d ?? existStat.d_parameter;
    } else if (employee.salary.length === 0) {
        // Use provided parameters
    } else {
        // Use the latest salary record's parameters
        const latestSalary = employee.salary[employee.salary.length - 1];
        a = a ?? latestSalary.a_parameter;
        b = b ?? latestSalary.b_parameter;
        c = c ?? latestSalary.c_parameter;
        d = d ?? latestSalary.d_parameter;
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
        year: year,
        month: month,
        date_calculate: new Date(),
        total_salary: 0,
        hour_normal: [],
        hour_overtime: [],
        total_km: 0,
        a_parameter: a,
        b_parameter: b,
        c_parameter: c,
        d_parameter: d
    };

    employeeAttendance.forEach(attendance => {
        const { department_name, shift_info, total_km } = attendance;
        const { shift_type, total_hour, total_minutes } = shift_info;

        // Check if the employee has the position in the department for Autofahrer
        const isAutofahrer = employee.department.some(dep =>
            dep.name === department_name && dep.position.includes("Autofahrer")
        );

        if (isAutofahrer) {
            salaryRecord.total_km += total_km;
        }

        let hourType = shift_type === 'normal' ? 'hour_normal' : 'hour_overtime';

        let departmentRecord = salaryRecord[hourType].find(dep => dep.department_name === department_name);
        if (!departmentRecord) {
            departmentRecord = {
                department_name: department_name,
                total_hour: 0,
                total_minutes: 0
            };
            salaryRecord[hourType].push(departmentRecord);
        }
        departmentRecord.total_hour += total_hour;
        departmentRecord.total_minutes += total_minutes;
    });

    // Calculate day-off salary
    const days_off = employee.default_day_off - employee.realistic_day_off;
    const salary_day_off = [(b * 3) / 65] * days_off;

    // Calculate total salary
    salaryRecord.total_salary = salaryRecord.hour_normal.reduce((acc, curr) => acc + curr.total_hour * a, 0)
        + salaryRecord.hour_overtime.reduce((acc, curr) => acc + curr.total_hour * a, 0)
        - b - c + salary_day_off - employee.house_rent_money + salaryRecord.total_km * d;

    // Save or update the salary record
    if (existStat) {
        // Update existing salary record
        Object.assign(existStat, salaryRecord);
    } else {
        // Add new salary record
        employee.salary.push(salaryRecord);
    }

    await employee.save();

    return res.status(OK).json({
        success: true,
        status: OK,
        message: salaryRecord
    });
};

export const getSalary = async (req, res, next) => {
    try {
        const employeeID = req.query.employeeID;
        const year = req.query.year ? parseInt(req.query.year) : null;
        const month = req.query.month ? parseInt(req.query.month) : null;

        let employees;
        if (employeeID) {
            // Find one specific employee
            employees = await EmployeeSchema.find({ id: employeeID });
        } else {
            // Find all employees
            employees = await EmployeeSchema.find();
        }

        const salaries = employees.map(employee => {
            let salary;
            if (year && month) {
                // Find salary for the specific year and month
                salary = employee.salary.find(s => s.year === year && s.month === month);
            } else {
                // Get the latest salary record if year and month are not specified
                salary = employee.salary.length > 0 ? employee.salary[employee.salary.length - 1] : null;
            }

            return {
                employee_id: employee.id,
                employee_name: employee.name,
                email: employee.email,
                department_name: employee.department.map(d => d.name).join(', '),
                position: employee.department.flatMap(d => d.position.join('/')).join(', '),
                salary: salary || null
            };
        }).filter(emp => emp.salary !== null);

        if (salaries.length > 0) {
            return res.status(OK).json({
                success: true,
                status: OK,
                message: salaries,
            });
        } else {
            return res.status(NOT_FOUND).json({
                success: false,
                status: NOT_FOUND,
                message: "No salary records found.",
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
                    department_name: employee.department,
                    role: employee.role,
                    salary: salary
                });
            } else {
                salaries.push({
                    employee_id: employee.id,
                    employee_name: employee.name,
                    email: employee.email,
                    department_name: employee.department,
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
