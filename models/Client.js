const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Create Schema
const ClientSchema = mongoose.Schema({
    firstName: {
        type: String,
        required: [true, "Please provide a first name"]
    },
    lastName: {
        type: String,
        required: [true, "Please provide a last name"]
    },
    email: {
        type: String,
        required: [true, "Please provide an email"],
        unique: [true, "Email already exists, please login"],
        match: [
            /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/,
            "Please provide a valid email"
        ]
    },
    apiKey: {
        type: String,
        required: [true, "Please provide an API key"]
    },
    secureKey: {
        type: String,
        required: [true, "Please provide a secure key"]
    },
    apiKeyReadOnly: {
        type: String,
        required: [true, "Please provide an API key for read-only access"]
    },
    secureKeyReadOnly: {
        type: String,
        required: [true, "Please provide a secure key for read-only access"]
    },
    apiKeyTransfer: {
        type: String,
        required: [true, "Please provide a api key for transfer access"]
    },
    secureKeyTransfer: {
        type: String,
        required: [true, "Please provide a secure key for transfer access"]
    },
    type: {
        type: String,
        required: [true, "Please provide a user type"],
        default: "Client"
    },
    startSubscription: {
        type: String,
        required: [true, "Please provide a subscription start date"]
    },
    initialCapital: {
        type: Number,
        required: [true, "Please provide an initial investment amount"]
    },
    status: {
        type: Number,
        required: [true, "Please provide user status"],
        default: 1
    }
},
    {
        timestamps: true
    }
);

ClientSchema.methods.getSignedToken = function () {
    return jwt.sign(
        {
            id: this._id,
        },
        process.env.JWT_SECRET,
    );
};

const Client = mongoose.model("Client", ClientSchema);

module.exports = Client;