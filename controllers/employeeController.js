import { s3Client } from "../awsConfig.js";
import { BAD_REQUEST, CREATED, NOT_FOUND, OK, SYSTEM_ERROR } from "../constant/HttpStatus.js";
import AttendanceSchema from "../models/AttendanceSchema.js";
import DayOffSchema from "../models/DayOffSchema.js";
// import DepartmentSchema from "../models/DepartmentSchema.js";
import EmployeeSchema from "../models/EmployeeSchema.js";
import RequestSchema from "../models/RequestSchema.js";
import { createError } from "../utils/error.js";
// import wifi from 'node-wifi';

// wifi.init({
//     iface: null,
// });

// export const verifyWifi = async (req, res, next) => {
//     const employeeID = req.query.employeeID;
//     try {
//         const employee = await EmployeeSchema.findOne({ id: employeeID });
//         if (!employee) return next(createError(NOT_FOUND, "Employee not found"))

//         const department = await DepartmentSchema.findOne({ name: employee.department_name });
//         if (!department) return next(createError(NOT_FOUND, "Department not found!"));

//         // Scan for available networks and get the currently connected SSID
//         const currentConnections = await wifi.getCurrentConnections();
//         // console.log(currentConnections);

//         if (currentConnections.length > 0) {
//             const connectedSSID = currentConnections[0].ssid;
//             const allowedSSID = department.wifi_name;

//             if (connectedSSID === allowedSSID) {
//                 // console.log(`Device connected to Wi-Fi with SSID: ${allowedSSID}`);
//                 res.status(OK).json({
//                     success: true,
//                     status: OK,
//                     message: `Device connected to Wi-Fi with SSID: ${allowedSSID}`
//                 });
//             } else {
//                 // console.log(`Device is not connected to the allowed Wi-Fi SSID.`);
//                 res.status(FORBIDDEN).json({
//                     success: false,
//                     status: FORBIDDEN,
//                     message: `Device is not connected to the allowed Wi-Fi SSID.`
//                 });
//             }
//         } else {
//             // console.log(`Device is not connected to any Wi-Fi network.`);
//             res.status(FORBIDDEN).json({
//                 success: false,
//                 status: FORBIDDEN,
//                 message: `Device is not connected to any Wi-Fi network.`
//             });
//         }
//     } catch (err) {
//         console.error('Error checking Wi-Fi SSID:', err);
//         next(err);
//     }
// }

export const autoCheck = async (req, res, next) => {
    const currentTime = new Date();
    const currentYear = currentTime.getFullYear();
    const currentMonth = currentTime.getMonth();

    const employees = await EmployeeSchema.find({ status: "active" });
    const matchedEmployees = employees.filter(employee => {
        const matchedSchedules = employee.schedules.filter(schedule => {
            return schedule.date.toLocaleDateString() == currentTime.toLocaleDateString();
        });

        return matchedSchedules.length > 0;
    });

    for (const employee of matchedEmployees) {
        // console.log(employee);
        const date = employee.schedules.find(schedule => {
            return schedule.date.toLocaleDateString() == currentTime.toLocaleDateString();
        });
        if (!date) return next(createError(NOT_FOUND, 'Design not found for the current day'));

        // Collect time ranges from shift_design
        const timeRanges = date.shift_design.map(shift => {
            const totalNumber = shift.time_slot.total_number;
            const startTime = shift.time_slot.detail[0].start_time;
            const endTime = totalNumber === 1 ? shift.time_slot.detail[0].end_time : shift.time_slot.detail[1].end_time;
            return { startTime, endTime };
        });

        // Compare the current time with each time range
        const currentTimestamp = currentTime.getTime();
        let currentTimeRange = null;

        for (const timeRange of timeRanges) {
            const [endHours, endMinutes] = timeRange.endTime.split(':').map(Number);

            const endDateTime = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), endHours, endMinutes);
            const endOfDay = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), 23, 59, 59, 999);

            const endTimePlus30 = new Date(endDateTime);
            endTimePlus30.setMinutes(endTimePlus30.getMinutes() + 30);

            if (endDateTime < endOfDay) {
                // Compare currentTimestamp with the adjusted time range
                if (currentTimestamp > endTimePlus30.getTime()) {
                    currentTimeRange = timeRange;
                    // Find the corresponding shift_design based on currentTimeRange
                    const currentShiftDesign = date.shift_design.find(shift => {
                        const totalNumber = shift.time_slot.total_number;
                        const startTime = shift.time_slot.detail[0].start_time;
                        const endTime = totalNumber === 1 ? shift.time_slot.detail[0].end_time : shift.time_slot.detail[1].end_time;

                        return startTime === currentTimeRange.startTime && endTime === currentTimeRange.endTime;
                    });

                    if (!currentShiftDesign) {
                        return next(createError(NOT_FOUND, 'No matching shift design for the current time range'));
                    }

                    // console.log(currentShiftDesign);

                    const existingAttendance = await AttendanceSchema.findOne({
                        employee_id: employee.id,
                        date: {
                            $gte: new Date().setHours(0, 0, 0, 0),
                            $lt: new Date().setHours(23, 59, 59, 999),
                        },
                        'shift_info.shift_code': currentShiftDesign.shift_code,
                    });

                    // console.log(existingAttendance);

                    const shift_code = currentShiftDesign.shift_code;
                    // const time_slot = currentShiftDesign.time_slot;
                    if (!existingAttendance) {
                        const newAttendance = new AttendanceSchema({
                            date: date.date,
                            employee_id: employee.id,
                            employee_name: employee.name,
                            department_name: employee.department_name,
                            role: employee.role,
                            position: employee.position,
                            shift_info: {
                                shift_code: shift_code,
                                shift_type: currentShiftDesign.shift_type,
                                total_hour: 0,
                                total_minutes: 0
                            },
                            status: "missing"
                        });
                        await newAttendance.save();
                        console.log("Attendance create successfully!");

                        // Find the current year and month in attendance_stats
                        const statsIndex = employee.attendance_stats.findIndex(stat =>
                            stat.year === currentYear && stat.month === currentMonth + 1
                        );

                        if (statsIndex > -1) {
                            employee.attendance_stats[statsIndex].date_missing += 1;
                        } else {
                            // Create a new attendance_stats object for the current month and year
                            employee.attendance_stats.push({
                                year: currentYear,
                                month: currentMonth + 1,
                                date_on_time: 0,
                                date_late: 0,
                                date_missing: 1,
                            });
                        }
                        await employee.save();
                    } else {
                        if (existingAttendance.shift_info.time_slot.check_in == true && existingAttendance.shift_info.time_slot.check_out != true) {
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
                            // check out late
                            existingAttendance.shift_info.time_slot.check_out = true;
                            existingAttendance.shift_info.time_slot.check_out_time = `${endHours}: 0${endMinutes}`;
                            existingAttendance.shift_info.time_slot.check_out_status = 'late';
                            existingAttendance.status = 'checked';
                            const checkOutTimeString = existingAttendance.shift_info.time_slot.check_out_time;
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
                            existingAttendance.shift_info.total_hour = totalHours;
                            existingAttendance.shift_info.total_minutes = totalMinutes;
                            await existingAttendance.save();
                            console.log("Attendance update successfully!");

                            // Find the current year and month in attendance_stats
                            const statsIndex = employee.attendance_stats.findIndex(stat =>
                                stat.year === currentYear && stat.month === currentMonth + 1
                            );

                            if (statsIndex > -1) {
                                employee.attendance_stats[statsIndex].date_late += 1;
                            } else {
                                // Create a new attendance_stats object for the current month and year
                                employee.attendance_stats.push({
                                    year: currentYear,
                                    month: currentMonth + 1,
                                    date_on_time: 0,
                                    date_late: 1,
                                    date_missing: 0,
                                });
                            }
                            await employee.save();
                        } else {
                            console.log("Nothing to create or update!");
                        }
                    }
                }
            } else {
                console.log("Nothing to create or update!");
            }
        }
    }
}

export const checkAttendance = async (req, res, next) => {
    const employeeID = req.body.employeeID;
    try {
        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found"))
        if (employee.status === "inactive") return next(createError(NOT_FOUND, "Employee not active!"));

        const currentTime = new Date();
        const currentYear = currentTime.getFullYear();
        const currentMonth = currentTime.getMonth();

        const date = employee.schedules.find(schedule => {
            return schedule.date.toLocaleDateString() == currentTime.toLocaleDateString();
        });
        if (!date) return next(createError(NOT_FOUND, 'Design not found for the current day'));

        // Collect time ranges from shift_design
        const timeRanges = date.shift_design.map(shift => {
            const totalNumber = shift.time_slot.total_number;
            const startTime = shift.time_slot.detail[0].start_time;
            const endTime = totalNumber === 1 ? shift.time_slot.detail[0].end_time : shift.time_slot.detail[1].end_time;
            return { startTime, endTime };
        });

        // Compare the current time with each time range
        const currentTimestamp = currentTime.getTime();
        let currentTimeRange = null;

        for (const timeRange of timeRanges) {
            const [startHours, startMinutes] = timeRange.startTime.split(':').map(Number);
            const [endHours, endMinutes] = timeRange.endTime.split(':').map(Number);

            const startDateTime = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), startHours, startMinutes);
            const endDateTime = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), endHours, endMinutes);
            const endOfDay = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), 23, 59, 59, 999);

            // Calculate startTime - 30 minutes
            const startTimeMinus30 = new Date(startDateTime);
            startTimeMinus30.setMinutes(startDateTime.getMinutes() - 30);

            const endTimePlus30 = new Date(endDateTime);
            endTimePlus30.setMinutes(endTimePlus30.getMinutes() + 30);

            if (endDateTime < endOfDay) {
                // Compare currentTimestamp with the adjusted time range
                if (currentTimestamp >= startTimeMinus30.getTime() && currentTimestamp <= endTimePlus30) {
                    currentTimeRange = timeRange;
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

        // Find the corresponding shift_design based on currentTimeRange
        const currentShiftDesign = date.shift_design.find(shift => {
            const totalNumber = shift.time_slot.total_number;
            const startTime = shift.time_slot.detail[0].start_time;
            const endTime = totalNumber === 1 ? shift.time_slot.detail[0].end_time : shift.time_slot.detail[1].end_time;

            return startTime === currentTimeRange.startTime && endTime === currentTimeRange.endTime;
        });
        if (!currentShiftDesign) {
            return next(createError(NOT_FOUND, 'No matching shift design for the current time range'));
        }

        const existingAttendance = await AttendanceSchema.findOne({
            employee_id: employee.id,
            date: {
                $gte: new Date().setHours(0, 0, 0, 0),
                $lt: new Date().setHours(23, 59, 59, 999),
            },
            'shift_info.shift_code': currentShiftDesign.shift_code,
        });

        const shift_code = currentShiftDesign.shift_code;
        const time_slot = currentShiftDesign.time_slot;

        if (!existingAttendance) {
            // only check in
            const newAttendance = new AttendanceSchema({
                date: date.date,
                employee_id: employeeID,
                employee_name: employee.name,
                department_name: employee.department_name,
                role: employee.role,
                position: employee.position,
                shift_info: {
                    shift_code: shift_code,
                    shift_type: currentShiftDesign.shift_type,
                }
            });
            if (time_slot.total_number == 1) {
                const [endHours, endMinutes] = time_slot.detail[0].end_time.split(':').map(Number);
                const endTime = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), endHours, endMinutes);
                const [startHours, startMinutes] = time_slot.detail[0].start_time.split(':').map(Number);
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
            } else if (time_slot.total_number == 2) {
                const [endHours, endMinutes] = time_slot.detail[1].end_time.split(':').map(Number);
                const endTime = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), endHours, endMinutes);
                const [startHours, startMinutes] = time_slot.detail[0].start_time.split(':').map(Number);
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
                } else if (currentTime < startTimeMinus30 || currentTime > endTime) {
                    // check in too soon or too late
                    return res.status(BAD_REQUEST).json({
                        success: false,
                        status: BAD_REQUEST,
                        message: `You can not check in at this time ${currentTime.toLocaleTimeString()}`,
                    });
                }
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
                if (time_slot.total_number == 1) {
                    const [endHours, endMinutes] = time_slot.detail[0].end_time.split(':').map(Number);
                    const endTime = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), endHours, endMinutes);

                    // Calculate endTime + 30 minutes
                    const endTimePlus30 = new Date(endTime);
                    endTimePlus30.setMinutes(endTime.getMinutes() + 30);
                    if (currentTime > endTime && currentTime < endTimePlus30) {
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

                        if (existingAttendance.shift_info.time_slot.check_in_status === "on time") {
                            // Find the current year and month in attendance_stats
                            const statsIndex = employee.attendance_stats.findIndex(stat =>
                                stat.year === currentYear && stat.month === currentMonth + 1
                            );

                            if (statsIndex > -1) {
                                employee.attendance_stats[statsIndex].date_on_time += 1;
                            } else {
                                // Create a new attendance_stats object for the current month and year
                                employee.attendance_stats.push({
                                    year: currentYear,
                                    month: currentMonth + 1,
                                    date_on_time: 1,
                                    date_late: 0,
                                    date_missing: 0,
                                });
                            }
                            await employee.save();
                        } else {
                            // Find the current year and month in attendance_stats
                            const statsIndex = employee.attendance_stats.findIndex(stat =>
                                stat.year === currentYear && stat.month === currentMonth + 1
                            );

                            if (statsIndex > -1) {
                                employee.attendance_stats[statsIndex].date_late += 1;
                            } else {
                                // Create a new attendance_stats object for the current month and year
                                employee.attendance_stats.push({
                                    year: currentYear,
                                    month: currentMonth + 1,
                                    date_on_time: 0,
                                    date_late: 1,
                                    date_missing: 0,
                                });
                            }
                            await employee.save();
                        }

                        return res.status(OK).json({
                            success: true,
                            status: OK,
                            message: existingAttendance,
                            log: `${currentTime}`,
                        });
                    } else if (currentTime < endTime) {
                        // check out too soon
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
                } else if (time_slot.total_number == 2) {
                    const [endHours, endMinutes] = time_slot.detail[1].end_time.split(':').map(Number);
                    const endTime = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), endHours, endMinutes);
                    // Calculate endTime + 30 minutes
                    const endTimePlus30 = new Date(endTime);
                    endTimePlus30.setMinutes(endTime.getMinutes() + 30);
                    if (currentTime > endTime && currentTime < endTimePlus30) {
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

                        if (existingAttendance.shift_info.time_slot.check_in_status === "on time") {
                            // Find the current year and month in attendance_stats
                            const statsIndex = employee.attendance_stats.findIndex(stat =>
                                stat.year === currentYear && stat.month === currentMonth + 1
                            );

                            if (statsIndex > -1) {
                                employee.attendance_stats[statsIndex].date_on_time += 1;
                            } else {
                                // Create a new attendance_stats object for the current month and year
                                employee.attendance_stats.push({
                                    year: currentYear,
                                    month: currentMonth + 1,
                                    date_on_time: 1,
                                    date_late: 0,
                                    date_missing: 0,
                                });
                            }
                            await employee.save();
                        } else {
                            // Find the current year and month in attendance_stats
                            const statsIndex = employee.attendance_stats.findIndex(stat =>
                                stat.year === currentYear && stat.month === currentMonth + 1
                            );

                            if (statsIndex > -1) {
                                employee.attendance_stats[statsIndex].date_late += 1;
                            } else {
                                // Create a new attendance_stats object for the current month and year
                                employee.attendance_stats.push({
                                    year: currentYear,
                                    month: currentMonth + 1,
                                    date_on_time: 0,
                                    date_late: 1,
                                    date_missing: 0,
                                });
                            }
                            await employee.save();
                        }

                        return res.status(OK).json({
                            success: true,
                            status: OK,
                            message: existingAttendance,
                            log: `${currentTime}`,
                        });
                    } else if (currentTime < endTime) {
                        // check out too soon
                        return res.status(BAD_REQUEST).json({
                            success: false,
                            status: BAD_REQUEST,
                            message: `You can not check out at this time ${currentTime.toLocaleTimeString()}`,
                        });
                    }
                    else {
                        return res.status(BAD_REQUEST).json({
                            success: false,
                            status: BAD_REQUEST,
                            message: `Err!`,
                        });
                    }
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
    const employeeID = req.query.employeeID;
    try {
        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found"))
        if (employee.status === "inactive") return next(createError(NOT_FOUND, "Employee not active!"));

        const currentTime = new Date();

        const date = employee.schedules.find(schedule => {
            return schedule.date.toLocaleDateString() == currentTime.toLocaleDateString();
        });
        if (!date) return next(createError(NOT_FOUND, 'Design not found for the current day'));

        // Collect time ranges from shift_design
        const timeRanges = date.shift_design.map(shift => {
            const totalNumber = shift.time_slot.total_number;
            const startTime = shift.time_slot.detail[0].start_time;
            const endTime = totalNumber === 1 ? shift.time_slot.detail[0].end_time : shift.time_slot.detail[1].end_time;
            return { startTime, endTime };
        });

        // Compare the current time with each time range
        const currentTimestamp = currentTime.getTime();
        let currentTimeRange = null;

        for (const timeRange of timeRanges) {
            const [startHours, startMinutes] = timeRange.startTime.split(':').map(Number);
            const [endHours, endMinutes] = timeRange.endTime.split(':').map(Number);

            const startDateTime = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), startHours, startMinutes);
            const endDateTime = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), endHours, endMinutes);
            const endOfDay = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), 23, 59, 59, 999);

            // Calculate startTime - 30 minutes
            const startTimeMinus30 = new Date(startDateTime);
            startTimeMinus30.setMinutes(startDateTime.getMinutes() - 30);

            const endTimePlus30 = new Date(endDateTime);
            endTimePlus30.setMinutes(endTimePlus30.getMinutes() + 30);

            if (endDateTime < endOfDay) {
                // Compare currentTimestamp with the adjusted time range
                if (currentTimestamp >= startTimeMinus30.getTime() && currentTimestamp <= endTimePlus30) {
                    currentTimeRange = timeRange;
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

        // Find the corresponding shift_design based on currentTimeRange
        const currentShiftDesign = date.shift_design.find(shift => {
            const totalNumber = shift.time_slot.total_number;
            const startTime = shift.time_slot.detail[0].start_time;
            const endTime = totalNumber === 1 ? shift.time_slot.detail[0].end_time : shift.time_slot.detail[1].end_time;

            return startTime === currentTimeRange.startTime && endTime === currentTimeRange.endTime;
        });
        if (!currentShiftDesign) {
            return next(createError(NOT_FOUND, 'No matching shift design for the current time range'));
        }

        const existingAttendance = await AttendanceSchema.findOne({
            employee_id: employee.id,
            date: {
                $gte: new Date().setHours(0, 0, 0, 0),
                $lt: new Date().setHours(23, 59, 59, 999),
            },
            'shift_info.shift_code': currentShiftDesign.shift_code,
        });

        if (!existingAttendance) {
            return res.status(NOT_FOUND).json({
                success: false,
                status: NOT_FOUND,
                message: "Attendance not found!",
            });
        } else {
            if (employee.position === "Autofahrer") {
                if (existingAttendance.shift_info.time_slot.check_in === true && existingAttendance.shift_info.time_slot.check_out !== true) {
                    existingAttendance.check_in_km = req.body.check_in_km;
                    await existingAttendance.save();

                    return res.status(OK).json({
                        success: true,
                        status: OK,
                        message: existingAttendance,
                    });
                } else if (existingAttendance.shift_info.time_slot.check_in === true && existingAttendance.shift_info.time_slot.check_out === true) {
                    existingAttendance.check_out_km = req.body.check_out_km;
                    existingAttendance.total_km = existingAttendance.check_out_km - existingAttendance.check_in_km;
                    await existingAttendance.save();

                    return res.status(OK).json({
                        success: true,
                        status: OK,
                        message: existingAttendance,
                    });
                }
            } else if (employee.position === "Lito") {
                if (existingAttendance.shift_info.time_slot.check_in === true && existingAttendance.shift_info.time_slot.check_out !== true) {
                    const file = req.file;
                    if (!file) {
                        return res.status(BAD_REQUEST).send('No file uploaded for checkout.');
                    }

                    try {
                        const imageUrl = await uploadImageToS3(file);
                        existingAttendance.check_out_image = imageUrl;
                        await existingAttendance.save();
                        return res.status(OK).json({
                            success: true,
                            status: OK,
                            message: existingAttendance,
                            imageUrl: imageUrl
                        });
                    } catch (err) {
                        return res.status(SYSTEM_ERROR).send('Error uploading file.');
                    }
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

export const getAttendanceByCurrentMonth = async (req, res, next) => {
    try {
        const employeeID = req.params.employeeID;
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth();

        const attendanceRecords = await AttendanceSchema.find({
            employee_id: employeeID,
            date: {
                $gte: new Date(currentYear, currentMonth, 1, 0, 0, 0, 0),
                $lt: new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999),
            },
        });

        return res.status(OK).json({
            success: true,
            status: OK,
            message: attendanceRecords,
        });
    } catch (err) {
        next(err);
    }
};

export const getAttendanceCurrentTime = async (req, res, next) => {
    try {
        const employeeID = req.params.employeeID;
        const currentDate = new Date();

        const attendanceRecord = await AttendanceSchema.findOne({
            employee_id: employeeID,
            date: {
                $gte: new Date(currentDate.setHours(0, 0, 0, 0)),
                $lt: new Date(currentDate.setHours(23, 59, 59, 999)),
            },
        });

        return res.status(OK).json({
            success: true,
            status: OK,
            message: attendanceRecord,
        });
    } catch (err) {
        next(err);
    }
};

export const getDateDesignInMonthByEmployee = async (req, res, next) => {
    const employeeID = req.query.employeeID;
    const targetMonth = req.query.month;
    try {
        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"));

        // Filter schedules for the target month
        const schedulesInMonth = employee.schedules.filter(schedule => {
            const scheduleMonth = schedule.date.getMonth() + 1;
            return scheduleMonth === targetMonth;
        });

        if (schedulesInMonth.length === 0) {
            return res.status(NOT_FOUND).json({
                success: false,
                status: NOT_FOUND,
                message: `No schedules found for the employee in the specified month.`,
            });
        }

        res.status(OK).json({
            success: true,
            status: OK,
            message: schedulesInMonth,
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
    try {
        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"));

        if (employee.realistic_day_off > 0) {
            const newRequest = new RequestSchema({
                employee_id: employee.id,
                employee_name: employee.name,
                default_day_off: employee.default_day_off,
                realistic_day_off: employee.realistic_day_off,
                request_dayOff_start: req.body.request_dayOff_start,
                request_dayOff_end: req.body.request_dayOff_end,
                request_content: req.body.request_content
            })

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
                    department_name: employee.department_name,
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
                    name: "leave",
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
                    department_name: employee.department_name,
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