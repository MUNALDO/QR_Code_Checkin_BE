import mongoose from "mongoose";

const ScheduleSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
    },
    shifts: [
        {
            shift: {
                type: String,
                enum: ["Morning", "Afternoon"],
                required: true,
            },
            isChecked: {
                type: Boolean,
                default: false,
            },
        }
    ]
});

const employeeSchema = new mongoose.Schema(
    {
        id: {
            type: Number,
            required: true,
            unique: true
        },
        name: {
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
        position: {
            type: String,
        },
        salary_per_hour: {
            type: Number,
            required: true,
        },
        ip: {
            type: String,
        },
        schedules: {
            type: [ScheduleSchema]
        },
    },
    { timestamps: true }
);

export default mongoose.model("Employee", employeeSchema);