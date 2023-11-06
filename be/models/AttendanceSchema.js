import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
    {
        date: {
            type: Date,
            required: true,
        },
        isChecked: [
            {
                check_in: {
                    type: Boolean,
                    default: false,
                },
                time: {
                    type: String,
                    required: true,
                },
                status: {
                    type: String,
                    enum: ['on time', 'late', 'missing']
                },
            },
            {
                check_out: {
                    type: Boolean,
                    default: false,
                },
                time: {
                    type: String,
                    required: true,
                },
                status: {
                    type: String,
                    enum: ['on time', 'late', 'missing']
                },
            },
        ],
        employee_id: {
            type: Number,
            required: true,
            unique: true
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