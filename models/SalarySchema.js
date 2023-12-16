import mongoose from "mongoose";

const salarySchema = new mongoose.Schema(
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
        basic_salary: {
            type: Number,
            required: true
        },
        members: []
    },
    { timestamps: true }
);

export default mongoose.model("Salary", salarySchema);
