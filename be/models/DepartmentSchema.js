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
                sub_code: {
                    type: String,
                    unique: false, 
                    default: null
                },
                sub_name: {
                    type: String,
                    unique: false,
                },
            },
        ],
        members: []
    },
    { timestamps: true }
);

export default mongoose.model("Department", departmentSchema);
