import { BAD_REQUEST, CREATED, FORBIDDEN, NOT_FOUND, OK } from "../constant/HttpStatus.js";
import AttendanceSchema from "../models/AttendanceSchema.js";
import CarSchema from "../models/CarSchema.js";
import DayOffSchema from "../models/DayOffSchema.js";
import DepartmentSchema from "../models/DepartmentSchema.js";
import EmployeeSchema from "../models/EmployeeSchema.js";
import RequestSchema from "../models/RequestSchema.js";
import ShiftSchema from "../models/ShiftSchema.js";
import StatsSchema from "../models/StatsSchema.js";
import { createError } from "../utils/error.js";
import wifi from 'node-wifi';
import { s3Client } from "../awsConfig.js";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import nodemailer from 'nodemailer';

wifi.init({
    iface: null,
});

export const verifyWifi = async (req, res, next) => {
    const employeeID = req.query.employeeID;
    const employeeName = req.query.employeeName;
    const department_name = req.query.department_name;
    try {
        const employee = await EmployeeSchema.findOne({ id: employeeID, name: employeeName });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found"))

        const department = await DepartmentSchema.findOne({ name: department_name });
        if (!department) return next(createError(NOT_FOUND, "Department not found!"));
        // if (!department.members.includes(employee)) return next(createError(CONFLICT, "Employee not exists in the department!"));

        const currentConnections = await wifi.getCurrentConnections();
        // console.log(currentConnections);

        if (currentConnections.length > 0) {
            const connectedSSID = currentConnections[0].ssid;
            const allowedSSID = department.wifi_name;

            if (connectedSSID === allowedSSID) {
                // console.log(`Device connected to Wi-Fi with SSID: ${allowedSSID}`);
                res.status(OK).json({
                    success: true,
                    status: OK,
                    message: `Device connected to Wi-Fi with SSID: ${allowedSSID}`
                });
            } else {
                // console.log(`Device is not connected to the allowed Wi-Fi SSID.`);
                res.status(FORBIDDEN).json({
                    success: false,
                    status: FORBIDDEN,
                    message: `Device is not connected to the allowed Wi-Fi SSID.`
                });
            }
        } else {
            // console.log(`Device is not connected to any Wi-Fi network.`);
            res.status(FORBIDDEN).json({
                success: false,
                status: FORBIDDEN,
                message: `Device is not connected to any Wi-Fi network.`
            });
        }
    } catch (err) {
        console.error('Error checking Wi-Fi SSID:', err);
        next(err);
    }
}

export const collectIP = async (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    try {
        return res.status(OK).json({
            success: true,
            status: OK,
            message: ip,
        });
    } catch (error) {
        console.log(error);
    }
}

export const cleanUpOldSchedules = async () => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    try {
        await EmployeeSchema.updateMany(
            {},
            { $pull: { 'department.$[].schedules': { date: { $lt: oneYearAgo } } } }
        );
        console.log('Old schedules cleaned up successfully');
    } catch (err) {
        console.error('Error cleaning up old schedules:', err);
    }
};

export const autoCheck = async (req, res, next) => {
    try {
        const employees = await EmployeeSchema.find({ status: 'active' });
        for (const employee of employees) {
            await processEmployeeAttendance(employee);
        }
        console.log('Attendance processed successfully');
    } catch (error) {
        console.error('Error in processing attendance:', error);
    }
};

const processEmployeeAttendance = async (employee) => {
    const currentDateTime = new Date();
    const currentDate = currentDateTime.toDateString();
    let shiftProcessed = false;

    for (const department of employee.department) {
        for (const schedule of department.schedules) {
            if (schedule.date.toDateString() === currentDate) {
                await processScheduleShifts(employee, department, schedule, currentDateTime);
                shiftProcessed = true;
            }
        }
    }

    if (!shiftProcessed) {
        console.log('No matching shift design found for current time for employee:', employee.id);
    }
};

const processScheduleShifts = async (employee, department, schedule, currentDateTime) => {
    for (const shift of schedule.shift_design) {
        const shiftTimes = getShiftTimes(currentDateTime, shift.time_slot);
        if (isShiftTimeElapsed(shiftTimes, currentDateTime)) {
            await checkAndUpdateAttendance(employee, department, schedule, shift, shiftTimes);
        }
    }
};

const getShiftTimes = (currentDateTime, timeSlot) => {
    const [startHours, startMinutes] = timeSlot.start_time.split(':').map(Number);
    const [endHours, endMinutes] = timeSlot.end_time.split(':').map(Number);

    return {
        shiftStartTime: new Date(currentDateTime.getFullYear(), currentDateTime.getMonth(), currentDateTime.getDate(), startHours, startMinutes),
        shiftEndTime: new Date(currentDateTime.getFullYear(), currentDateTime.getMonth(), currentDateTime.getDate(), endHours, endMinutes),
        endHours, endMinutes
    };
};

const isShiftTimeElapsed = (shiftTimes, currentDateTime) => {
    const endTimePlus30 = new Date(shiftTimes.shiftEndTime);
    endTimePlus30.setMinutes(endTimePlus30.getMinutes() + 5);
    return currentDateTime > endTimePlus30;
};

const checkAndUpdateAttendance = async (employee, department, schedule, shift, shiftTimes) => {
    const existingAttendance = await AttendanceSchema.findOne({
        employee_id: employee.id,
        date: schedule.date,
        'shift_info.shift_code': shift.shift_code
    });

    if (!existingAttendance) {
        await createMissingAttendance(employee, department, schedule, shift);
    } else {
        await updateExistingAttendance(employee, department, existingAttendance, shiftTimes);
    }
};

const createMissingAttendance = async (employee, department, schedule, shift) => {
    const currentTime = new Date();
    const currentYear = currentTime.getFullYear();
    const currentMonth = currentTime.getMonth() + 1;
    const newAttendance = new AttendanceSchema({
        date: schedule.date,
        employee_id: employee.id,
        employee_name: employee.name,
        role: employee.role,
        department_name: department.name,
        position: employee.position,
        shift_info: {
            shift_code: shift.shift_code,
            total_hour: 0,
            total_minutes: 0,
        },
        check_in_km: 0,
        check_out_km: 0,
        total_km: 0,
        status: "missing",
    });
    const departmentIndex = employee.department.findIndex(dep => dep.name === department.name);
    const statsIndex = employee.department[departmentIndex].attendance_stats.findIndex(stat =>
        stat.year === currentYear && stat.month === currentMonth
    );

    if (statsIndex > -1) {
        employee.department[departmentIndex].attendance_stats[statsIndex].date_missing += 1;
    } else {
        const newStat = {
            year: currentYear,
            month: currentMonth,
            date_on_time: 0,
            date_late: 0,
            date_missing: 1,
        };
        employee.department[departmentIndex].attendance_stats.push(newStat);
    }
    await newAttendance.save();
    await employee.save();
    console.log('Missing attendance created for employee:', employee.id);

    let stats = await StatsSchema.findOne({
        employee_id: employee.id,
        year: currentYear,
        month: currentMonth
    });
    if (stats) {
        stats.attendance_total_times = stats.attendance_total_times;
        stats.attendance_overtime = stats.attendance_total_times - stats.default_schedule_times;
        await stats.save();
    } else {
        console.log("Employee's stats not found");
    }
};

const updateExistingAttendance = async (employee, department, attendance, shiftTimes) => {
    const currentTime = new Date();
    const currentYear = currentTime.getFullYear();
    const currentMonth = currentTime.getMonth() + 1;
    if (attendance.shift_info.time_slot.check_in && !attendance.shift_info.time_slot.check_out) {
        const checkInTimeString = attendance.shift_info.time_slot.check_in_time;
        const checkInTime = new Date(`${currentTime.toDateString()} ${checkInTimeString}`);

        if (isNaN(checkInTime)) {
            return res.status(BAD_REQUEST).json({
                success: false,
                status: BAD_REQUEST,
                message: `Error parsing check-in time: ${checkInTimeString}`,
            });
        }
        // check out late
        attendance.shift_info.time_slot.check_out = true;
        attendance.shift_info.time_slot.check_out_time = `${shiftTimes.endHours}: ${shiftTimes.endMinutes}`;
        attendance.shift_info.time_slot.check_out_status = 'late';
        attendance.status = 'checked';
        attendance.isAuto = true;
        const checkOutTimeString = attendance.shift_info.time_slot.check_out_time;
        const checkOutTime = new Date(`${currentTime.toDateString()} ${checkOutTimeString}`);

        if (isNaN(checkOutTime)) {
            // Handle the case where parsing fails
            return res.status(BAD_REQUEST).json({
                success: false,
                status: BAD_REQUEST,
                message: `Error parsing check-in time: ${checkOutTimeString}`,
            });
        }
        const timeDifference = checkOutTime - checkInTime;
        const totalHours = Math.floor(timeDifference / (1000 * 60 * 60));
        const totalMinutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
        attendance.shift_info.total_hour = totalHours;
        attendance.shift_info.total_minutes = totalMinutes;
        const total_times = totalHours + totalMinutes / 60;

        const departmentIndex = employee.department.findIndex(dep => dep.name === department.name);
        const statsIndex = employee.department[departmentIndex].attendance_stats.findIndex(stat =>
            stat.year === currentYear && stat.month === currentMonth
        );

        if (statsIndex > -1) {
            if (attendance.shift_info.time_slot.check_in_status = 'on time') {
                employee.department[departmentIndex].attendance_stats[statsIndex].date_on_time += 0.5;
                employee.department[departmentIndex].attendance_stats[statsIndex].date_late += 0.5;
            } else {
                employee.department[departmentIndex].attendance_stats[statsIndex].date_late += 1;
            }
        } else {
            if (attendance.shift_info.time_slot.check_in_status = 'on time') {
                const newStat = {
                    year: currentYear,
                    month: currentMonth,
                    date_on_time: 0.5,
                    date_late: 0.5,
                    date_missing: 0,
                };
                employee.department[departmentIndex].attendance_stats.push(newStat);
            } else {
                const newStat = {
                    year: currentYear,
                    month: currentMonth,
                    date_on_time: 0,
                    date_late: 1,
                    date_missing: 0,
                };
                employee.department[departmentIndex].attendance_stats.push(newStat);
            }
        }
        await attendance.save();
        await employee.save();
        console.log('Attendance updated for employee:', attendance.employee_id);

        let stats = await StatsSchema.findOne({
            employee_id: employee.id,
            year: currentYear,
            month: currentMonth
        });
        if (stats) {
            stats.attendance_total_times = stats.attendance_total_times + total_times;
            stats.attendance_overtime = stats.attendance_total_times - stats.default_schedule_times;
            await stats.save();
        } else {
            console.log("Employee's stats not found");
        }
    } else {
        console.log('No update required for employee:', attendance.employee_id);
    }
};

export const checkAttendance = async (req, res, next) => {
    const employeeID = req.body.employeeID;
    const employeeName = req.body.employeeName;
    try {
        const employee = await EmployeeSchema.findOne({ id: employeeID, name: employeeName });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found"));
        if (employee.status === "inactive") return next(createError(NOT_FOUND, "Employee not active!"));

        const currentTime = new Date();
        let currentShiftDesign = null;
        let currentDepartment = null;
        let currentDateDesign = null;

        // Iterate over each department to find schedule for current day
        for (const department of employee.department) {
            const dateDesign = department.schedules.find(schedule =>
                schedule.date.toDateString() === currentTime.toDateString()
            );

            if (dateDesign) {
                // Collect time ranges from shift_design
                for (const shift of dateDesign.shift_design) {
                    const [startHours, startMinutes] = shift.time_slot.start_time.split(':').map(Number);
                    const [endHours, endMinutes] = shift.time_slot.end_time.split(':').map(Number);

                    const shiftStartTime = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), startHours, startMinutes);
                    const shiftEndTime = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), endHours, endMinutes);
                    const endOfDay = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), 23, 59, 59, 999);

                    const startTimeMinus30 = new Date(shiftStartTime);
                    startTimeMinus30.setMinutes(shiftStartTime.getMinutes() - 30);

                    const endTimePlus30 = new Date(shiftEndTime);
                    endTimePlus30.setMinutes(endTimePlus30.getMinutes() + 30);
                    if (shiftEndTime < endOfDay) {
                        // Compare currentTimestamp with the adjusted time range
                        if (currentTime.getTime() >= startTimeMinus30.getTime() && currentTime.getTime() <= endTimePlus30.getTime()) {
                            currentShiftDesign = shift;
                            currentDepartment = department.name;
                            currentDateDesign = dateDesign;
                            break;
                        }
                    } else {
                        return res.status(BAD_REQUEST).json({
                            success: false,
                            status: BAD_REQUEST,
                            message: `Err!`,
                        });
                    }
                }

                if (currentShiftDesign) {
                    break;
                }
            }
        }
        if (!currentShiftDesign) return next(createError(NOT_FOUND, 'No matching shift design found for current time'));

        // Check if attendance already exists for this shift on current day
        const existingAttendance = await AttendanceSchema.findOne({
            employee_id: employee.id,
            employee_name: employee.name,
            date: {
                $gte: new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), 0, 0, 0, 0),
                $lt: new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), 23, 59, 59, 999),
            },
            'shift_info.shift_code': currentShiftDesign.shift_code,
        });

        const time_slot = currentShiftDesign.time_slot;
        if (!existingAttendance) {
            // only check in
            const newAttendance = new AttendanceSchema({
                date: currentDateDesign.date,
                employee_id: employeeID,
                employee_name: employee.name,
                role: employee.role,
                department_name: currentDepartment,
                position: currentShiftDesign.position,
                shift_info: {
                    shift_code: currentShiftDesign.shift_code,
                    shift_type: currentShiftDesign.shift_type,
                }
            });
            const [endHours, endMinutes] = time_slot.end_time.split(':').map(Number);
            const endTime = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), endHours, endMinutes);
            const [startHours, startMinutes] = time_slot.start_time.split(':').map(Number);
            const startTime = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), startHours, startMinutes);
            // Calculate startTime - 30 minutes
            const startTimeMinus30 = new Date(startTime);
            startTimeMinus30.setMinutes(startTime.getMinutes() - 30);

            // Calculate startTime
            const startTimeOrigin = new Date(startTime);
            startTimeOrigin.setMinutes(startTime.getMinutes());
            if (currentTime > startTimeMinus30 && currentTime < startTimeOrigin) {
                // check in on time
                newAttendance.shift_info.time_slot.check_in = true;
                newAttendance.shift_info.time_slot.check_in_time = `${currentTime.toLocaleTimeString()}`;
                newAttendance.shift_info.time_slot.check_in_status = 'on time';
                await newAttendance.save();
                return res.status(CREATED).json({
                    success: true,
                    status: CREATED,
                    message: newAttendance,
                    log: `${currentTime}`,
                });
            } else if (currentTime > startTimeOrigin && currentTime < endTime) {
                // check in late
                newAttendance.shift_info.time_slot.check_in = true;
                newAttendance.shift_info.time_slot.check_in_time = `${currentTime.toLocaleTimeString()}`;
                newAttendance.shift_info.time_slot.check_in_status = 'late';
                await newAttendance.save();
                return res.status(CREATED).json({
                    success: true,
                    status: CREATED,
                    message: newAttendance,
                    log: `${currentTime}`,
                });
            } else if (currentTime < startTimeMinus30) {
                // check in too soon
                return res.status(BAD_REQUEST).json({
                    success: false,
                    status: BAD_REQUEST,
                    message: `You can not check in at this time ${currentTime.toLocaleTimeString()}`,
                });
            }
        } else {
            // only check out
            if (existingAttendance.shift_info.time_slot.check_in != true) {
                return res.status(BAD_REQUEST).json({
                    success: false,
                    status: BAD_REQUEST,
                    message: "You haven't check in yet",
                });
            } else if (existingAttendance.shift_info.time_slot.check_in == true && existingAttendance.shift_info.time_slot.check_out != true) {
                const checkInTimeString = existingAttendance.shift_info.time_slot.check_in_time;
                const checkInTime = new Date(`${currentTime.toDateString()} ${checkInTimeString}`);
                if (isNaN(checkInTime)) {
                    // Handle the case where parsing fails
                    return res.status(BAD_REQUEST).json({
                        success: false,
                        status: BAD_REQUEST,
                        message: `Error parsing check-in time: ${checkInTimeString}`,
                    });
                }
                const [startHours, startMinutes] = time_slot.start_time.split(':').map(Number);
                const startTime = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), startHours, startMinutes);
                // const startTimeCheckIn = new Date(startTime);
                const [endHours, endMinutes] = time_slot.end_time.split(':').map(Number);
                const endTime = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), endHours, endMinutes);
                // Calculate endTime + 30 minutes
                const endTimePlus30 = new Date(endTime);
                endTimePlus30.setMinutes(endTime.getMinutes() + 30);
                const departmentIndex = employee.department.findIndex(dep => dep.name === currentDepartment);
                const currentYear = currentTime.getFullYear();
                const currentMonth = currentTime.getMonth() + 1;
                if (currentTime > startTime && currentTime < endTimePlus30) {
                    // check out on time
                    existingAttendance.shift_info.time_slot.check_out = true;
                    existingAttendance.shift_info.time_slot.check_out_time = `${currentTime.toLocaleTimeString()}`;
                    existingAttendance.shift_info.time_slot.check_out_status = 'on time';
                    existingAttendance.status = 'checked';
                    const timeDifference = currentTime - checkInTime;
                    const totalHours = Math.floor(timeDifference / (1000 * 60 * 60));
                    const totalMinutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
                    existingAttendance.shift_info.total_hour = totalHours;
                    existingAttendance.shift_info.total_minutes = totalMinutes;
                    await existingAttendance.save();

                    // Find the current year and month in attendance_stats of the department
                    const statsIndex = employee.department[departmentIndex].attendance_stats.findIndex(stat =>
                        stat.year === currentYear && stat.month === currentMonth
                    );

                    if (statsIndex > -1) {
                        if (existingAttendance.shift_info.time_slot.check_in_status === "on time") {
                            employee.department[departmentIndex].attendance_stats[statsIndex].date_on_time += 1;
                        } else {
                            employee.department[departmentIndex].attendance_stats[statsIndex].date_on_time += 0.5;
                            employee.department[departmentIndex].attendance_stats[statsIndex].date_late += 0.5;
                        }
                    } else {
                        if (existingAttendance.shift_info.time_slot.check_in_status === "on time") {
                            const newStat = {
                                year: currentYear,
                                month: currentMonth,
                                date_on_time: 1,
                                date_late: 0,
                                date_missing: 0,
                            };
                            employee.department[departmentIndex].attendance_stats.push(newStat);
                        } else {
                            const newStat = {
                                year: currentYear,
                                month: currentMonth,
                                date_on_time: 0.5,
                                date_late: 0.5,
                                date_missing: 0,
                            };
                            employee.department[departmentIndex].attendance_stats.push(newStat);
                        }
                    }
                    await employee.save();
                    const total_times = totalHours + totalMinutes / 60;
                    let stats = await StatsSchema.findOne({
                        employee_id: employeeID,
                        year: currentYear,
                        month: currentMonth
                    });
                    if (stats) {
                        stats.attendance_total_times = stats.attendance_total_times + total_times;
                        stats.attendance_overtime = stats.attendance_total_times - stats.default_schedule_times;
                        await stats.save();
                    } else {
                        console.log("Employee's stats not found");
                    }

                    return res.status(OK).json({
                        success: true,
                        status: OK,
                        message: existingAttendance,
                    });
                } else if (currentTime > endTimePlus30 || currentTime < startTime) {
                    return res.status(BAD_REQUEST).json({
                        success: false,
                        status: BAD_REQUEST,
                        message: `You can not check out at this time ${currentTime.toLocaleTimeString()}`,
                    });
                } else {
                    return res.status(BAD_REQUEST).json({
                        success: false,
                        status: BAD_REQUEST,
                        message: `Err!`,
                    });
                }
            } else if (existingAttendance.shift_info.time_slot.check_in == true && existingAttendance.shift_info.time_slot.check_out == true) {
                return res.status(BAD_REQUEST).json({
                    success: false,
                    status: BAD_REQUEST,
                    message: "You have already check out",
                });
            }
        };
    } catch (err) {
        next(err);
    }
}

async function uploadImageToS3(file) {
    const uploadParams = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: `${file.originalname}-${Date.now()}`,
        Body: file.buffer,
        ContentType: file.mimetype
    };

    try {
        const command = new PutObjectCommand(uploadParams);
        await s3Client.send(command);
        return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploadParams.Key}`;
    } catch (error) {
        throw error;
    }
}

export const updateAttendance = async (req, res, next) => {
    const attendanceID = req.query.attendanceID;
    try {
        const existingAttendance = await AttendanceSchema.findById(attendanceID);
        if (!existingAttendance) {
            return res.status(NOT_FOUND).json({
                success: false,
                status: NOT_FOUND,
                message: "Attendance not found!",
            });
        } else {
            if (existingAttendance.position === "Autofahrer") {
                if (existingAttendance.shift_info.time_slot.check_in === true && existingAttendance.shift_info.time_slot.check_out !== true) {
                    existingAttendance.car_info.car_type = req.body.car_type;
                    if (existingAttendance.car_info.car_type === "company") {
                        existingAttendance.car_info.car_name === req.body.car_name;

                        const carCompany = await CarSchema.findOne({ car_name: req.body.car_name });
                        if (!carCompany) return next(createError(NOT_FOUND, "Car Company not found!"));

                        existingAttendance.car_info.car_number = carCompany.car_number;
                        existingAttendance.car_info.register_date = carCompany.register_date;
                    } else if (existingAttendance.car_info.car_type === "private") {
                        const carCompany = await CarSchema.findOne({ car_name: "Private" });
                        if (!carCompany) return next(createError(NOT_FOUND, "Car Company not found!"));

                        existingAttendance.car_info.car_name === carCompany.car_name;
                        existingAttendance.car_info.car_number = carCompany.car_number;
                        existingAttendance.car_info.register_date = carCompany.register_date;
                    }
                    if (!req.body.check_in_km) {
                        return res.status(BAD_REQUEST).json({
                            success: false,
                            status: BAD_REQUEST,
                            message: "check in km is required",
                        });
                    }
                    existingAttendance.check_in_km = req.body.check_in_km;
                    existingAttendance.isAuto = false;
                    await existingAttendance.save();

                    return res.status(OK).json({
                        success: true,
                        status: OK,
                        message: existingAttendance,
                    });
                } else if (existingAttendance.shift_info.time_slot.check_in === true && existingAttendance.shift_info.time_slot.check_out === true) {
                    if (!req.body.check_out_km) {
                        return res.status(BAD_REQUEST).json({
                            success: false,
                            status: BAD_REQUEST,
                            message: "check out km is required",
                        });
                    }
                    existingAttendance.check_out_km = req.body.check_out_km;
                    existingAttendance.total_km = existingAttendance.check_out_km - existingAttendance.check_in_km;
                    existingAttendance.isAuto = false;
                    await existingAttendance.save();

                    return res.status(OK).json({
                        success: true,
                        status: OK,
                        message: existingAttendance,
                    });
                }
            } else if (existingAttendance.position === "Service") {
                if (existingAttendance.shift_info.time_slot.check_in === true && existingAttendance.shift_info.time_slot.check_out === true) {
                    existingAttendance.bar = req.body.bar;
                    existingAttendance.gesamt = req.body.gesamt;
                    existingAttendance.trinked_ec = req.body.trinked_ec;
                    if (!req.body.bar || !req.body.gesamt || !req.body.trinked_ec) {
                        return res.status(BAD_REQUEST).json({
                            success: false,
                            status: BAD_REQUEST,
                            message: "Missing bar or gesamt or trinked_ec",
                        });
                    }
                    if (existingAttendance.department_name === "C2") {
                        if (req.body.trink_geld && !req.body.auf_rechnung) {
                            existingAttendance.trink_geld = req.body.trink_geld;
                            existingAttendance.results = req.body.bar - req.body.trinked_ec - req.body.trink_geld + (1.5 / 100) * req.body.gesamt;
                        } else if (req.body.auf_rechnung && !req.body.trink_geld) {
                            existingAttendance.auf_rechnung = req.body.auf_rechnung;
                            existingAttendance.results = req.body.bar - req.body.trinked_ec - req.body.auf_rechnung + (1.5 / 100) * req.body.gesamt;
                        } else if (req.body.auf_rechnung && req.body.trink_geld) {
                            existingAttendance.trink_geld = req.body.trink_geld;
                            existingAttendance.auf_rechnung = req.body.auf_rechnung;
                            existingAttendance.results = req.body.bar - req.body.trinked_ec - (req.body.auf_rechnung + req.body.trink_geld) + (1.5 / 100) * req.body.gesamt;
                        } else if (!req.body.auf_rechnung && !req.body.trink_geld) {
                            return res.status(BAD_REQUEST).json({
                                success: false,
                                status: BAD_REQUEST,
                                message: "Missing auf_rechnung or trink_geld",
                            });
                        }
                    } else {
                        if (req.body.trink_geld && !req.body.auf_rechnung) {
                            existingAttendance.trink_geld = req.body.trink_geld;
                            existingAttendance.results = req.body.bar - req.body.trinked_ec - req.body.trink_geld + (1 / 100) * req.body.gesamt;
                        } else if (req.body.auf_rechnung && !req.body.trink_geld) {
                            existingAttendance.auf_rechnung = req.body.auf_rechnung;
                            existingAttendance.results = req.body.bar - req.body.trinked_ec - req.body.auf_rechnung + (1 / 100) * req.body.gesamt;
                        } else if (req.body.auf_rechnung && req.body.trink_geld) {
                            existingAttendance.trink_geld = req.body.trink_geld;
                            existingAttendance.auf_rechnung = req.body.auf_rechnung;
                            existingAttendance.results = req.body.bar - req.body.trinked_ec - (req.body.auf_rechnung + req.body.trink_geld) + (1 / 100) * req.body.gesamt;
                        } else if (!req.body.auf_rechnung && !req.body.trink_geld) {
                            return res.status(BAD_REQUEST).json({
                                success: false,
                                status: BAD_REQUEST,
                                message: "Missing auf_rechnung or trink_geld",
                            });
                        }
                    }
                    existingAttendance.isAuto = false;
                    await existingAttendance.save();
                    return res.status(OK).json({
                        success: true,
                        status: OK,
                        message: existingAttendance,
                        // imageUrl: imageUrl
                    });
                } else {
                    return res.status(BAD_REQUEST).json({
                        success: false,
                        status: BAD_REQUEST,
                        message: "Not allow!",
                    });
                }
            } else if (existingAttendance.position === "Lito") {
                if (existingAttendance.shift_info.time_slot.check_in === true && existingAttendance.shift_info.time_slot.check_out === true) {
                    existingAttendance.bar = req.body.bar;
                    existingAttendance.kredit_karte = req.body.kredit_karte;
                    existingAttendance.kassen_schniff = req.body.kassen_schniff;
                    existingAttendance.gesamt_ligerbude = req.body.gesamt_ligerbude;
                    existingAttendance.gesamt_liegerando = req.body.gesamt_liegerando;
                    if (req.file) {
                        const file = req.file;
                        const imageUrl = await uploadImageToS3(file);
                        existingAttendance.lito_image = imageUrl;
                    }
                    if (!req.body.bar || !req.body.kredit_karte || !req.body.kassen_schniff || !req.body.gesamt_ligerbude || !req.body.gesamt_liegerando) {
                        return res.status(BAD_REQUEST).json({
                            success: false,
                            status: BAD_REQUEST,
                            message: "Missing bar or kredit_karte or kassen_schniff or gesamt_ligerbude or gesamt_liegerando",
                        });
                    }
                    if (existingAttendance.department_name === "C Ulm") {
                        existingAttendance.results = req.body.bar + req.body.kassen_schniff - req.body.kredit_karte - (0.7 / 100) * req.body.gesamt_ligerbude - (0.3 / 100) * req.body.gesamt_liegerando;
                    } else if (existingAttendance.department_name === "C6") {
                        if (req.body.gesamt_ligerbude + req.body.gesamt_liegerando > 1000) {
                            existingAttendance.results = req.body.bar + req.body.kassen_schniff - req.body.kredit_karte - (0.5 / 100) * (req.body.gesamt_ligerbude + req.body.gesamt_liegerando);
                        } else {
                            existingAttendance.results = req.body.bar + req.body.kassen_schniff - req.body.kredit_karte;
                        }
                    } else {
                        existingAttendance.results = req.body.bar + req.body.kassen_schniff - req.body.kredit_karte - (0.5 / 100) * (req.body.gesamt_ligerbude + req.body.gesamt_liegerando);
                    }
                    existingAttendance.isAuto = false;
                    await existingAttendance.save();
                    return res.status(OK).json({
                        success: true,
                        status: OK,
                        message: existingAttendance,
                    });
                } else {
                    return res.status(BAD_REQUEST).json({
                        success: false,
                        status: BAD_REQUEST,
                        message: "Not allow!",
                    });
                }
            } else {
                return res.status(BAD_REQUEST).json({
                    success: false,
                    status: BAD_REQUEST,
                    message: "Position not allowed!",
                });
            }
        }
    } catch (err) {
        next(err);
    }
}

export const getEmployeeAttendanceCurrentMonth = async (req, res, next) => {
    try {
        const employeeID = req.query.employeeID;
        const employeeName = req.query.employeeName;
        const departmentName = req.query.department_name;
        const targetDate = req.query.date ? new Date(req.query.date) : null;

        // Get current year and month if not provided
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth();

        // Use query year and month if provided, otherwise use current year and month
        const targetYear = req.query.year ? parseInt(req.query.year) : currentYear;
        const targetMonth = req.query.month ? parseInt(req.query.month) - 1 : currentMonth;

        if (!employeeID || !employeeName) {
            return res.status(BAD_REQUEST).json({
                success: false,
                status: BAD_REQUEST,
                message: "Employee ID and Employee Name is required",
            });
        }

        // Define date range for the entire current month or a specific day
        let dateRange;
        if (targetDate) {
            const beginOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
            const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
            dateRange = {
                $gte: beginOfDay,
                $lt: endOfDay,
            };
        } else {
            dateRange = {
                $gte: new Date(targetYear, targetMonth, 1),
                $lt: new Date(targetYear, targetMonth + 1, 1),
            };
        }

        // Construct the base query
        let query = {
            employee_id: employeeID,
            employee_name: employeeName,
            date: dateRange,
        };

        // Add department name to the query if provided
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

export const getDateDesignCurrentByEmployee = async (req, res, next) => {
    const employeeID = req.query.employeeID;
    const employeeName = req.query.employeeName;
    const targetDate = req.query.date ? new Date(req.query.date) : null;
    const departmentName = req.query.department_name;

    // Get current year and month if not provided
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    // Use query year and month if provided, otherwise use current year and month
    const targetYear = req.query.year ? parseInt(req.query.year) : currentYear;
    const targetMonth = req.query.month ? parseInt(req.query.month) - 1 : currentMonth;

    try {
        const employee = await EmployeeSchema.findOne({ id: employeeID, name: employeeName });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"));

        const shiftDesigns = [];

        // Query to get all employees in the department
        const employeesInDepartment = await EmployeeSchema.find({
            'department.name': departmentName
        });

        employee.department.forEach(department => {
            if (departmentName && department.name !== departmentName) {
                return;
            }

            department.schedules.forEach(schedule => {
                const scheduleDate = new Date(schedule.date);
                if (scheduleDate.getFullYear() === targetYear &&
                    scheduleDate.getMonth() === targetMonth &&
                    (!targetDate || scheduleDate.getTime() === targetDate.getTime())) {

                    schedule.shift_design.forEach(shift => {
                        // Find employees who have the same shift design on the target date
                        const employeesWithShift = employeesInDepartment.filter(e =>
                            e.department.some(dep =>
                                dep.name === department.name &&
                                dep.schedules.some(s => {
                                    const sDate = new Date(s.date);
                                    return sDate.getTime() === scheduleDate.getTime() &&
                                        s.shift_design.some(sd => sd.shift_code === shift.shift_code);
                                })
                            )
                        ).map(e => ({ id: e.id, name: e.name }));

                        shiftDesigns.push({
                            date: scheduleDate,
                            department_name: department.name,
                            position: shift.position,
                            shift_code: shift.shift_code,
                            time_slot: shift.time_slot,
                            shift_type: shift.shift_type,
                            employees: employeesWithShift
                        });
                    });
                }
            });
        });

        if (shiftDesigns.length === 0) {
            return next(createError(NOT_FOUND, "No shift designs found for the specified criteria!"));
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

export const getColleaguesWorkingTodayByEmployee = async (req, res, next) => {
    const employeeID = req.query.employeeID;
    const employeeName = req.query.employeeName;
    const targetDate = req.query.date ? new Date(req.query.date) : new Date();
    try {
        const targetEmployee = await EmployeeSchema.findOne({ id: employeeID, name: employeeName });
        if (!targetEmployee) {
            return next(createError(NOT_FOUND, "Employee not found!"));
        }

        let colleaguesByShiftAndDepartment = [];

        for (const department of targetEmployee.department) {
            for (const schedule of department.schedules) {
                const scheduleDate = new Date(schedule.date);

                if (scheduleDate.setHours(0, 0, 0, 0) === targetDate.setHours(0, 0, 0, 0)) {
                    for (const shiftDesign of schedule.shift_design) {
                        const shiftKey = `${shiftDesign.shift_code}`;
                        const shift_info = await ShiftSchema.findOne({ code: shiftKey });

                        // Find the index of shiftKey in colleaguesByShiftAndDepartment
                        let shiftIndex = colleaguesByShiftAndDepartment.findIndex(item => item && item.shiftKey === shiftKey);

                        // If shiftKey not found, create a new entry
                        if (shiftIndex === -1) {
                            colleaguesByShiftAndDepartment.push({
                                shiftKey: shiftKey,
                                time: `${shift_info.time_slot.start_time}-${shift_info.time_slot.end_time}`,
                                info: []
                            });
                            shiftIndex = colleaguesByShiftAndDepartment.length - 1;
                        }

                        // Find all employees who share the same department, date, and shift code
                        const colleagues = await EmployeeSchema.find({
                            'department.schedules': {
                                $elemMatch: {
                                    'date': scheduleDate,
                                    'shift_design': {
                                        $elemMatch: { 'shift_code': shiftDesign.shift_code }
                                    }
                                }
                            }
                        });

                        colleagues.forEach(colleague => {
                            if (colleague.id !== targetEmployee.id) {
                                // Iterate through each department of the colleague
                                colleague.department.forEach(colDep => {
                                    colDep.schedules.forEach(sch => {
                                        const match = sch.shift_design.some(sd => sd.shift_code === shiftDesign.shift_code && new Date(sch.date).setHours(0, 0, 0, 0) === scheduleDate.setHours(0, 0, 0, 0));
                                        if (match) {
                                            // We have found a colleague in the same department, on the same shift and date
                                            const departmentName = colDep.name;

                                            // Find or create the array for the department
                                            let departmentArray = colleaguesByShiftAndDepartment[shiftIndex].info.find(depArr => depArr.department === departmentName);

                                            if (!departmentArray) {
                                                departmentArray = {
                                                    department: departmentName,
                                                    co_workers: []
                                                };
                                                colleaguesByShiftAndDepartment[shiftIndex].info.push(departmentArray);
                                            }

                                            departmentArray.co_workers.push({
                                                id: colleague.id,
                                                name: colleague.name
                                            });
                                        }
                                    });
                                });
                            }
                        });
                    }
                }
            }
        }

        res.status(OK).json({
            success: true,
            status: OK,
            message: colleaguesByShiftAndDepartment
        });
    } catch (err) {
        next(err);
    }
};

export const getColleaguesWorkingTodayByEmployees = async (req, res, next) => {
    const targetDate = req.query.date ? new Date(req.query.date) : new Date();
    targetDate.setHours(0, 0, 0, 0); // Set to start of day for consistent querying
    const { employeeID, employeeName } = req.query;

    try {
        // Find the departments of the specific employee
        const specificEmployee = await EmployeeSchema.findOne({
            id: employeeID,
            name: employeeName
        }, 'department.name').lean();

        if (!specificEmployee) {
            return res.status(NOT_FOUND).json({
                success: false,
                status: NOT_FOUND,
                message: "Employee not found."
            });
        }

        // Extract department names
        const employeeDepartments = specificEmployee.department.map(dep => dep.name);

        // Get all employees working in those departments on the target date
        const employeesWorkingToday = await EmployeeSchema.find({
            "department.name": { $in: employeeDepartments },
            "department.schedules.date": {
                $gte: targetDate,
                $lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)
            }
        }).lean();

        let departmentShifts = {};

        // Iterate through each employee and their schedules
        for (const employee of employeesWorkingToday) {
            for (const department of employee.department) {
                if (!employeeDepartments.includes(department.name)) continue;

                for (const schedule of department.schedules) {
                    const scheduleDate = new Date(schedule.date);
                    scheduleDate.setHours(0, 0, 0, 0);

                    if (scheduleDate.getTime() === targetDate.getTime()) {
                        for (const shift of schedule.shift_design) {
                            // Initialize department in the result if it doesn't exist
                            if (!departmentShifts[department.name]) {
                                departmentShifts[department.name] = {};
                            }

                            // Initialize shift code in the department if it doesn't exist
                            if (!departmentShifts[department.name][shift.shift_code]) {
                                departmentShifts[department.name][shift.shift_code] = {
                                    time: `${shift.time_slot.start_time} - ${shift.time_slot.end_time}`,
                                    employees: []
                                };
                            }

                            // Add employee to the shift
                            departmentShifts[department.name][shift.shift_code].employees.push({
                                id: employee.id,
                                name: employee.name
                            });
                        }
                    }
                }
            }
        }

        // Prepare the result with sorted shifts
        let results = Object.entries(departmentShifts).map(([deptName, shifts]) => {
            let sortedShifts = Object.entries(shifts).sort((a, b) => {
                let timeA = a[1].time.split(' - ')[0].split(':').map(Number);
                let timeB = b[1].time.split(' - ')[0].split(':').map(Number);
                return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1]);
            }).map(([shiftCode, shiftData]) => ({
                shift_code: shiftCode,
                ...shiftData
            }));

            return {
                department: deptName,
                shifts: sortedShifts
            };
        });

        res.status(OK).json({
            success: true,
            status: OK,
            data: results
        });
    } catch (err) {
        next(err);
    }
};

function calculateDuration(startDate, endDate) {
    const oneDay = 24 * 60 * 60 * 1000;

    const start = new Date(startDate);
    const end = new Date(endDate);

    const durationInMilliseconds = Math.abs(start - end);
    const durationInDays = Math.round(durationInMilliseconds / oneDay + 1);

    return durationInDays;
}

export const createRequest = async (req, res, next) => {
    const employeeID = req.query.employeeID;
    const employeeName = req.query.employeeName;
    try {
        const employee = await EmployeeSchema.findOne({ id: employeeID, name: employeeName });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"));

        if (employee.realistic_day_off > 0) {
            const newRequest = new RequestSchema({
                employee_id: employee.id,
                employee_name: employee.name,
                default_day_off: employee.default_day_off,
                realistic_day_off: employee.realistic_day_off,
                request_dayOff_start: req.body.request_dayOff_start,
                request_dayOff_end: req.body.request_dayOff_end,
                request_content: req.body.request_content,
            })

            if (req.file) {
                const file = req.file;
                const imageUrl = await uploadImageToS3(file);
                newRequest.image = imageUrl;
            }

            if (newRequest.request_content != "Sick day") {
                const oneMonthBeforeStart = new Date(newRequest.request_dayOff_start);
                oneMonthBeforeStart.setMonth(oneMonthBeforeStart.getMonth() - 1);
                const currentTime = new Date();
                if (
                    (oneMonthBeforeStart.getFullYear() === currentTime.getFullYear() &&
                        oneMonthBeforeStart.getMonth() < currentTime.getMonth()) ||
                    (oneMonthBeforeStart.getFullYear() === currentTime.getFullYear() &&
                        oneMonthBeforeStart.getMonth() === currentTime.getMonth() &&
                        oneMonthBeforeStart.getDate() < currentTime.getDate()) ||
                    (oneMonthBeforeStart.getFullYear() !== currentTime.getFullYear() &&
                        oneMonthBeforeStart.getMonth() === 0 &&
                        oneMonthBeforeStart.getDate() < currentTime.getDate())) {
                    return res.status(BAD_REQUEST).json({
                        success: false,
                        status: BAD_REQUEST,
                        message: "Your request is not valid. It should be created within the last month.",
                    });
                }
            }

            const dateChecking = await DayOffSchema.findOne({
                date_start: new Date(newRequest.request_dayOff_start),
                date_end: new Date(newRequest.request_dayOff_end),
                type: "specific"
            });
            if (dateChecking) {
                dateChecking.members.push({
                    id: employee.id,
                    name: employee.name,
                    email: employee.email,
                    role: employee.role,
                    position: employee.position,
                    status: employee.status
                });
                employee.dayOff_schedule.push({
                    date_start: dateChecking.date_start,
                    date_end: dateChecking.date_end,
                    duration: dateChecking.duration,
                    name: dateChecking.name,
                    type: dateChecking.type,
                    allowed: dateChecking.allowed
                });
                await employee.save();
                await dateChecking.save();
            } else {
                const newDayOff = new DayOffSchema({
                    date_start: new Date(newRequest.request_dayOff_start),
                    date_end: new Date(newRequest.request_dayOff_end),
                    name: newRequest.request_content,
                    type: "specific",
                });
                const duration = calculateDuration(newDayOff.date_start, newDayOff.date_end);
                if (employee.realistic_day_off < duration) {
                    return res.status(BAD_REQUEST).json({
                        success: false,
                        status: BAD_REQUEST,
                        message: "Your day off total is not enough",
                    });
                }

                newDayOff.members.push({
                    id: employee.id,
                    name: employee.name,
                    email: employee.email,
                    role: employee.role,
                    position: employee.position,
                    status: employee.status
                });
                employee.dayOff_schedule.push({
                    date_start: newDayOff.date_start,
                    date_end: newDayOff.date_end,
                    duration: duration,
                    name: newDayOff.name,
                    type: newDayOff.type,
                    allowed: newDayOff.allowed
                });
                newDayOff.duration = duration;
                await employee.save();
                await newDayOff.save();
            }

            await newRequest.save();

            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.MAIL_ADDRESS,
                    pass: process.env.MAIL_PASSWORD,
                },
            });

            const emailSubject = `Request ${newRequest.request_content} - #${newRequest.id}`;
            const emailContent = `
                <div>
                    <p>Hi Admins,</p>
                    <p>We sending request ${newRequest.request_content}, from date ${newRequest.request_dayOff_start} to ${newRequest.request_dayOff_end} for you to response</p>
                    <p>Request Date: ${newRequest.request_dayOff_start} - ${newRequest.request_dayOff_end}</p>
                    <p>Type: ${newRequest.request_content}</p>
                    <p>Best Regards !</p>
                </div>
            `;

            const mailOptions = {
                from: '"No Reply" <no-reply@gmail.com>',
                to: employee.email,
                subject: emailSubject,
                html: emailContent,
            };

            // Send email
            await transporter.sendMail(mailOptions);
            return res.status(CREATED).json({
                success: true,
                status: CREATED,
                message: newRequest,
            });
        } else {
            return res.status(BAD_REQUEST).json({
                success: false,
                status: BAD_REQUEST,
                message: "Your day off total is not enough",
            });
        }
    } catch (err) {
        next(err);
    }
}

export const getAllRequestsForEmployee = async (req, res, next) => {
    const employeeID = req.query.employeeID;
    const employeeName = req.query.employeeName;
    try {
        const requests = await RequestSchema.find({ employee_id: employeeID, employee_name: employeeName });
        return res.status(OK).json({
            success: true,
            status: OK,
            message: requests,
        });
    } catch (err) {
        next(err);
    }
};

export const getAllCarsCompany = async (req, res, next) => {
    try {
        const companyCars = await CarSchema.find();
        return res.status(OK).json({
            success: true,
            status: OK,
            message: companyCars,
        });
    } catch (error) {
        next(error)
    }
}