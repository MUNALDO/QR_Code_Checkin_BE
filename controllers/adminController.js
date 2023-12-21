import { createError } from "../utils/error.js";
import { BAD_REQUEST, NOT_FOUND, OK } from "../constant/HttpStatus.js";
import EmployeeSchema from "../models/EmployeeSchema.js";
import AttendanceSchema from "../models/AttendanceSchema.js";
import AdminSchema from "../models/AdminSchema.js";
// import ShiftSchema from "../models/ShiftSchema.js";
import DepartmentSchema from "../models/DepartmentSchema.js";
import RequestSchema from "../models/RequestSchema.js";
import DayOffSchema from "../models/DayOffSchema.js";
import cron from 'node-cron';

export const updateEmployeeBasicInfor = async (req, res, next) => {
    const employeeID = req.query.employeeID;
    try {
        const updatedEmployee = await EmployeeSchema.findOneAndUpdate(
            { id: employeeID },
            { $set: req.body },
            { new: true }
        );

        if (!updatedEmployee) {
            return next(createError(NOT_FOUND, "Employee not found!"));
        }
        if (updatedEmployee.status === "inactive") {
            return next(createError(NOT_FOUND, "Employee not active!"));
        }

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

export const madeEmployeeInactive = async (req, res, next) => {
    const employeeID = req.query.employeeID;
    try {
        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"));
        if (employee.status === "inactive") return next(createError(NOT_FOUND, "Employee already inactive!"));

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
            message: "Employee will be made inactive on the specified date."
        });
    } catch (err) {
        next(err);
    }
};

export const deleteEmployeeById = async (req, res, next) => {
    const employeeID = req.query.employeeID;
    try {
        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"));

        // Remove the employee from all departments
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

export const searchSpecific = async (req, res, next) => {
    const { role, department, details, status } = req.query;
    try {
        const regex = new RegExp(details, 'i');
        let managementQueryCriteria = {};
        let employeeQueryCriteria = {};

        if (role) {
            if (role === 'Employee') {
                // When role is specifically 'Employee', exclude management search
                managementQueryCriteria = null;
                employeeQueryCriteria['role'] = 'Employee';
            } else {
                // For other roles, include them in management search
                managementQueryCriteria['role'] = role;
                // Include for employees if role is specified and not 'Employee'
                employeeQueryCriteria['role'] = role;
            }
        } else {
            // Default to 'Inhaber' and 'Manager' for management search
            managementQueryCriteria['role'] = { $in: ['Inhaber', 'Manager'] };
            employeeQueryCriteria['role'] = 'Employee';
        }

        if (status) {
            if (managementQueryCriteria) managementQueryCriteria['status'] = status;
            employeeQueryCriteria['status'] = status;
        }

        if (details) {
            if (managementQueryCriteria) {
                managementQueryCriteria['$or'] = [{ id: regex }, { name: regex }];
            }
            employeeQueryCriteria['$or'] = [{ id: regex }, { name: regex }, { 'department.position': regex }];
        }

        if (department) {
            if (managementQueryCriteria) managementQueryCriteria['department_name'] = department;
            employeeQueryCriteria['department.name'] = department;
        }

        let managements = [];
        let employees = [];

        if (managementQueryCriteria) {
            managements = await AdminSchema.find(managementQueryCriteria);
        }
        if (Object.keys(employeeQueryCriteria).length > 0) {
            employees = await EmployeeSchema.find(employeeQueryCriteria);
        }

        const result = [...managements, ...employees];

        if (result.length === 0) {
            return res.status(NOT_FOUND).json({
                success: false,
                status: NOT_FOUND,
                message: "No matching records found.",
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

export const getAllEmployeesSchedules = async (req, res, next) => {
    const targetYear = parseInt(req.query.year);
    const targetMonth = req.query.month ? parseInt(req.query.month) - 1 : null; // Month is optional
    const targetDate = req.query.date ? new Date(req.query.date) : null; // Specific date is optional
    const departmentFilter = req.query.department_name;
    try {
        const employees = await EmployeeSchema.find();
        const schedules = [];

        employees.forEach(employee => {
            employee.department.forEach(department => {
                // Check if department matches the filter (if provided)
                if (!departmentFilter || department.name === departmentFilter) {
                    department.schedules.forEach(schedule => {
                        const scheduleDate = new Date(schedule.date);

                        if (scheduleDate.getFullYear() === targetYear &&
                            (targetMonth === null || scheduleDate.getMonth() === targetMonth) &&
                            (!targetDate || scheduleDate.toISOString().split('T')[0] === targetDate.toISOString().split('T')[0])) {
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
                message: "No schedules found for the specified criteria."
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

export const getAttendance = async (req, res, next) => {
    try {
        const employeeID = req.query.employeeID;
        const departmentName = req.query.department_name;
        const year = req.query.year;
        const month = req.query.month;
        const dateString = req.query.date;

        // Validate year and month inputs
        if (!year || !month) {
            return res.status(BAD_REQUEST).json({
                success: false,
                status: BAD_REQUEST,
                message: "Year and month are required parameters",
            });
        }

        // Parse date if provided
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

        const dateRange = date
            ? {
                $gte: new Date(year, month - 1, date.getDate(), 0, 0, 0, 0),
                $lt: new Date(year, month - 1, date.getDate() + 1, 0, 0, 0, 0),
            }
            : {
                $gte: new Date(year, month - 1, 1),
                $lt: new Date(year, month, 1),
            };

        let query = { date: dateRange };

        if (employeeID) {
            query.employee_id = employeeID;
        }

        if (departmentName) {
            query['department_name'] = departmentName;
        }

        // Execute the query
        const attendances = await AttendanceSchema.find(query).lean();

        // Respond with the attendances
        return res.status(OK).json({
            success: true,
            status: OK,
            message: attendances,
        });
    } catch (err) {
        next(err);
    }
};

export const getAllRequests = async (req, res, next) => {
    try {
        const requests = await RequestSchema.find();
        return res.status(OK).json({
            success: true,
            status: OK,
            message: requests,
        });
    } catch (err) {
        next(err);
    }
};

export const getRequestById = async (req, res, next) => {
    try {
        const request = await RequestSchema.find({ _id: req.params._id });
        if (!request) return next(createError(NOT_FOUND, "Request not found!"));

        return res.status(OK).json({
            success: true,
            status: OK,
            message: request,
        });
    } catch (err) {
        next(err);
    }
};

export const handleRequest = async (req, res, next) => {
    try {
        const updateRequest = await RequestSchema.findOneAndUpdate(
            { _id: req.params._id },
            { $set: { answer_status: req.body.answer_status } },
            { new: true }
        );
        if (!updateRequest) return next(createError(NOT_FOUND, "Request not found!"));

        const day_off = await DayOffSchema.findOne({
            date_start: new Date(updateRequest.request_dayOff_start),
            date_end: new Date(updateRequest.request_dayOff_end),
        });
        if (!day_off) return next(createError(NOT_FOUND, "Day Off not found!"));

        const employee = await EmployeeSchema.findOne({ id: updateRequest.employee_id });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"));
        if (employee.status === "inactive") return next(createError(NOT_FOUND, "Employee not active!"));

        if (updateRequest.answer_status === "approved") {
            day_off.allowed = true;
            await day_off.save();
            const employeeDayOff = employee.dayOff_schedule.find(dayOffSchedule =>
                dayOffSchedule.date_start.getTime() === day_off.date_start.getTime() &&
                dayOffSchedule.date_end.getTime() === day_off.date_end.getTime()
            );

            employeeDayOff.allowed = true;
            employee.realistic_day_off = employee.realistic_day_off - day_off.duration;

            employee.markModified('dayOff_schedule');
            await employee.save();
        } else if (updateRequest.answer_status === "denied") {
            employee.dayOff_schedule = employee.dayOff_schedule.filter(dayOffSchedule =>
                dayOffSchedule.date_start.getTime() !== day_off.date_start.getTime() ||
                dayOffSchedule.date_end.getTime() !== day_off.date_end.getTime()
            );
            await employee.save();
            await DayOffSchema.findOneAndDelete({ _id: req.params._id });
        }
        res.status(OK).json({
            success: true,
            status: OK,
            message: updateRequest,
        });
    } catch (err) {
        next(err);
    }
}





