import mongoose from "mongoose";

const shiftSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            unique: true,
            required: true
        },
        name: {
            type: String,
            unique: true,
            required: true
        },
        time_slot: {
            total_number: {
                type: Number,
            },
            time_check: {
                type: Number,
            },
            detail: [
                {
                    number: {
                        type: Number,
                    },
                    start_time: {
                        type: String,
                    },
                    end_time: {
                        type: String,
                    },
                    value: {
                        type: Number,
                    }
                }
            ]
        },
        shift_type: {
            type: String,
            enum: ['default', 'custom'],
            required: true
        },
    },
    { timestamps: true }
);

export default mongoose.model("Shift", shiftSchema);
