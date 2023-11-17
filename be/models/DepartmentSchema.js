import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema(
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
        sub_department: [
            {
                code: {
                    type: String,
                    unique: false,
                    required: false,
                    sparse: true,
                },
                name: {
                    type: String,
                    unique: false,
                    required: false,
                },
            },
        ]
    },
    { timestamps: true }
);

export default mongoose.model("Department", departmentSchema);
