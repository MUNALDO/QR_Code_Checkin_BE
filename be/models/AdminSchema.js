import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            // required: true,
            unique: true
        },
        name: {
            type: String,
            required: true,
        },
        password: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        address: {
            type: String,
        },
        dob: {
            type: String,
        },
        gender: {
            type: String,
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