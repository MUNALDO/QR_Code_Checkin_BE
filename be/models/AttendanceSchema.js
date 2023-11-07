import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
    {
        date: {
            type: Date,
            required: true,
        },
        isChecked: {
            check_in: {
                type: Boolean,
                default: false,
            },
            check_out: {
                type: Boolean,
                default: false,
            },
            check_in_time: {
                type: String,
                default: null,
            },
            check_out_time: {
                type: String,
                default: null,
            },
            check_in_status: {
                type: String,
                enum: ['on time', 'late', 'missing'],
                default: null,
            },
            check_out_status: {
                type: String,
                enum: ['on time', 'late', 'missing'],
                default: null,
            },
        },
        employee_id: {
            type: Number,
            required: true,
        },
        employee_name: {
            type: String,
            required: true,
        },
        total_salary: {
            type: Number,
            required: true,
        },
        note: {
            type: String,
        },
    },
    { timestamps: true }
);

export default mongoose.model("Attendance", attendanceSchema);
