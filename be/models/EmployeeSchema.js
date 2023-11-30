import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            required: true,
            unique: true
        },
        name: {
            type: String,
            required: true,
        },
        password: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        phone: {
            type: String,
            required: true,
        },
        address: {
            type: String,
            required: true,
        },
        dob: {
            type: String,
            required: true,
        },
        gender: {
            type: String,
        },
        role: {
            type: String,
            // Nhân viên, Trưởng phòng, Trợ lý, Phó phòng, Giám đốc, Phó giám đốc,
            // Tổng giám đốc, Phó tổng giám đốc
            enum: ['employee', 'leader', 'assistant', 'deputy', 'manager', 'vice president',
                'general manager', 'deputy general manager'],
            default: 'employee',
        },
        department_code: {
            type: String,
            // required: true
        },
        department_name: {
            type: String,
            // required: true
        },
        salary_service_code: {
            type: String,
            // required: true,
        },
        grouped_work_code: {
            type: String,
        },
        day_off_code: {
            type: String,
        },
        schedules: [
            {
                work_schedules: {
                    type: Object,
                },
                dayOff_schedules: {
                    type: Array,
                }
            },
        ],
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
        }
    },
    { timestamps: true }
);

export default mongoose.model("Employee", employeeSchema);