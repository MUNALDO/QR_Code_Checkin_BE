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
            start_time: {
                type: String,
            },
            end_time: {
                type: String,
            },
        },
    },
    { timestamps: true }
);

export default mongoose.model("Shift", shiftSchema);
