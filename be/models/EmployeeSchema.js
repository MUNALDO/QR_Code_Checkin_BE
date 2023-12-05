import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            // required: true,
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
        address: {
            type: String,
        },
        dob: {
            type: String,
        },
        gender: {
            type: String,
        },
        department_name: {
            type: String,
        },
        role: {
            type: String,
            default: 'Employee',
        },
        position: {
            type: String,
            // dịch vụ, quán ba, Phòng bếp, delivery, tài xế
            enum: ['Service', 'Bar', 'Küche', 'Lito', 'Autofahrer', 'Fahrradfahrer',
                'Büro', 'Lehrgang für Azubi', 'FacTech GmbH'],
        },
        salary_service_code: {
            type: String,
        },
        default_total_dayOff: {
            type: Number,
            default: 0
        },
        schedules: [
            {
                date: {
                    type: Date,
                    required: true
                },
                shift_design: [
                    {
                        shift_code: {
                            type: String,
                            required: true
                        },
                        time_slot: {
                            type: Object,
                        },
                        shift_type: {
                            type: String,
                            enum: ['normal', 'overtime']
                        }
                    }
                ],
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