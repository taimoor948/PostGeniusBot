import mongoose from "mongoose";

const userSchema = mongoose.Schema({
    tgId: {
        type: String, // Corrected: specifying the type directly
        required: true,
        unique: true,
    },
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    isBot: {
        type: Boolean,
        required: true
    },
    username: {
        type: String,
        required: true,
        unique: true,
    },
    promptTokens: {
        type: Number,
        required: false,
    },
    completionTokens: {
        type: Number,
        required: false, // Corrected: property name should be "required" instead of "require"
    },
}, {timestamps:true});

export default mongoose.model("User", userSchema);
