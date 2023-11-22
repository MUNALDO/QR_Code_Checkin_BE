import mongoose from "mongoose";

const dayOffSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            unique: true
        },
        name: {
            type: String,
            required: true,
        },
        dayOff_schedule: [
            {
                date: {
                    type: String,
                    required: true,
                },
                type: {
                    type: String,
                    enum: ['day-off', 'holiday'],
                    default: 'day-off'
                },
                name: {
                    type: String,
                }
            }
        ],
        members: []
    },
    { timestamps: true }
);

export default mongoose.model("DayOff", dayOffSchema);
