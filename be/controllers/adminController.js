import { createError } from "../utils/error.js";
import { BAD_REQUEST, NOT_FOUND, OK } from "../constant/HttpStatus.js";
import EmployeeSchema from "../models/EmployeeSchema.js";
import AttendanceSchema from "../models/AttendanceSchema.js";
import AdminSchema from "../models/AdminSchema.js";
import ShiftSchema from "../models/ShiftSchema.js";
import DepartmentSchema from "../models/DepartmentSchema.js";
import RequestSchema from "../models/RequestSchema.js";

export const updateEmployee = async (req, res, next) => {
    const employeeID = req.query.employeeID;
    try {
        const updateEmployee = await EmployeeSchema.findOneAndUpdate(
            { id: employeeID },
            { $set: req.body },
            { new: true }
        );

        if (!updateEmployee) {
            return next(createError(NOT_FOUND, "Employee not found!"));
        }

        const department = await DepartmentSchema.findOne({ name: updateEmployee.department_name });
        if (!department) {
            return next(createError(NOT_FOUND, "Department not found!"));
        }

        const employeeIndex = department.members.findIndex(member => member.id === updateEmployee.id);
        if (employeeIndex !== -1) {
            department.members[employeeIndex] = {
                id: updateEmployee.id,
                name: updateEmployee.name,
                email: updateEmployee.email,
                department_name: updateEmployee.department_name,
                role: updateEmployee.role,
                position: updateEmployee.position,
                status: updateEmployee.status,
            };

            await department.save();
            await updateEmployee.save();
            res.status(OK).json({
                success: true,
                status: OK,
                message: updateEmployee,
            });
        } else {
            res.status(NOT_FOUND).json({
                success: true,
                status: OK,
                message: "Can not found employee in department",
            });
        }
    } catch (err) {
        next(err);
    }
};

export const deleteEmployeeById = async (req, res, next) => {
    const employeeID = req.query.employeeID;
    try {
        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"));

        const department = await DepartmentSchema.findOne({ name: employee.department_name });
        if (!department) return next(createError(NOT_FOUND, "Department not found!"));

        department.members = department.members.filter(member => member.id !== employee.id);
        await department.save();

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


export const getAllEmployees = async (req, res, next) => {
    try {
        const employee = await EmployeeSchema.find();
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))
        res.status(OK).json({
            success: true,
            status: OK,
            message: employee,
        });
    } catch (err) {
        next(err);
    }
};

export const searchSpecific = async (req, res, next) => {
    const role = req.query.role;
    const department = req.query.department;
    const details = req.query.details;
    try {
        const regex = new RegExp(details, 'i');
        const managements = await AdminSchema.find();
        // console.log(managements);
        const matchedManagement = managements.filter(management => {
            return (management.role === "Inhaber" || management.role === "Manager");
        });
        if (matchedManagement.length === 0) {
            return res.status(NOT_FOUND).json({
                success: false,
                status: NOT_FOUND,
                message: "No managements found for the specified criteria.",
            });
        }

        const employees = await EmployeeSchema.find();
        if (!employees) return next(createError(NOT_FOUND, "Employees not found!"))

        let all_roles = [];
        all_roles.push(matchedManagement);
        all_roles.push(employees);
        const flattenedRoles = all_roles.flat();

        if (!role && !department && !details) {
            res.status(OK).json({
                success: true,
                status: OK,
                message: all_roles
            });
        }
        if (role && department && details) {
            const matchValue = flattenedRoles.filter(match_value => {
                const id = regex.test(match_value.id);
                const name = regex.test(match_value.name);
                const position = regex.test(match_value.position);

                return (
                    match_value.role === role &&
                    match_value.department_name === department &&
                    (id || name || position)
                );
            })
            if (matchValue !== 0) {
                res.status(OK).json({
                    success: true,
                    status: OK,
                    message: matchValue,
                });
            } else {
                res.status(OK).json({
                    success: true,
                    status: OK,
                    message: [],
                });
            }
        } else if (role && !department && details) {
            const matchValue = flattenedRoles.filter(match_value => {
                const id = regex.test(match_value.id);
                const name = regex.test(match_value.name);
                const position = regex.test(match_value.position);
                return (
                    match_value.role === role &&
                    (id || name || position)
                );
            })
            if (matchValue !== 0) {
                res.status(OK).json({
                    success: true,
                    status: OK,
                    message: matchValue,
                });
            } else {
                res.status(OK).json({
                    success: true,
                    status: OK,
                    message: [],
                });
            }
        } else if (!role && department && details) {
            const matchValue = flattenedRoles.filter(match_value => {
                const id = regex.test(match_value.id);
                const name = regex.test(match_value.name);
                const position = regex.test(match_value.position);
                return (
                    match_value.department_name === department &&
                    (id || name || position)
                );
            })
            if (matchValue !== 0) {
                res.status(OK).json({
                    success: true,
                    status: OK,
                    message: matchValue,
                });
            } else {
                res.status(OK).json({
                    success: true,
                    status: OK,
                    message: [],
                });
            }
        } else if (role && department && !details) {
            const matchValue = flattenedRoles.filter(match_value => {
                return (match_value.role === role && match_value.department_name === department);
            })
            if (matchValue !== 0) {
                res.status(OK).json({
                    success: true,
                    status: OK,
                    message: matchValue,
                });
            } else {
                res.status(OK).json({
                    success: true,
                    status: OK,
                    message: [],
                });
            }
        } else if (role && !department && !details) {
            const matchRole = flattenedRoles.filter(match_value => {
                return (match_value.role === role)
            });

            if (matchRole.length !== 0) {
                res.status(OK).json({
                    success: true,
                    status: OK,
                    message: matchRole,
                });
            } else {
                res.status(OK).json({
                    success: true,
                    status: OK,
                    message: [],
                });
            }
        } else if (!role && department && !details) {
            const matchDepartment = flattenedRoles.filter(match_value => {
                return (match_value.department_name === department)
            });

            if (matchDepartment.length !== 0) {
                res.status(OK).json({
                    success: true,
                    status: OK,
                    message: matchDepartment,
                });
            } else {
                res.status(OK).json({
                    success: true,
                    status: OK,
                    message: [],
                });
            }
        } else if (!role && !department && details) {
            const matchDetails = flattenedRoles.filter(match_value => {
                const id = regex.test(match_value.id);
                const name = regex.test(match_value.name);
                const position = regex.test(match_value.position);
                return (id || name || position);
            });

            if (matchDetails !== 0) {
                res.status(OK).json({
                    success: true,
                    status: OK,
                    message: matchDetails,
                });
            } else {
                res.status(OK).json({
                    success: true,
                    status: OK,
                    message: [],
                });
            }
        }
    } catch (err) {
        next(err);
    }
};

export const getEmployeeSpecific = async (req, res, next) => {
    const query = req.query.query;
    try {
        if (!query) {
            const employee = await EmployeeSchema.find();
            if (!employee) return next(createError(NOT_FOUND, "Employees not found!"))

            res.status(OK).json({
                success: true,
                status: OK,
                message: employee,
            });
        }
        const regex = new RegExp(query, 'i');
        const employeeName = await EmployeeSchema.find({ name: regex });
        const employeeID = await EmployeeSchema.find({ id: regex });
        const employeeRole = await EmployeeSchema.find({ role: query });
        const employeePosition = await EmployeeSchema.find({ position: query });

        if (employeeName.length !== 0) {
            res.status(OK).json({
                success: true,
                status: OK,
                message: employeeName,
            });
        } else if (employeeID.length !== 0) {
            res.status(OK).json({
                success: true,
                status: OK,
                message: employeeID,
            });
        } else if (employeeRole.length !== 0) {
            res.status(OK).json({
                success: true,
                status: OK,
                message: employeeRole,
            });
        } else if (employeePosition.length !== 0) {
            res.status(OK).json({
                success: true,
                status: OK,
                message: employeePosition,
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

export const getEmployeesByDate = async (req, res, next) => {
    try {
        const targetDate = new Date(req.body.date);

        // Find all employees
        const employees = await EmployeeSchema.find();

        // Filter employees based on the target date and shift code
        const matchedEmployees = employees.filter(employee => {
            const matchedSchedules = employee.schedules.filter(schedule => {
                return schedule.date.getTime() === targetDate.getTime();
            });

            return matchedSchedules.length > 0;
        });

        res.status(OK).json({
            success: true,
            status: OK,
            message: matchedEmployees,
        });
    } catch (err) {
        next(err);
    }
};

export const getEmployeesByDateAndShift = async (req, res, next) => {
    try {
        const targetDate = new Date(req.body.date);
        const targetShiftCode = req.body.shift_code;

        const shift = await ShiftSchema.findOne({ code: targetShiftCode });
        if (!shift) return next(createError(NOT_FOUND, "Shift not found!"))

        // Find all employees
        const employees = await EmployeeSchema.find();

        // Filter employees based on the target date and shift code
        const matchedEmployees = employees.filter(employee => {
            const matchedSchedules = employee.schedules.filter(schedule => {
                return (
                    schedule.date.getTime() === targetDate.getTime() &&
                    schedule.shift_design.some(shift => shift.shift_code === targetShiftCode)
                );
            });

            return matchedSchedules.length > 0;
        });

        res.status(OK).json({
            success: true,
            status: OK,
            message: matchedEmployees,
        });
    } catch (err) {
        next(err);
    }
};

export const getAllEmployeeAttendance = async (req, res, next) => {
    try {
        const year = req.query.year;
        const month = req.query.month;
        const dateString = req.query.date;

        // Ensure valid year and month inputs
        if (!year || !month) {
            return res.status(BAD_REQUEST).json({
                success: false,
                status: BAD_REQUEST,
                message: "Year and month are required parameters",
            });
        }

        let date = null;

        if (dateString) {
            date = new Date(dateString);

            // Check if the date is valid
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
                $lt: new Date(year, month - 1, date.getDate(), 23, 59, 59, 999),
            }
            : {
                $gte: new Date(year, month - 1, 1, 0, 0, 0, 0),
                $lt: new Date(year, month, 0, 23, 59, 59, 999),
            };

        const employeeAttendance = await AttendanceSchema.find({
            date: dateRange,
        });

        return res.status(OK).json({
            success: true,
            status: OK,
            message: employeeAttendance,
        });
    } catch (err) {
        next(err);
    }
};


export const getEmployeeAttendance = async (req, res, next) => {
    try {
        const employeeID = req.params.employeeID;
        const year = req.query.year;
        const month = req.query.month;
        const dateString = req.query.date;

        // Ensure valid year, month, and employee ID inputs
        if (!year || !month || !employeeID) {
            return res.status(BAD_REQUEST).json({
                success: false,
                status: BAD_REQUEST,
                message: "Year, month, and employee ID are required parameters",
            });
        }

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
                $lt: new Date(year, month - 1, date.getDate(), 23, 59, 59, 999),
            }
            : {
                $gte: new Date(year, month - 1, 1, 0, 0, 0, 0),
                $lt: new Date(year, month, 0, 23, 59, 59, 999),
            };

        const employeeAttendance = await AttendanceSchema.find({
            employee_id: employeeID,
            date: dateRange,
        });

        return res.status(OK).json({
            success: true,
            status: OK,
            message: employeeAttendance,
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





