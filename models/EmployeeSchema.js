import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            required: true,
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
        house_rent_money: {
            type: Number,
            default: 0
        },
        salary: [
            {
                year: {
                    type: Number
                },
                month: {
                    type: Number
                },
                date_calculate: {
                    type: Date
                },
                total_salary: {
                    type: Number
                },
                hour_normal: {
                    type: Number
                },
                hour_overtime: {
                    type: Number
                },
                total_km: {
                    type: Number
                },
                a_parameter: {
                    type: Number
                },
                b_parameter: {
                    type: Number
                },
                c_parameter: {
                    type: Number
                },
                d_parameter: {
                    type: Number,
                    default: 0.25
                },
            }
        ],
        default_day_off: {
            type: Number,
        },
        realistic_day_off: {
            type: Number,
        },
        attendance_stats: [
            {
                year: {
                    type: Number
                },
                month: {
                    type: Number
                },
                date_on_time: {
                    type: Number
                },
                date_late: {
                    type: Number
                },
                date_missing: {
                    type: Number
                },
            }
        ],
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
        dayOff_schedule: [],
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
        }
    },
    { timestamps: true }
);

export default mongoose.model("Employee", employeeSchema);