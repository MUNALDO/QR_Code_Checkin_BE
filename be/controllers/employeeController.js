import { BAD_REQUEST, CREATED, NOT_FOUND, OK } from "../constant/HttpStatus.js";
import AttendanceSchema from "../models/AttendanceSchema.js";
import EmployeeSchema from "../models/EmployeeSchema.js";
import { createError } from "../utils/error.js";
import DateDesignSchema from "../models/DateDesignSchema.js";

export const checkAttendance = async (req, res, next) => {
    const employeeID = req.body;
    try {
        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found"))

        const currentTime = new Date();
        const current_date = currentTime.toLocaleDateString();
        const weekday = currentTime.getDay();
        const day = currentTime.getDate();
        const month = currentTime.getMonth() + 1;

        const date = await DateDesignSchema.findOne({ date: currentTime });
        if (!date) return next(createError(NOT_FOUND, 'Design not found for the current day'));

        if (date.members.some(member => member.id !== employeeID)) {
            return next(createError(CONFLICT, "Employee not exists in the date!"));
        }

        const shift_code = date.shift;
        const time_slot = date.time_slot;

        const existingAttendance = await AttendanceSchema.findOne({
            employee_id: employee.id,
            date: {
                $gte: new Date().setHours(0, 0, 0, 0),
                $lt: new Date().setHours(23, 59, 59, 999),
            },
        });

        const checkCurrentTimeZone = currentTime.toString();
        // console.log(checkCurrentTimeZone);
        if (checkCurrentTimeZone.includes("GMT+0100")) {
            // same time zone
            if (!existingAttendance) {
                // only check in
                const newAttendance = new AttendanceSchema({
                    date: date,
                    employee_id: employeeID,
                    employee_name: employee.name,
                    department_name: employee.department_name,
                    role: employee.role,
                    position: employee.position,
                    shift_info: {
                        shift_code: shift_code
                    }
                });
                const [startHours, startMinutes] = time_slot.detail[0].start_time.split(':').map(Number);
                const startTime = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), startHours, startMinutes);
                // Calculate startTime - 30 minutes
                const startTimeMinus30 = new Date(startTime);
                startTimeMinus30.setMinutes(startTime.getMinutes() - 30);

                // Calculate startTime + 30 minutes
                const startTimePlus30 = new Date(startTime);
                startTimePlus30.setMinutes(startTime.getMinutes() + 30);
                if (currentTime > startTimeMinus30 && currentTime < startTimePlus30) {
                    // check in on time
                    newAttendance.shift_info.time_slot.check_in = true;
                    newAttendance.shift_info.time_slot.check_in_time = `${currentTime.toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin", })}`;
                    newAttendance.shift_info.time_slot.check_in_status = 'on time';
                    newAttendance.shift_info.time_slot.value = time_slot.detail[0].value;
                    await newAttendance.save();
                    return res.status(CREATED).json({
                        success: true,
                        status: CREATED,
                        message: newAttendance,
                        log: `${currentTime}`,
                    });
                } else if (currentTime > startTimePlus30) {
                    // check in late
                    newAttendance.shift_info.time_slot.check_in = false;
                    newAttendance.shift_info.time_slot.check_in_time = `${currentTime.toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin", })}`;
                    newAttendance.shift_info.time_slot.check_in_status = 'missing';
                    newAttendance.shift_info.time_slot.value = 0;
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
                } else {
                    if (time_slot.total_number == 1) {
                        const [endHours, endMinutes] = time_slot.detail[0].end_time.split(':').map(Number);
                        const endTime = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), endHours, endMinutes);

                        // Calculate endTime + 2 hours
                        const endTimePlus2 = new Date(endTime);
                        endTimePlus2.setHours(endTime.getHours() + 2);
                        if (currentTime > endTime && currentTime < endTimePlus2) {
                            // check out on time
                            existingAttendance.shift_info.time_slot.check_out = true;
                            existingAttendance.shift_info.time_slot.check_out_time = `${currentTime.toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin", })}`;
                            existingAttendance.shift_info.time_slot.check_out_status = 'on time';
                            existingAttendance.shift_info.time_slot.value += time_slot.detail[0].value;
                            await existingAttendance.save();
                            return res.status(OK).json({
                                success: true,
                                status: OK,
                                message: existingAttendance,
                                log: `${currentTime}`,
                            });
                        } else if (currentTime > endTimePlus2) {
                            // check out late
                            existingAttendance.shift_info.time_slot.check_out = false;
                            existingAttendance.shift_info.time_slot.check_out_time = `${currentTime.toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin", })}`;
                            existingAttendance.shift_info.time_slot.check_out_status = 'missing';
                            existingAttendance.shift_info.time_slot.value += 0;
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
                    } else if (time_slot.total_number == 2) {
                        const [endHours, endMinutes] = time_slot.detail[1].end_time.split(':').map(Number);
                        const endTime = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), endHours, endMinutes);
                        // Calculate endTime + 2 hours
                        const endTimePlus2 = new Date(endTime);
                        endTimePlus2.setHours(endTime.getHours() + 2);
                        if (currentTime > endTime && currentTime < endTimePlus2) {
                            // check out on time
                            existingAttendance.shift_info.time_slot.check_out = true;
                            existingAttendance.shift_info.time_slot.check_out_time = `${currentTime.toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin", })}`;
                            existingAttendance.shift_info.time_slot.check_out_status = 'on time';
                            existingAttendance.shift_info.time_slot.value += time_slot.detail[1].value;
                            await existingAttendance.save();
                            return res.status(OK).json({
                                success: true,
                                status: OK,
                                message: existingAttendance,
                                log: `${currentTime}`,
                            });
                        } else if (currentTime > endTimePlus2) {
                            // check out late
                            existingAttendance.shift_info.time_slot.check_out = false;
                            existingAttendance.shift_info.time_slot.check_out_time = `${currentTime.toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin", })}`;
                            existingAttendance.shift_info.time_slot.check_out_status = 'missing';
                            existingAttendance.shift_info.time_slot.value += 0;
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
                    }
                }
            };
        } else {
            // different time zone
            const timeString = currentTime.toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin", });
            // const today = new Date();
            const timestampString = `${currentTime.toISOString().split('T')[0]}T${timeString}.000Z`;
            const timestamp = new Date(timestampString);

            console.log(timestamp);

            if (!existingAttendance) {
                // only check in
                const newAttendance = new AttendanceSchema({
                    date: date,
                    weekday: getDayString(weekday),
                    employee_id: employeeID,
                    employee_name: employee.name,
                    role: employee.role,
                    department_code: employee.department_code,
                    department_name: employee.department_name,
                    grouped_work_code: employee.grouped_work_code,
                    day_off_code: employee.day_off_code,
                    shift_info: {
                        shift_code: shift_code
                    }
                });
                const [startHours, startMinutes] = time_slot.detail[0].start_time.split(':').map(Number);
                const startTime = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), startHours, startMinutes);
                // Calculate startTime - 30 minutes
                const startTimeMinus30 = new Date(startTime);
                startTimeMinus30.setMinutes(startTime.getMinutes() - 30);

                // Calculate startTime + 30 minutes
                const startTimePlus30 = new Date(startTime);
                startTimePlus30.setMinutes(startTime.getMinutes() + 30);
                if (timestamp > startTimeMinus30 && timestamp < startTimePlus30) {
                    // check in on time
                    newAttendance.shift_info.time_slot.check_in = true;
                    newAttendance.shift_info.time_slot.check_in_time = `${currentTime.toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin", })}`;
                    newAttendance.shift_info.time_slot.check_in_status = 'on time';
                    newAttendance.shift_info.time_slot.value = time_slot.detail[0].value;
                    await newAttendance.save();
                    return res.status(CREATED).json({
                        success: true,
                        status: CREATED,
                        message: newAttendance,
                        log: `${currentTime}, ${timestamp}`,
                    });
                } else if (timestamp > startTimePlus30) {
                    // check in late
                    newAttendance.shift_info.time_slot.check_in = false;
                    newAttendance.shift_info.time_slot.check_in_time = `${currentTime.toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin", })}`;
                    newAttendance.shift_info.time_slot.check_in_status = 'missing';
                    newAttendance.shift_info.time_slot.value = 0;
                    await newAttendance.save();
                    return res.status(CREATED).json({
                        success: true,
                        status: CREATED,
                        message: newAttendance,
                        log: `${currentTime}, ${timestamp}`,
                    });
                } else if (timestamp < startTimeMinus30) {
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
                } else {
                    if (time_slot.total_number == 1) {
                        const [endHours, endMinutes] = time_slot.detail[0].end_time.split(':').map(Number);
                        const endTime = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), endHours, endMinutes);

                        // Calculate endTime + 2 hours
                        const endTimePlus2 = new Date(endTime);
                        endTimePlus2.setHours(endTime.getHours() + 2);
                        if (timestamp > endTime && timestamp < endTimePlus2) {
                            // check out on time
                            existingAttendance.shift_info.time_slot.check_out = true;
                            existingAttendance.shift_info.time_slot.check_out_time = `${currentTime.toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin", })}`;
                            existingAttendance.shift_info.time_slot.check_out_status = 'on time';
                            existingAttendance.shift_info.time_slot.value += time_slot.detail[0].value;
                            await existingAttendance.save();
                            return res.status(OK).json({
                                success: true,
                                status: OK,
                                message: existingAttendance,
                            });
                        } else if (timestamp > endTimePlus2) {
                            // check out late
                            existingAttendance.shift_info.time_slot.check_out = false;
                            existingAttendance.shift_info.time_slot.check_out_time = `${currentTime.toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin", })}`;
                            existingAttendance.shift_info.time_slot.check_out_status = 'missing';
                            existingAttendance.shift_info.time_slot.value += 0;
                            await existingAttendance.save();
                            return res.status(OK).json({
                                success: true,
                                status: OK,
                                message: existingAttendance,
                            });
                        } else if (timestamp < endTime) {
                            // check out too soon
                            return res.status(BAD_REQUEST).json({
                                success: false,
                                status: BAD_REQUEST,
                                message: `You can not check out at this time ${currentTime.toLocaleTimeString()}`,
                            });
                        }
                    } else if (time_slot.total_number == 2) {
                        const [endHours, endMinutes] = time_slot.detail[1].end_time.split(':').map(Number);
                        const endTime = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), endHours, endMinutes);

                        // Calculate endTime + 2 hours
                        const endTimePlus2 = new Date(endTime);
                        endTimePlus2.setHours(endTime.getHours() + 2);
                        if (timestamp > endTime && timestamp < endTimePlus2) {
                            // check out on time
                            existingAttendance.shift_info.time_slot.check_out = true;
                            existingAttendance.shift_info.time_slot.check_out_time = `${currentTime.toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin", })}`;
                            existingAttendance.shift_info.time_slot.check_out_status = 'on time';
                            existingAttendance.shift_info.time_slot.value += time_slot.detail[1].value;
                            await existingAttendance.save();
                            return res.status(OK).json({
                                success: true,
                                status: OK,
                                message: existingAttendance,
                            });
                        } else if (timestamp > endTimePlus2) {
                            // check out late
                            existingAttendance.shift_info.time_slot.check_out = false;
                            existingAttendance.shift_info.time_slot.check_out_time = `${currentTime.toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin", })}`;
                            existingAttendance.shift_info.time_slot.check_out_status = 'missing';
                            existingAttendance.shift_info.time_slot.value += 0;
                            await existingAttendance.save();
                            return res.status(OK).json({
                                success: true,
                                status: OK,
                                message: existingAttendance,
                            });
                        } else if (timestamp < endTime) {
                            // check out too soon
                            return res.status(BAD_REQUEST).json({
                                success: false,
                                status: BAD_REQUEST,
                                message: `You can not check out at this time ${currentTime.toLocaleTimeString()}`,
                            });
                        }
                    }
                }
            };
        }
    } catch (err) {
        next(err);
    }
}

export const getAttendanceHistory = async (req, res, next) => {
    const employeeID = req.params.employeeID;
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

