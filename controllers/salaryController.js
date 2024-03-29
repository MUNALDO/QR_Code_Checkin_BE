import { BAD_REQUEST, NOT_FOUND, OK } from "../constant/HttpStatus.js";
import AttendanceSchema from "../models/AttendanceSchema.js";
import EmployeeSchema from "../models/EmployeeSchema.js";
import SalarySchema from "../models/SalarySchema.js";
import StatsSchema from "../models/StatsSchema.js";
import { createError } from "../utils/error.js";

const ensureNumber = (value) => {
    return (value === undefined || isNaN(value)) || null ? 0 : value;
};

export const salaryCalculate = async (req, res, next) => {
    const employeeID = req.params.employeeID;
    const employeeName = req.query.employeeName;
    const year = parseInt(req.query.year);
    const month = parseInt(req.query.month);

    if (!year || !month || !employeeID || !employeeName) {
        return res.status(BAD_REQUEST).json({
            success: false,
            status: BAD_REQUEST,
            message: "Year, month, and employee ID are required parameters",
        });
    }

    const employee = await EmployeeSchema.findOne({ id: employeeID, name: employeeName });
    if (!employee) return next(createError(NOT_FOUND, "Employee not found!"));
    if (employee.status === "inactive") return next(createError(NOT_FOUND, "Employee not active!"));

    let stats = await StatsSchema.findOne({
        employee_id: employeeID,
        employee_name: employeeName,
        year: year,
        month: month
    });
    if (!stats) return next(createError(NOT_FOUND, "Stats not found!"));

    let existSalary = await SalarySchema.findOne({
        employee_id: employeeID,
        employee_name: employeeName,
        year: year,
        month: month
    });

    let a = ensureNumber(req.body.a_new);
    let b = ensureNumber(req.body.b_new);
    let c = ensureNumber(req.body.c_new);
    let d = ensureNumber(req.body.d_new) || 0.25;
    let f = ensureNumber(req.body.f_new);

    if (!req.body.a_new && existSalary) a = ensureNumber(existSalary.a_parameter);
    if (!req.body.b_new && existSalary) b = ensureNumber(existSalary.b_parameter);
    if (!req.body.c_new && existSalary) c = ensureNumber(existSalary.c_parameter);
    if (!req.body.f_new && existSalary) f = ensureNumber(existSalary.f_parameter);

    if (!req.body.a_new && !existSalary) a = 0;
    if (!req.body.b_new && !existSalary) b = 0;
    if (!req.body.c_new && !existSalary) c = 0;
    if (!req.body.d_new && !existSalary) d = 0;
    if (!req.body.f_new && !existSalary) f = 0;

    const dateRange = {
        $gte: new Date(year, month - 1, 1, 0, 0, 0, 0),
        $lt: new Date(year, month, 0, 23, 59, 59, 999),
    };

    const employeeAttendance = await AttendanceSchema.find({
        employee_id: employeeID,
        employee_name: employeeName,
        date: dateRange,
    });

    let salaryRecord = {
        employee_id: employee.id,
        employee_name: employee.name,
        year: year,
        month: month,
        date_calculate: new Date(),
        total_salary: 0,
        total_times: ensureNumber(stats.attendance_total_times) + ensureNumber(stats.attendance_overtime),
        day_off: ensureNumber(employee.default_day_off) - ensureNumber(employee.realistic_day_off),
        hour_normal: [],
        total_hour_work: ensureNumber(stats.attendance_total_times),
        total_hour_overtime: ensureNumber(stats.attendance_overtime),
        total_km: 0,
        total_km_company: 0,
        total_km_private: 0,
        a_parameter: a,
        b_parameter: b,
        c_parameter: c,
        d_parameter: d,
        f_parameter: f
    };

    employeeAttendance.forEach(attendance => {
        const { department_name, shift_info, car_info, total_km } = attendance;
        const { total_hour, total_minutes } = shift_info;

        // Check if the employee has the position in the department for Autofahrer
        const isAutofahrer = employee.department.some(dep =>
            dep.name === department_name && dep.position.includes("Autofahrer")
        );

        if (isAutofahrer) {
            if (car_info && car_info.car_type === 'company') {
                salaryRecord.total_km_company += ensureNumber(total_km);
            } else if (car_info && car_info.car_type === 'private') {
                salaryRecord.total_km_private += ensureNumber(total_km);
            }
            salaryRecord.total_km = ensureNumber(salaryRecord.total_km_company + salaryRecord.total_km_private);
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
        departmentRecord.total_hour += ensureNumber(total_hour);
        departmentRecord.total_minutes += ensureNumber(total_minutes);
    });

    // Calculate day-off salary
    const days_off = ensureNumber(employee.default_day_off) - ensureNumber(employee.realistic_day_off);
    const salary_day_off = [(ensureNumber(b) * 3) / 65] * ensureNumber(days_off);

    if (salaryRecord.total_times > ensureNumber(employee.total_time_per_month)) {
        let calculatedSalary = (ensureNumber(a) / ensureNumber(employee.total_time_per_month)) * ensureNumber(employee.total_time_per_month) +
            (ensureNumber(salaryRecord.total_times) - ensureNumber(employee.total_time_per_month)) * ensureNumber(f) - ensureNumber(b) - ensureNumber(c) + ensureNumber(salary_day_off) -
            ensureNumber(employee.house_rent_money) + ensureNumber(salaryRecord.total_km_company) + ensureNumber(salaryRecord.total_km_private) * ensureNumber(d);
        salaryRecord.total_salary = ensureNumber(Number(calculatedSalary.toFixed(2)));
    } else if (salaryRecord.total_times <= ensureNumber(employee.total_time_per_month)) {
        let calculatedSalary = (ensureNumber(a) / ensureNumber(employee.total_time_per_month)) * ensureNumber(salaryRecord.total_times) - ensureNumber(b) - ensureNumber(c) +
            ensureNumber(salary_day_off) - ensureNumber(employee.house_rent_money) + ensureNumber(salaryRecord.total_km_company) + ensureNumber(salaryRecord.total_km_private) * ensureNumber(d);
        salaryRecord.total_salary = ensureNumber(Number(calculatedSalary.toFixed(2)));
    }

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
        const { year, month, employeeID, employeeName, department_name } = req.query;
        let query = {};

        // Include time query only if provided
        if (year) query.year = parseInt(year);
        if (month) query.month = parseInt(month);

        let employees;
        if (department_name) {
            // Get all employees in the department
            employees = await EmployeeSchema.find({ 'department.name': department_name });
        } else {
            // Get all employees if no department name is provided
            employees = await EmployeeSchema.find({});
        }

        // Get salary records for all employees or for the specified employee
        const employeeSalaries = await Promise.all(employees.map(async (employee) => {
            // If employeeID and employeeName are specified, filter by them
            if (employeeID && employeeName && (employee.id !== employeeID || employee.name !== employeeName)) {
                // Skip this employee as they do not match the query
                return [];
            }

            let salaryRecords = await SalarySchema.find({
                employee_id: employee.id,
                employee_name: employee.name,
                ...query
            });

            // If no salary records found, create a default record
            if (!salaryRecords.length) {
                salaryRecords = [{
                    employee_id: employee.id,
                    employee_name: employee.name,
                    year: year || 'N/A', // Changed 0 to 'N/A' for clarity
                    month: month || 'N/A', // Changed 0 to 'N/A' for clarity
                    total_salary: 0,
                    total_times: 0,
                    day_off: 0,
                    total_hour_work: 0,
                    total_hour_overtime: 0,
                    total_km: 0,
                    a_parameter: 0,
                    b_parameter: 0,
                    c_parameter: 0,
                    d_parameter: 0,
                    f_parameter: 0
                }];
            }

            return salaryRecords;
        }));

        const flattenedSalaries = employeeSalaries.flat();

        if (flattenedSalaries.length === 0) {
            return res.status(NOT_FOUND).json({
                success: false,
                status: NOT_FOUND,
                message: "No salary records found."
            });
        }

        return res.status(OK).json({
            success: true,
            status: OK,
            message: flattenedSalaries
        });
    } catch (err) {
        next(err);
    }
};



