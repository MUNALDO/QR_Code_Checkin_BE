import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
    {
        date: {
            type: Date,
            required: true,
        },
        weekday: {
            type: String,
            enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
        },
        employee_id: {
            type: Number,
            required: true,
        },
        employee_name: {
            type: String,
            required: true,
        },
        role: {
            type: String,
        },
        department_code: {
            type: String,
        },
        department_name: {
            type: String,
        },
        shift_info: {
            shift_code: {
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
                    enum: ['on time', 'missing']
                },
                check_out: {
                    type: Boolean,
                },
                check_out_time: {
                    type: String,
                },
                check_out_status: {
                    type: String,
                    enum: ['on time', 'missing']
                },
                value: {
                    type: Number
                }
            }
        },
        note: {
            type: String,
        },
    },
    { timestamps: true }
);

export default mongoose.model("Attendance", attendanceSchema);
