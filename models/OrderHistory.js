const mongoose = require('mongoose');

// Create Schema
const OrderHistorySchema = mongoose.Schema({
    uid: {
        type: String,
        require: true
    },
    date: {
        type: String,
        required: [true, "Please provide a date for order history"]
    },
    orderHistory: {
        type: Array,
        required: [true, "Please provide an array of orders"]
    },
    type: {
        type: String,
        require: true
    },
},
    {
        timestamps: true
    }
);

const OrderHistory = mongoose.model("OrderHistory", OrderHistorySchema);

module.exports = OrderHistory;

// Type "Other" ==> other than rebalancing orders
// Type "Rebalancing" ==> orders related to rebalancing