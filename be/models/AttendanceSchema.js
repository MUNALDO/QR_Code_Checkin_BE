import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
    {
        date: {
            type: Date,
            required: true,
        },
        employee_id: {
            type: Number,
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
            time_slot: {
                check_in: {
                    type: Boolean,
                },
                check_in_time: {
                    type: String,
                },
                check_in_status: {
                    type: String,
                    enum: ['on time', 'missing', 'late']
                },
                check_out: {
                    type: Boolean,
                },
                check_out_time: {
                    type: String,
                },
                check_out_status: {
                    type: String,
                    enum: ['on time', 'missing', 'late']
                },
                total_hour: {
                    type: Number
                }
            }
        },
        image_upload: {
            type: String,
        },
    },
    { timestamps: true }
);

export default mongoose.model("Attendance", attendanceSchema);
