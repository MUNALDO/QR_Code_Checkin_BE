import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
    {
        department_name: {
            type: String,
            required: true
        },
        date: {
            type: Date,
            required: true,
        },
        employee_id: {
            type: String,
            required: true,
        },
        employee_name: {
            type: String,
            required: true,
        },
        department_name: {
            type: String,
        },
        role: {
            type: String,
        },
        position: {
            type: String,
        },
        shift_info: {
            shift_code: {
                type: String,
            },
            shift_type: {
                type: String,
            },
            time_slot: {
                check_in: {
                    type: Boolean,
                },
                check_in_time: {
                    type: String,
                },
                check_in_status: {
                    type: String,
                    enum: ['on time', 'late']
                },
                check_out: {
                    type: Boolean,
                },
                check_out_time: {
                    type: String,
                },
                check_out_status: {
                    type: String,
                    enum: ['on time', 'late']
                },
            },
            total_hour: {
                type: Number
            },
            total_minutes: {
                type: Number
            }
        },
        car_info: {
            car_type: {
                type: String,
                enum: ['company', 'private']
            },
            car_number: {
                type: String
            }
        },
        check_out_image: {
            type: String
        },
        check_in_km: {
            type: Number,
            default: 0
        },
        check_out_km: {
            type: Number,
            default: 0
        },
        total_km: {
            type: Number,
            default: 0
        },
        status: {
            type: String,
            enum: ['checked', 'missing']
        }
    },
    { timestamps: true }
);

export default mongoose.model("Attendance", attendanceSchema);
