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
        time_range: [String],
        shift_type: {
            type: String,
            enum: ['default', 'custom'],
            required: true
        },
    },
    { timestamps: true }
);

export default mongoose.model("Shift", shiftSchema);
