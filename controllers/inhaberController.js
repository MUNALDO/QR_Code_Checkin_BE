import { createError } from "../utils/error.js";
import { BAD_REQUEST, CREATED, FORBIDDEN, NOT_FOUND, OK } from "../constant/HttpStatus.js";
import EmployeeSchema from "../models/EmployeeSchema.js";
import AttendanceSchema from "../models/AttendanceSchema.js";
import AdminSchema from "../models/AdminSchema.js";
import ShiftSchema from "../models/ShiftSchema.js";
import cron from 'node-cron';
import DepartmentSchema from "../models/DepartmentSchema.js";
import RequestSchema from "../models/RequestSchema.js";
import LogSchema from "../models/LogSchema.js";
import StatsSchema from "../models/StatsSchema.js";
import SalarySchema from "../models/SalarySchema.js";
import DayOffSchema from "../models/DayOffSchema.js";

export const updateEmployeeByInhaber = async (req, res, next) => {
    const inhaber_name = req.query.inhaber_name;
    const employeeID = req.query.employeeID;
    try {
        const currentTime = new Date();
        const currentYear = currentTime.getFullYear();
        const currentMonth = currentTime.getMonth() + 1;

        const inhaber = await EmployeeSchema.findOne({ role: 'Inhaber', name: inhaber_name });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        // Check if the employee is in any of the Inhaber's departments
        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"));
        if (employee.status === "inactive") return next(createError(NOT_FOUND, "Employee not active!"));

        const employeeInInhaberDepartments = employee.department.some(dep => inhaber.department.map(d => d.name).includes(dep.name));
        if (!employeeInInhaberDepartments) {
            return next(createError(FORBIDDEN, "Permission denied. Inhaber can only modify an employee in their departments."));
        }

        if (req.body.default_day_off !== undefined) {
            const day_off_change = req.body.default_day_off - employee.default_day_off;
            if (day_off_change > 0) {
                req.body.realistic_day_off = employee.realistic_day_off + day_off_change;
            } else if (day_off_change < 0) {
                req.body.realistic_day_off = Math.max(0, employee.realistic_day_off + day_off_change);
            }
        }

        if (req.body.total_time_per_month !== undefined) {
            let stats = await StatsSchema.findOne({
                employee_id: employee.id,
                year: currentYear,
                month: currentMonth
            });
            if (stats) {
                const spendSchedulesTime = stats.default_schedule_times - stats.realistic_schedule_times;
                stats.default_schedule_times = req.body.total_time_per_month;
                stats.realistic_schedule_times = req.body.total_time_per_month - spendSchedulesTime;
                stats.attendance_overtime = stats.attendance_total_times - req.body.total_time_per_month;
                await stats.save();
            }
        }

        const updatedEmployee = await EmployeeSchema.findOneAndUpdate(
            { id: employeeID },
            { $set: req.body },
            { new: true }
        );

        if (!updatedEmployee) {
            return next(createError(NOT_FOUND, "Employee not found!"));
        }
        if (updatedEmployee.status === "inactive") return next(createError(NOT_FOUND, "Employee not active!"));

        // Update employee information in each department
        for (let departmentObject of updatedEmployee.department) {
            const department = await DepartmentSchema.findOne({ name: departmentObject.name });
            if (department) {
                const memberIndex = department.members.findIndex(member => member.id === updatedEmployee.id);
                if (memberIndex !== -1) {
                    const originalPosition = department.members[memberIndex].position;
                    department.members[memberIndex] = {
                        ...department.members[memberIndex],
                        id: updatedEmployee.id,
                        name: updatedEmployee.name,
                        email: updatedEmployee.email,
                        role: updatedEmployee.role,
                        position: originalPosition,
                    };
                    await department.save();
                }
            }
        }

        // Update employee information in day off records
        await DayOffSchema.updateMany(
            { 'members.id': updatedEmployee.id },
            {
                $set: {
                    'members.$.id': updatedEmployee.id,
                    'members.$.name': updatedEmployee.name,
                    'members.$.email': updatedEmployee.email,
                    'members.$.role': updatedEmployee.role,
                }
            }
        );

        res.status(OK).json({
            success: true,
            status: OK,
            message: updatedEmployee,
        });
    } catch (err) {
        next(err);
    }
};

export const madeEmployeeInactiveByInhaber = async (req, res, next) => {
    const inhaberName = req.query.inhaber_name;
    const employeeID = req.query.employeeID;
    try {
        const inhaber = await EmployeeSchema.findOne({ name: inhaberName, role: 'Inhaber' });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"));
        if (employee.status === "inactive") return next(createError(NOT_FOUND, "Employee already inactive!"));

        // Verify if the employee belongs to the Inhaber's department
        const isEmployeeInDepartment = employee.department.some(department =>
            inhaber.department.some(inhaberDepartment => inhaberDepartment.name === department.name)
        );
        if (!isEmployeeInDepartment) {
            return next(createError(FORBIDDEN, "Permission denied. Inhaber can only modify an employee in their departments."));
        }

        const inactiveDate = new Date(req.body.inactive_day);
        const currentDate = new Date();

        // Check if the inactive date is in the future
        if (inactiveDate <= currentDate) {
            return next(createError(BAD_REQUEST, "Inactive day must be in the future."));
        }

        const minute = inactiveDate.getMinutes();
        const hour = inactiveDate.getHours();
        const day = inactiveDate.getDate();
        const month = inactiveDate.getMonth();

        // Schedule the status update
        cron.schedule(`${minute} ${hour} ${day} ${month + 1} *`, async () => {
            employee.inactive_day = inactiveDate;
            employee.status = "inactive";

            // Update status in departments
            for (let departmentObject of employee.department) {
                const department = await DepartmentSchema.findOne({ name: departmentObject.name });
                if (department) {
                    const memberIndex = department.members.findIndex(member => member.id === employee.id);
                    if (memberIndex !== -1) {
                        department.members[memberIndex].status = "inactive";
                        await department.save();
                    }
                }
            }

            // Update status in day off records
            await DayOffSchema.updateMany(
                { 'members.id': employeeID },
                { $set: { 'members.$.status': "inactive" } }
            );

            await employee.save();
        });

        res.status(OK).json({
            success: true,
            status: OK,
            message: `Employee will be made inactive on the specified date:
            ${minute} ${hour} ${day} ${month + 1}.`
        });
    } catch (err) {
        next(err);
    }
};

export const getEmployeeByIdForInhaber = async (req, res, next) => {
    const inhaberName = req.query.inhaber_name;
    const employeeID = req.query.employeeID;
    try {
        const inhaber = await EmployeeSchema.findOne({ name: inhaberName, role: 'Inhaber' });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"));

        const isEmployeeInDepartment = employee.department.some(department =>
            inhaber.department.some(inhaberDepartment => inhaberDepartment.name === department.name)
        );

        if (!isEmployeeInDepartment) {
            return next(createError(FORBIDDEN, "Permission denied. Inhaber can only access an employee in their departments."));
        }

        // Filter out non-matching departments from the employee
        const filteredDepartments = employee.department.filter(dep =>
            inhaber.department.some(inhaberDep => inhaberDep.name === dep.name)
        );

        const filteredEmployee = {
            ...employee.toObject(),
            department: filteredDepartments
        };

        res.status(OK).json({
            success: true,
            status: OK,
            message: [filteredEmployee],
        });
    } catch (err) {
        next(err);
    }
};

export const deleteEmployeeByIdByInhaber = async (req, res, next) => {
    const inhaberName = req.query.inhaber_name;
    const employeeID = req.query.employeeID;
    try {
        const inhaber = await EmployeeSchema.findOne({ name: inhaberName, role: 'Inhaber' });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"));

        // Verify if the employee belongs to the Inhaber's department
        const isEmployeeInDepartment = employee.department.some(department =>
            inhaber.department.some(inhaberDepartment => inhaberDepartment.name === department.name)
        );
        if (!isEmployeeInDepartment) {
            return next(createError(FORBIDDEN, "Permission denied. Inhaber can only delete an employee in their departments."));
        }

        for (let departmentObject of employee.department) {
            const department = await DepartmentSchema.findOne({ name: departmentObject.name });
            if (department) {
                department.members = department.members.filter(member => member.id !== employee.id);
                await department.save();
            }
        }

        // Remove the employee from all day off records
        await DayOffSchema.updateMany(
            { 'members.id': employeeID },
            { $pull: { members: { id: employeeID } } }
        );

        // Finally, delete the employee record
        await EmployeeSchema.findOneAndDelete({ id: employeeID });
        res.status(OK).json({
            success: true,
            status: OK,
            message: "Employee deleted successfully",
        });
    } catch (err) {
        next(err);
    }
};

export const searchSpecificForInhaber = async (req, res, next) => {
    const { role, details, status } = req.query;
    const inhaberName = req.query.inhaber_name;
    try {
        const inhaber = await EmployeeSchema.findOne({ name: inhaberName, role: 'Inhaber' });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        const regex = new RegExp(details, 'i');
        const employeeQueryCriteria = {
            'department.name': { $in: inhaber.department.map(dep => dep.name) },
            'role': role || { $in: ['Inhaber', 'Manager', 'Employee'] },
            ...(status && { 'status': status }),
            ...(details && { '$or': [{ 'id': regex }, { 'name': regex }] })
        };

        let employees = await EmployeeSchema.find(employeeQueryCriteria);

        if (employees.length === 0) {
            return res.status(NOT_FOUND).json({
                success: false,
                status: NOT_FOUND,
                message: "No matching records found in your departments.",
            });
        }

        // Filter out non-matching departments from each employee
        employees = employees.map(employee => {
            const filteredDepartments = employee.department.filter(dep =>
                inhaber.department.some(inhaberDep => inhaberDep.name === dep.name)
            );

            return {
                ...employee.toObject(),
                department: filteredDepartments
            };
        });

        res.status(OK).json({
            success: true,
            status: OK,
            message: employees,
        });
    } catch (err) {
        next(err);
    }
};

export const getEmployeesSchedulesByInhaber = async (req, res, next) => {
    const inhaber_name = req.query.inhaber_name;
    const targetYear = req.query.year ? parseInt(req.query.year) : null;
    const targetMonth = req.query.month ? parseInt(req.query.month) - 1 : null;
    const targetDate = req.query.date ? new Date(req.query.date) : null;
    try {
        // Find the Inhaber and get their department name
        const inhaber = await EmployeeSchema.findOne({ name: inhaber_name, role: 'Inhaber' });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        const departmentNames = inhaber.department.map(dep => dep.name);

        // Find all employees in the Inhaber's departments
        const employees = await EmployeeSchema.find({ 'department.name': { $in: departmentNames } });
        const schedules = [];

        employees.forEach(employee => {
            employee.department.forEach(department => {
                department.schedules.forEach(schedule => {
                    const scheduleDate = new Date(schedule.date);

                    // Check if the schedule matches the time criteria
                    const matchesYear = targetYear === null || scheduleDate.getFullYear() === targetYear;
                    const matchesMonth = targetMonth === null || scheduleDate.getMonth() === targetMonth;
                    const matchesDate = !targetDate || scheduleDate.toISOString().split('T')[0] === targetDate.toISOString().split('T')[0];

                    if (matchesYear && matchesMonth && matchesDate) {
                        schedule.shift_design.forEach(shift => {
                            schedules.push({
                                employee_id: employee.id,
                                employee_name: employee.name,
                                department_name: department.name,
                                date: scheduleDate,
                                shift_code: shift.shift_code,
                                position: shift.position,
                                time_slot: shift.time_slot,
                                shift_type: shift.shift_type
                            });
                        });
                    }
                });
            });
        });

        if (schedules.length === 0) {
            return res.status(NOT_FOUND).json({
                success: false,
                status: NOT_FOUND,
                message: "No schedules found for the specified criteria in your department."
            });
        }

        res.status(OK).json({
            success: true,
            status: OK,
            message: schedules
        });
    } catch (err) {
        next(err);
    }
};

export const createMultipleDateDesignsByInhaber = async (req, res, next) => {
    const inhaber_name = req.query.inhaber_name;
    const specificEmployeeID = req.query.employeeID;
    const shiftCode = req.body.shift_code;
    const dates = req.body.dates;
    const convertToMinutes = (timeString) => {
        const [hours, minutes] = timeString.split(':').map(Number);
        return hours * 60 + minutes;
    };
    const errorDates = [];
    try {
        const inhaber = await EmployeeSchema.findOne({ name: inhaber_name, role: 'Inhaber' });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        const shift = await ShiftSchema.findOne({ code: shiftCode });
        if (!shift) return next(createError(NOT_FOUND, "Shift not found!"));

        const departmentNames = inhaber.department.map(dep => dep.name);

        let employeeQuery = { 'department.name': { $in: departmentNames } };
        if (specificEmployeeID) {
            employeeQuery.id = specificEmployeeID;
        }

        const employees = await EmployeeSchema.find(employeeQuery);

        const results = [];
        for (const employee of employees) {
            const employeeDepartment = employee.department.find(dep => dep.name === departmentName);
            if (!employeeDepartment) return next(createError(NOT_FOUND, "Employee does not belong to the specified department!"));
            for (const dateString of dates) {
                const [month, day, year] = dateString.split('/');
                const dateObj = new Date(year, month - 1, day);

                let stats = await StatsSchema.findOne({
                    employee_id: employee.id,
                    year: year,
                    month: month
                });

                if (!stats) {
                    stats = new StatsSchema({
                        employee_id: employee.id,
                        employee_name: employee.name,
                        year: year,
                        month: month,
                        default_schedule_times: employee.total_time_per_month,
                        realistic_schedule_times: employee.total_time_per_month - shift.time_slot.duration
                    });
                    await stats.save();
                } else {
                    stats.realistic_schedule_times -= shift.time_slot.duration;
                    await stats.save();
                }

                let schedule = employeeDepartment.schedules.find(s =>
                    s.date.toISOString().split('T')[0] === dateObj.toISOString().split('T')[0]);

                let existsTimeRanges = schedule ? schedule.shift_design.map(design => ({
                    startTime: design.time_slot.start_time,
                    endTime: design.time_slot.end_time
                })) : [];

                const newShiftStartTime = shift.time_slot.start_time;
                const newShiftEndTime = shift.time_slot.end_time;

                const hasConflict = existsTimeRanges.some(range => {
                    const existingStartTime = convertToMinutes(range.startTime);
                    const existingEndTime = convertToMinutes(range.endTime);
                    const newStartTime = convertToMinutes(newShiftStartTime);
                    const newEndTime = convertToMinutes(newShiftEndTime);

                    const startsDuringExisting = newStartTime >= existingStartTime && newStartTime < existingEndTime;
                    const endsDuringExisting = newEndTime > existingStartTime && newEndTime <= existingEndTime;
                    const overlapsExistingEnd = newStartTime < existingEndTime && newStartTime >= existingEndTime - 30;

                    return startsDuringExisting || endsDuringExisting || overlapsExistingEnd;
                });

                if (hasConflict) {
                    errorDates.push({ date: dateString, message: "Shift time range conflict with existing shifts for the day" });
                    continue;
                }

                let shiftExistsInAnyDepartment = false;
                employee.department.forEach(dep => {
                    if (departmentNames.includes(dep.name)) {
                        const existingDateInSchedule = dep.schedules.find(s => s.date.toISOString().split('T')[0] === dateObj.toISOString().split('T')[0]);
                        if (existingDateInSchedule && existingDateInSchedule.shift_design.some(design => design.shift_code === shiftCode)) {
                            shiftExistsInAnyDepartment = true;
                        }
                    }
                });

                if (!shiftExistsInAnyDepartment) {
                    employee.department.forEach(dep => {
                        if (departmentNames.includes(dep.name)) {
                            let schedule = dep.schedules.find(s => s.date.toISOString().split('T')[0] === dateObj.toISOString().split('T')[0]);
                            if (!schedule) {
                                schedule = {
                                    date: dateObj,
                                    shift_design: [{
                                        position: req.body.position,
                                        shift_code: shiftCode,
                                        time_slot: shift.time_slot,
                                        time_left: stats.realistic_schedule_times
                                    }]
                                };
                                dep.schedules.push(schedule);
                            }

                            schedule.shift_design.push({
                                position: req.body.position,
                                shift_code: shiftCode,
                                time_slot: shift.time_slot,
                                time_left: stats.realistic_schedule_times
                            });
                        }
                    });
                } else {
                    errorDates.push({ date: dateString, message: `Shift with code ${shiftCode} already exists for ${dateString} in the department.` });
                    continue;
                }
            }
            
            await employee.save();
            results.push({
                employee_id: employee.id,
                employee_name: employee.name,
                email: employee.email,
                departments: employee.department,
                role: employee.role,
                position: req.body.position,
                error_date: errorDates
            });
        }

        if (results.length === 0) {
            return res.status(NOT_FOUND).json({
                success: false,
                status: NOT_FOUND,
                message: "No schedules created. No employees found in the Inhaber's departments."
            });
        }

        res.status(CREATED).json({
            success: true,
            status: CREATED,
            message: results
        });
    } catch (err) {
        next(err);
    }
};

export const getDateDesignForInhaber = async (req, res, next) => {
    const inhaberName = req.query.inhaber_name;
    const targetYear = req.query.year ? parseInt(req.query.year) : null;
    const targetMonth = req.query.month ? parseInt(req.query.month) - 1 : null;
    const targetDate = req.query.date ? new Date(req.query.date) : null;
    const specificEmployeeID = req.query.employeeID;
    try {
        const inhaber = await EmployeeSchema.findOne({ name: inhaberName, role: 'Inhaber' });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        const departmentNames = inhaber.department.map(dep => dep.name);
        const shiftDesigns = [];

        // Adjust the query to optionally include a specific employee ID
        let employeeQuery = { 'department.name': { $in: departmentNames } };
        if (specificEmployeeID) {
            employeeQuery.id = specificEmployeeID; // Filter by specific employee ID if provided
        }

        const employees = await EmployeeSchema.find(employeeQuery);
        employees.forEach(employee => {
            employee.department.forEach(department => {
                if (departmentNames.includes(department.name)) {
                    department.schedules.forEach(schedule => {
                        const scheduleDate = new Date(schedule.date);

                        if ((!targetYear || scheduleDate.getFullYear() === targetYear) &&
                            (!targetMonth || scheduleDate.getMonth() === targetMonth) &&
                            (!targetDate || scheduleDate.toISOString().split('T')[0] === targetDate.toISOString().split('T')[0])) {

                            schedule.shift_design.forEach(shift => {
                                shiftDesigns.push({
                                    employee_id: employee.id,
                                    employee_name: employee.name,
                                    date: scheduleDate,
                                    department_name: department.name,
                                    position: shift.position,
                                    shift_code: shift.shift_code,
                                    time_slot: shift.time_slot,
                                    shift_type: shift.shift_type,
                                });
                            });
                        }
                    });
                }
            });
        });

        if (shiftDesigns.length === 0) {
            return next(createError(NOT_FOUND, "No shift designs found for the specified criteria in your department."));
        }

        res.status(OK).json({
            success: true,
            status: OK,
            message: shiftDesigns
        });
    } catch (err) {
        next(err);
    }
};

export const deleteDateSpecificByInhaber = async (req, res, next) => {
    const employeeID = req.query.employeeID;
    const dateToDelete = new Date(req.body.date);
    const inhaber_name = req.query.inhaber_name;
    try {
        const inhaber = await AdminSchema.findOne({ name: inhaber_name });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"));

        if (!employee.department_name.includes(inhaber.department_name)) {
            return next(createError(FORBIDDEN, "Permission denied. Inhaber can only modify schedules of an employee in their department."));
        }

        const specificDateSchedule = employee.schedules.find(schedule =>
            schedule.date.getTime() === dateToDelete.getTime()
        );

        if (!specificDateSchedule) {
            return next(createError(NOT_FOUND, "Date design not found!"));
        }

        specificDateSchedule.shift_design = specificDateSchedule.shift_design.filter(design =>
            design.department_name !== inhaber.department_name
        );

        if (specificDateSchedule.shift_design.length === 0) {
            const index = employee.schedules.indexOf(specificDateSchedule);
            employee.schedules.splice(index, 1);
        }

        await employee.save();

        res.status(OK).json({
            success: true,
            status: OK,
            message: "Shift design deleted successfully",
        });
    } catch (err) {
        next(err);
    }
};

export const getAttendanceForInhaber = async (req, res, next) => {
    const inhaber_name = req.query.inhaber_name;
    const employeeID = req.query.employeeID;
    const year = req.query.year;
    const month = req.query.month;
    const dateString = req.query.date;
    try {
        if (!inhaber_name) {
            return res.status(BAD_REQUEST).json({
                success: false,
                status: BAD_REQUEST,
                message: "Inhaber name is required",
            });
        }

        const inhaber = await EmployeeSchema.findOne({ name: inhaber_name, role: 'Inhaber' });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        let dateRange = {};
        if (year && month) {
            let date = null;
            if (dateString) {
                date = new Date(dateString);
                if (isNaN(date.getTime())) {
                    return res.status(BAD_REQUEST).json({
                        success: false,
                        status: BAD_REQUEST,
                        message: "Invalid date format",
                    });
                }
            }

            dateRange = date
                ? {
                    $gte: new Date(year, month - 1, date.getDate(), 0, 0, 0, 0),
                    $lt: new Date(year, month - 1, date.getDate() + 1, 0, 0, 0, 0),
                }
                : {
                    $gte: new Date(year, month - 1, 1),
                    $lt: new Date(year, month, 1),
                };
        }

        let query = {
            department_name: { $in: inhaber.department.map(dep => dep.name) }
        };

        if (Object.keys(dateRange).length > 0) {
            query.date = dateRange;
        }

        if (employeeID) {
            query.employee_id = employeeID;
        }

        const attendances = await AttendanceSchema.find(query);

        return res.status(OK).json({
            success: true,
            status: OK,
            message: attendances,
        });
    } catch (err) {
        next(err);
    }
};

export const getSalaryForInhaber = async (req, res, next) => {
    try {
        const { year, month, employeeID } = req.query;
        const inhaber_name = req.query.inhaber_name;

        let query = {};
        if (year) query.year = parseInt(year);
        if (month) query.month = parseInt(month);

        // Find the Inhaber and their departments
        const inhaber = await EmployeeSchema.findOne({ name: inhaber_name, role: 'Inhaber' });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        // Get all employee IDs from Inhaber's departments
        const employeesInDepartments = await EmployeeSchema.find({
            'department.name': { $in: inhaber.department.map(dep => dep.name) }
        }).select('id');
        const employeeIds = employeesInDepartments.map(emp => emp.id);

        // Construct the query for SalarySchema
        if (employeeID) {
            // Check if provided employeeID is in the list of Inhaber's department employee IDs
            if (!employeeIds.includes(employeeID)) {
                return res.status(NOT_FOUND).json({
                    success: false,
                    status: NOT_FOUND,
                    message: "Employee not found in Inhaber's departments."
                });
            }
            query.employee_id = employeeID;
        } else {
            // If no specific employeeID provided, use all employee IDs from Inhaber's departments
            query.employee_id = { $in: employeeIds };
        }

        // Fetch salaries using the constructed query
        const salaries = await SalarySchema.find(query);
        // console.log(query);

        if (salaries.length === 0) {
            return res.status(NOT_FOUND).json({
                success: false,
                status: NOT_FOUND,
                message: "No salary records found for the specified criteria."
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

export const getAllRequestsForInhaber = async (req, res, next) => {
    const inhaber_name = req.query.inhaber_name;
    try {
        const inhaber = await EmployeeSchema.findOne({ name: inhaber_name, role: 'Inhaber' });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        const departmentNames = inhaber.department.map(dep => dep.name);
        const employeesInDepartment = await EmployeeSchema.find({ 'department.name': { $in: departmentNames } });
        const employeeIds = employeesInDepartment.map(emp => emp.id);

        const requests = await RequestSchema.find({ employee_id: { $in: employeeIds } });

        return res.status(OK).json({
            success: true,
            status: OK,
            message: requests,
        });
    } catch (err) {
        next(err);
    }
};

export const getRequestByIdForInhaber = async (req, res, next) => {
    const inhaber_name = req.query.inhaber_name;
    const requestId = req.params._id;
    try {
        const inhaber = await EmployeeSchema.findOne({ name: inhaber_name, role: 'Inhaber' });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        const request = await RequestSchema.findById(requestId).populate('employee_id');
        if (!request) return next(createError(NOT_FOUND, "Request not found!"));

        const departmentNames = inhaber.department.map(dep => dep.name);
        if (!departmentNames.includes(request.employee_id.department.name)) {
            return next(createError(NOT_FOUND, "Request not made by an employee in Inhaber's department"));
        }

        return res.status(OK).json({
            success: true,
            status: OK,
            message: request,
        });
    } catch (err) {
        next(err);
    }
};

export const handleRequestForInhaber = async (req, res, next) => {
    const inhaber_name = req.query.inhaber_name;
    const requestId = req.params._id;
    try {
        const inhaber = await EmployeeSchema.findOne({ name: inhaber_name, role: 'Inhaber' });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        const updateRequest = await RequestSchema.findById(requestId).populate('employee_id');
        if (!updateRequest) return next(createError(NOT_FOUND, "Request not found!"));

        const departmentNames = inhaber.department.map(dep => dep.name);
        if (!departmentNames.includes(updateRequest.employee_id.department.name)) {
            return next(createError(NOT_FOUND, "Request not from an employee in Inhaber's department"));
        }

        // Check if the request is from an employee in the Inhaber's department
        const employee = await EmployeeSchema.findOne({ id: updateRequest.employee_id, 'department.name': { $in: departmentNames } });
        if (!employee) return next(createError(NOT_FOUND, "Request not from an employee in Inhaber's department"));

        const day_off = await DayOffSchema.findOne({
            date_start: new Date(updateRequest.request_dayOff_start),
            date_end: new Date(updateRequest.request_dayOff_end),
            'members.id': employee.id
        });
        if (!day_off) return next(createError(NOT_FOUND, "Day Off not found!"));

        if (updateRequest.answer_status === "approved") {
            day_off.allowed = true;
            await day_off.save();
            const employeeDayOff = employee.dayOff_schedule.find(dayOffSchedule =>
                dayOffSchedule.date_start.getTime() === day_off.date_start.getTime() &&
                dayOffSchedule.date_end.getTime() === day_off.date_end.getTime()
            );

            if (employeeDayOff) {
                employeeDayOff.allowed = true;
                employee.realistic_day_off = employee.realistic_day_off - day_off.duration;
                employee.markModified('dayOff_schedule');
                await employee.save();
            }
        } else if (updateRequest.answer_status === "denied") {
            employee.dayOff_schedule = employee.dayOff_schedule.filter(dayOffSchedule =>
                dayOffSchedule.date_start.getTime() !== day_off.date_start.getTime() ||
                dayOffSchedule.date_end.getTime() !== day_off.date_end.getTime()
            );
            await employee.save();
            await DayOffSchema.findOneAndDelete({ _id: day_off._id });
        }

        res.status(OK).json({
            success: true,
            status: OK,
            message: updateRequest,
        });
    } catch (err) {
        next(err);
    }
};

export const updateAttendanceForInhaber = async (req, res, next) => {
    const attendanceId = req.params._id;
    const inhaber_name = req.query.inhaber_name;
    const updateData = req.body;

    try {
        const attendance = await AttendanceSchema.findById(attendanceId);
        if (!attendance) return next(createError(NOT_FOUND, "Attendance record not found."));

        const inhaber = await EmployeeSchema.findOne({ name: inhaber_name, role: 'Inhaber' });
        if (!inhaber || !inhaber.department.some(dep => dep.name === attendance.department_name)) {
            return next(createError(FORBIDDEN, "Inhaber does not have access to this department."));
        }

        const currentTime = new Date();
        const currentYear = currentTime.getFullYear();
        const currentMonth = currentTime.getMonth() + 1;
        const edited = await EmployeeSchema.findOne({ id: attendance.employee_id });

        const departmentIndex = edited.department.findIndex(dep => dep.name === attendance.department_name);
        const statsIndex = edited.department[departmentIndex].attendance_stats.findIndex(stat =>
            stat.year === currentYear && stat.month === currentMonth
        );

        const attendanceTotalHours = attendance.shift_info.total_hour;
        const attendanceTotalMinutes = attendance.shift_info.total_minutes;
        const attendance_total_times = attendanceTotalHours + attendanceTotalMinutes / 60;
        if (attendance.status === "checked") {
            if (attendance.shift_info.time_slot.check_in_status === "on time" && attendance.shift_info.time_slot.check_out_status === "on time") {
                edited.department[departmentIndex].attendance_stats[statsIndex].date_on_time -= 1;
            } else if (attendance.shift_info.time_slot.check_in_status === "late" && attendance.shift_info.time_slot.check_out_status === "late") {
                edited.department[departmentIndex].attendance_stats[statsIndex].date_late -= 1;
            } else if ((attendance.shift_info.time_slot.check_in_status === "late" && attendance.shift_info.time_slot.check_out_status === "on time")
                || (attendance.shift_info.time_slot.check_in_status === "on time" && attendance.shift_info.time_slot.check_out_status === "late")) {
                edited.department[departmentIndex].attendance_stats[statsIndex].date_on_time -= 0.5;
                edited.department[departmentIndex].attendance_stats[statsIndex].date_late -= 0.5;
            }
        } else {
            edited.department[departmentIndex].attendance_stats[statsIndex].date_missing += 1;
        }

        const updatedFields = {};
        for (const key in updateData) {
            if (updateData.hasOwnProperty(key)) {
                if (typeof updateData[key] === 'object' && updateData[key] !== null) {
                    for (const subKey in updateData[key]) {
                        updatedFields[`${key}.${subKey}`] = updateData[key][subKey];
                    }
                } else {
                    updatedFields[key] = updateData[key];
                }
            }
        }

        const updatedAttendance = await AttendanceSchema.findByIdAndUpdate(
            attendanceId,
            { $set: updatedFields },
            { new: true }
        );

        const updatedCheckInTimeString = updatedAttendance.shift_info.time_slot.check_in_time;
        const updatedCheckInTime = new Date(`${updatedAttendance.date.toDateString()} ${updatedCheckInTimeString}`);

        const updatedCheckOutTimeString = updatedAttendance.shift_info.time_slot.check_out_time;
        const updatedCheckOutTime = new Date(`${updatedAttendance.date.toDateString()} ${updatedCheckOutTimeString}`);

        const updatedTimeDifference = updatedCheckOutTime - updatedCheckInTime;
        const updatedTotalHours = Math.floor(updatedTimeDifference / (1000 * 60 * 60));
        const updatedTotalMinutes = Math.floor((updatedTimeDifference % (1000 * 60 * 60)) / (1000 * 60));
        updatedAttendance.shift_info.total_hour = updatedTotalHours;
        updatedAttendance.shift_info.total_minutes = updatedTotalMinutes;
        const update_total_times = updatedTotalHours + updatedTotalMinutes / 60;

        if (updatedAttendance.status === "checked") {
            if (updatedAttendance.shift_info.time_slot.check_in_status === "on time" && updatedAttendance.shift_info.time_slot.check_out_status === "on time") {
                edited.department[departmentIndex].attendance_stats[statsIndex].date_on_time += 1;
            } else if (updatedAttendance.shift_info.time_slot.check_in_status === "late" && updatedAttendance.shift_info.time_slot.check_out_status === "late") {
                edited.department[departmentIndex].attendance_stats[statsIndex].date_late += 1;
            } else if ((updatedAttendance.shift_info.time_slot.check_in_status === "late" && updatedAttendance.shift_info.time_slot.check_out_status === "on time")
                || (updatedAttendance.shift_info.time_slot.check_in_status === "on time" && updatedAttendance.shift_info.time_slot.check_out_status === "late")) {
                edited.department[departmentIndex].attendance_stats[statsIndex].date_on_time += 0.5;
                edited.department[departmentIndex].attendance_stats[statsIndex].date_late += 0.5;
            }
        } else {
            edited.department[departmentIndex].attendance_stats[statsIndex].date_missing += 1;
        }
        await updatedAttendance.save();

        let stats = await StatsSchema.findOne({
            employee_id: edited.id,
            year: currentYear,
            month: currentMonth
        });
        stats.attendance_total_times = stats.attendance_total_times - attendance_total_times + update_total_times;
        stats.attendance_overtime = stats.attendance_total_times - stats.default_schedule_times;
        await stats.save();

        const newLog = new LogSchema({
            year: currentYear,
            month: currentMonth,
            date: currentTime,
            type_update: "Update attendance",
            editor_name: inhaber.name,
            editor_role: inhaber.role,
            edited_name: edited.name,
            edited_role: edited.role,
            detail_update: req.body,
            object_update: attendance
        })
        await newLog.save();

        res.status(OK).json({
            success: true,
            status: OK,
            message: updatedAttendance,
            log: newLog
        });
    } catch (err) {
        next(err);
    }
};

export const getStatsForInhaber = async (req, res, next) => {
    const { year, month, employeeID } = req.query;
    const inhaber_name = req.query.inhaber_name;
    try {
        const inhaber = await EmployeeSchema.findOne({ name: inhaber_name, role: 'Inhaber' });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        let query = {};
        if (year) query.year = parseInt(year);
        if (month) query.month = parseInt(month);

        let employeeIds = [];
        if (employeeID) {
            const employee = await EmployeeSchema.findOne({ id: employeeID, 'department.name': { $in: inhaber.department.map(dep => dep.name) } });
            if (employee) employeeIds = [employeeID];
        } else {
            const employees = await EmployeeSchema.find({ 'department.name': { $in: inhaber.department.map(dep => dep.name) } });
            employeeIds = employees.map(emp => emp.id);
        }

        if (employeeIds.length > 0) query.employee_id = { $in: employeeIds };

        const stats = await StatsSchema.find(query);
        if (stats.length === 0) return res.status(NOT_FOUND).json({ success: false, status: NOT_FOUND, message: "Statistics not found." });

        return res.status(OK).json({ success: true, status: OK, message: stats });
    } catch (err) {
        next(err);
    }
};

