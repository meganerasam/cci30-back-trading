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
    emailStats: {
        type: String,
        required: [true, "Please provide an email to send stats to"],
        match: [
            /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/,
            "Please provide a valid email"
        ]
    },
    phone: {
        type: String,
        required: [true, "Please provide a phone number"]
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
    },
    secureKeyTransfer: {
        type: String,
    },
    type: {
        type: String,
        required: [true, "Please provide a user type"],
        default: "user"
    },
    startSubscription: {
        type: String,
        required: [true, "Please provide a subscription start date"]
    },
    subscriptionType: {
        type: String,
        required: [true, "Please provide a subscription type"]
    },
    initialCapital: {
        type: Number,
        required: [true, "Please provide an initial investmeen amount"]
    },
    curerncyCapital: {
        type: String,
        required: [true, "Please provide a currency for your capital"]
    },
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