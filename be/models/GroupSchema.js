import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
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
        shift_type: {
            type: String,
            enum: ['default', 'custom'],
            required: true
        },
        shift_design: [
            {
                date: {
                    type: String,
                    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                    required: true
                },
                shift_code: {
                    type: String,
                    required: true
                },
                time_range: [String]
            }
        ],
        members: [],
    },
    { timestamps: true }
);

export default mongoose.model("Group", groupSchema);
