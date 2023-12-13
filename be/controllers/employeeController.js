import { BAD_REQUEST, CREATED, NOT_FOUND, OK } from "../constant/HttpStatus.js";
import AttendanceSchema from "../models/AttendanceSchema.js";
import EmployeeSchema from "../models/EmployeeSchema.js";
import { createError } from "../utils/error.js";

export const autoCheck = async (req, res, next) => {
    const currentTime = new Date();
    // const targetDate = currentTime;

    // Find all employees
    const employees = await EmployeeSchema.find();
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

        // console.log(currentShiftDesign);

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

export const getAttendanceHistory = async (req, res, next) => {
    const employeeID = req.query.employeeID;
    const year = req.query.year;
    const month = req.query.month;

    try {
        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found"))

        const query = {
            employee_id: employee.id,
            date: {
                $gte: new Date(year, month ? month - 1 : 0, 1, 0, 0, 0, 0),
                $lt: new Date(year, month ? month : 12, 1, 0, 0, 0, 0),
            },
        };

        const attendanceList = await AttendanceSchema.find(query);
        if (Array.isArray(attendanceList) && attendanceList.length === 0) {
            return res.status(NOT_FOUND).json({ error: "Cannot find attendance history" });
        }

        return res.status(OK).json({ success: 'Attendance found', attendanceList });
    } catch (err) {
        next(err);
    }
}

export const getDateDesignInMonthByEmployee = async (req, res, next) => {
    const employeeID = req.query.employeeID;
    const targetMonth = req.body.month;
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