const Client = require('../models/Client');

exports.getAllUsers = async (req, res, next) => {
    try {
        // Find all user using "type" property
        const clients = await Client.find({ type: "Client" });

        if (!clients) {
            return next(new ErrorResponse("No client found", 401));
        }

        // Return all clients in MongiDB
        return clients;
        //res.status(200).json(clients);

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}
