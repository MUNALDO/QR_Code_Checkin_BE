import mongoose from "mongoose";

const requestSchema = new mongoose.Schema(
    {
        employee_id: {
            type: String,
            required: true
        },
        employee_name: {
            type: String,
            required: true
        },
        default_total_dayOff: {
            type: Number
        },
        request_dayOff_start: {
            type: Date,
            required: true
        },
        request_dayOff_end: {
            type: Date,
            required: true
        },
        request_content: {
            type: String,
            enum: ['Holiday', 'Sick day'],
            required: true
        },
        answer_status: {
            type: String,
            enum: ['approved', 'denied', 'pending'],
            default: 'pending'
        },
        image: {
            type: String,
        },
    },
    { timestamps: true }
);

export default mongoose.model("Request", requestSchema);