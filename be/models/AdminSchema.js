import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        password: {
            type: String,
            required: true,
        },
        department_name: {
            type: String,
        },
        role: {
            type: String,
            enum: ['Admin', 'Inhaber', 'Manager'],
            default: 'Admin',
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
        }
    },
    { timestamps: true }
);

export default mongoose.model("Admin", adminSchema);