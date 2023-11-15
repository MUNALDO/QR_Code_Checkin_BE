import mongoose from "mongoose";

const ScheduleSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
    },
});

const employeeSchema = new mongoose.Schema(
    {
        id: {
            type: Number,
            required: true,
            // unique: true
        },
        name: {
            type: String,
            required: true,
        },
        password: {
            type: String,
            required: true,
        },
        gender: {
            type: String,
        },
        role: {
            type: String,
            default: 'employee',
        },
        level: {
            type: String,
            enum: ['L1', 'L2', 'L3', 'L4', 'L5'],
            required: true
        },
        basic_salary_per_month: {
            type: Number,
            // required: true,
        },
        employee_schedules: {
            type: [ScheduleSchema]
        },
        work_days: {
            type: Number,
        }
    },
    { timestamps: true }
);

export default mongoose.model("Employee", employeeSchema);