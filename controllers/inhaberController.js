import { createError } from "../utils/error.js";
import { BAD_REQUEST, CREATED, FORBIDDEN, NOT_FOUND, OK } from "../constant/HttpStatus.js";
import EmployeeSchema from "../models/EmployeeSchema.js";
import AttendanceSchema from "../models/AttendanceSchema.js";
import AdminSchema from "../models/AdminSchema.js";
import ShiftSchema from "../models/ShiftSchema.js";
import cron from 'node-cron';
import DepartmentSchema from "../models/DepartmentSchema.js";
import RequestSchema from "../models/RequestSchema.js";

export const updateEmployeeByInhaber = async (req, res, next) => {
    const inhaber_name = req.query.inhaber_name;
    const employeeID = req.query.employeeID;
    try {
        const inhaber = await AdminSchema.findOne({ name: inhaber_name });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        // Find the employee before updating
        const employee = await EmployeeSchema.findOne({ id: employeeID });

        if (!employee) {
            return next(createError(NOT_FOUND, "Employee not found!"));
        }
        if (employee.status === "inactive") {
            return next(createError(NOT_FOUND, "Employee not active!"));
        }

        // Calculate the change in day offs if default_day_off is in the request
        if (req.body.default_day_off !== undefined) {
            const day_off_change = req.body.default_day_off - employee.default_day_off;
            if (day_off_change > 0) {
                // Case 1: Increase in default_day_off
                req.body.realistic_day_off = employee.realistic_day_off + day_off_change;
            } else if (day_off_change < 0) {
                // Case 2: Decrease in default_day_off
                req.body.realistic_day_off = Math.max(0, employee.realistic_day_off + day_off_change);
            }
            // Case 3: No change, req.body.realistic_day_off remains unaffected
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
    const inhaber_name = req.query.inhaber_name;
    const employeeID = req.query.employeeID;
    try {
        const inhaber = await AdminSchema.findOne({ name: inhaber_name });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"));
        if (employee.status === "inactive") return next(createError(NOT_FOUND, "Employee not active!"));

        const inactiveDate = new Date(req.body.inactive_day);
        const currentDate = new Date();

        // Check if the inactive date is in the future
        if (inactiveDate <= currentDate) {
            return next(createError(BAD_REQUEST, "Inactive day must be in the future."));
        }

        // Schedule the status update
        cron.schedule(`0 0 0 ${inactiveDate.getDate()} ${inactiveDate.getMonth()} ${inactiveDate.getFullYear()}`, async () => {
            employee.inactive_day = inactiveDate;
            employee.status = "inactive";

            // Update status in departments
            const department = await DepartmentSchema.findOne({ name: inhaber.department_name });
            if (!department.members.find(member => member.id == employee.id)) return next(createError(FORBIDDEN, "Permission denied. Inhaber can only intervention an employee in their department."));
            if (department) {
                const memberIndex = department.members.findIndex(member => member.id === employee.id);
                if (memberIndex !== -1) {
                    department.members[memberIndex].status = "inactive";
                    await department.save();
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
            message: "Employee will be made inactive on the specified date."
        });
    } catch (err) {
        next(err);
    }
};

export const deleteEmployeeByIdByInhaber = async (req, res, next) => {
    const inhaber_name = req.query.inhaber_name;
    const employeeID = req.query.employeeID;
    try {
        const inhaber = await AdminSchema.findOne({ name: inhaber_name });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"));

        const department = await DepartmentSchema.findOne({ name: inhaber.department_name });
        if (!department.members.find(member => member.id == employee.id)) return next(createError(FORBIDDEN, "Permission denied. Inhaber can only intervention an employee in their department."));

        if (department) {
            department.members = department.members.filter(member => member.id !== employee.id);
            await department.save();
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
    const inhaber_name = req.query.inhaber_name;
    try {
        const inhaber = await AdminSchema.findOne({ name: inhaber_name, role: 'Inhaber' });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        const regex = new RegExp(details, 'i');
        const departmentFilter = { 'department_name': inhaber.department_name };

        let managementQueryCriteria = { ...departmentFilter, 'role': 'Manager' };
        let employeeQueryCriteria = { 'department.name': inhaber.department_name, 'role': 'Employee' };

        if (status) {
            managementQueryCriteria['status'] = status;
            employeeQueryCriteria['status'] = status;
        }

        if (details) {
            managementQueryCriteria['$or'] = [{ id: regex }, { name: regex }];
            employeeQueryCriteria['$or'] = [{ id: regex }, { name: regex }, { 'department.position': regex }];
        }

        if (role) {
            if (role === 'Manager') {
                employeeQueryCriteria = {};
            } else if (role === 'Employee') {
                managementQueryCriteria = {};
            }
        }

        const managers = Object.keys(managementQueryCriteria).length > 1 ? await AdminSchema.find(managementQueryCriteria) : [];
        const employees = Object.keys(employeeQueryCriteria).length > 1 ? await EmployeeSchema.find(employeeQueryCriteria) : [];

        const result = [...managers, ...employees];
        if (result.length === 0) {
            return res.status(NOT_FOUND).json({
                success: false,
                status: NOT_FOUND,
                message: "No matching records found in your department.",
            });
        }

        res.status(OK).json({
            success: true,
            status: OK,
            message: result,
        });
    } catch (err) {
        next(err);
    }
};

export const getEmployeesSchedulesByInhaber = async (req, res, next) => {
    const inhaber_name = req.query.inhaber_name;
    const targetYear = req.query.year ? parseInt(req.query.year) : null; // Year is optional
    const targetMonth = req.query.month ? parseInt(req.query.month) - 1 : null; // Month is optional
    const targetDate = req.query.date ? new Date(req.query.date) : null; // Specific date is optional

    try {
        // Find the Inhaber and get their department name
        const inhaber = await AdminSchema.findOne({ name: inhaber_name, role: 'Inhaber' });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        const departmentName = inhaber.department_name;

        // Find all employees in the Inhaber's department
        const employees = await EmployeeSchema.find({ 'department.name': departmentName });
        const schedules = [];

        employees.forEach(employee => {
            employee.department.forEach(department => {
                if (department.name === departmentName) {
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
                }
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
    try {
        const inhaber = await AdminSchema.findOne({ name: inhaber_name, role: 'Inhaber' });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));
        const departmentName = inhaber.department_name;

        const shift = await ShiftSchema.findOne({ code: shiftCode });
        if (!shift) return next(createError(NOT_FOUND, "Shift not found!"));

        let employees;
        if (specificEmployeeID) {
            const employee = await EmployeeSchema.findOne({ id: specificEmployeeID, 'department.name': departmentName });
            if (!employee) return next(createError(NOT_FOUND, "Employee not found in the Inhaber's department!"));
            employees = [employee];
        } else {
            employees = await EmployeeSchema.find({ 'department.name': departmentName });
        }

        const results = [];
        for (const employee of employees) {
            const employeeDepartment = employee.department.find(dep => dep.name === departmentName);
            if (!employeeDepartment) continue;

            for (const date of dates) {
                const dateObj = new Date(date);
                let existingDateInDepartmentSchedule = employeeDepartment.schedules.find(schedule =>
                    schedule.date.getTime() === dateObj.getTime()
                );

                if (existingDateInDepartmentSchedule && existingDateInDepartmentSchedule.shift_design.some(design => design.shift_code === shiftCode)) {
                    return res.status(BAD_REQUEST).json({
                        success: false,
                        status: BAD_REQUEST,
                        message: `Shift with code ${shiftCode} already exists for ${date} in the employee's department.`
                    });
                }

                if (!existingDateInDepartmentSchedule) {
                    existingDateInDepartmentSchedule = {
                        date: dateObj,
                        shift_design: [{
                            position: req.body.position,
                            shift_code: shift.code,
                            time_slot: shift.time_slot,
                            shift_type: req.body.shift_type
                        }]
                    };
                    employeeDepartment.schedules.push(existingDateInDepartmentSchedule);
                }

                existingDateInDepartmentSchedule.shift_design.push({
                    position: req.body.position,
                    shift_code: shift.code,
                    time_slot: shift.time_slot,
                    shift_type: req.body.shift_type
                });
            }

            await employee.save();

            results.push({
                employee_id: employee.id,
                employee_name: employee.name,
                email: employee.email,
                department_name: departmentName,
                role: employee.role,
                position: req.body.position,
                schedule: employeeDepartment.schedules
            });
        }

        if (results.length === 0) {
            return res.status(NOT_FOUND).json({
                success: false,
                status: NOT_FOUND,
                message: "No schedules created. No employees found in the Inhaber's department."
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
    try {
        const inhaber = await AdminSchema.findOne({ name: inhaberName, role: 'Inhaber' });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));
        const departmentName = inhaber.department_name;

        const shiftDesigns = [];

        const employees = await EmployeeSchema.find({ 'department.name': departmentName });
        employees.forEach(employee => {
            const employeeDepartment = employee.department.find(dep => dep.name === departmentName);
            if (!employeeDepartment) return;

            employeeDepartment.schedules.forEach(schedule => {
                const scheduleDate = new Date(schedule.date);
                if ((!targetYear || scheduleDate.getFullYear() === targetYear) &&
                    (!targetMonth || scheduleDate.getMonth() === targetMonth) &&
                    (!targetDate || scheduleDate.getTime() === targetDate.getTime())) {

                    schedule.shift_design.forEach(shift => {
                        shiftDesigns.push({
                            employee_id: employee.id,
                            employee_name: employee.name,
                            date: scheduleDate,
                            department_name: departmentName,
                            position: shift.position,
                            shift_code: shift.shift_code,
                            time_slot: shift.time_slot,
                            shift_type: shift.shift_type,
                        });
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
    try {
        const inhaber_name = req.query.inhaber_name;
        const employeeID = req.query.employeeID;
        const year = req.query.year;
        const month = req.query.month;
        const dateString = req.query.date;

        if (!inhaber_name) {
            return res.status(BAD_REQUEST).json({
                success: false,
                status: BAD_REQUEST,
                message: "Inhaber name is required",
            });
        }

        const inhaber = await AdminSchema.findOne({ name: inhaber_name });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));
        const departmentName = inhaber.department_name;

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
            department_name: departmentName
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

export const getSalaryForEmployeeByInhaber = async (req, res, next) => {
    try {
        const inhaber_name = req.query.inhaber_name;
        const year = req.query.year ? parseInt(req.query.year) : null;
        const month = req.query.month ? parseInt(req.query.month) : null;

        if (!inhaber_name) {
            return res.status(BAD_REQUEST).json({
                success: false,
                status: BAD_REQUEST,
                message: "Inhaber name is a required parameter",
            });
        }

        const inhaber = await AdminSchema.findOne({ name: inhaber_name });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        const employees = await EmployeeSchema.find({ 'department.name': inhaber.department_name });
        const salaries = employees.map(employee => {
            let salary;
            if (year && month) {
                salary = employee.salary.find(s => s.year === year && s.month === month);
            } else {
                salary = employee.salary.length > 0 ? employee.salary[employee.salary.length - 1] : null;
            }

            return {
                employee_id: employee.id,
                employee_name: employee.name,
                email: employee.email,
                role: employee.role,
                position: employee.department.flatMap(d => d.position.join('/')).join(', '),
                department_name: employee.department.map(d => d.name).join(', '),
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
                message: "No salary records found in Inhaber's department.",
            });
        }
    } catch (err) {
        next(err);
    }
};

export const getAllRequestsForInhaber = async (req, res, next) => {
    const inhaber_name = req.query.inhaber_name;
    try {
        const inhaber = await AdminSchema.findOne({ name: inhaber_name });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        const employeesInDepartment = await EmployeeSchema.find({ 'department.name': inhaber.department_name });
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
        const inhaber = await AdminSchema.findOne({ name: inhaber_name });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        const request = await RequestSchema.findById(requestId).populate('employee_id');
        if (!request) return next(createError(NOT_FOUND, "Request not found!"));

        // Check if employee who made the request is in the Inhaber's department
        const employee = await EmployeeSchema.findOne({ id: request.employee_id, 'department.name': inhaber.department_name });
        if (!employee) return next(createError(NOT_FOUND, "Request not made by an employee in Inhaber's department"));

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
        const inhaber = await AdminSchema.findOne({ name: inhaber_name });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        const updateRequest = await RequestSchema.findById(requestId).populate('employee_id');
        if (!updateRequest) return next(createError(NOT_FOUND, "Request not found!"));

        // Check if the request is from an employee in the Inhaber's department
        const employee = await EmployeeSchema.findOne({ id: updateRequest.employee_id, 'department.name': inhaber.department_name });
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
