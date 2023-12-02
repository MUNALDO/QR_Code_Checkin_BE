import mongoose from "mongoose";

const dateDesignSchema = new mongoose.Schema(
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
                members: [],
            }
        ],
    },
    { timestamps: true }
);

export default mongoose.model("Date Design", dateDesignSchema);
