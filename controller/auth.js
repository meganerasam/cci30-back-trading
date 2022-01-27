const Client = require('../models/Client');
const moment = require("moment");

exports.getAllUsers = async (req, res, next) => {
    try {
        // Find all user using "type" property
        const clients = await Client.find({ type: "Client", status: 1 });

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

exports.newClient = async (req, res, next) => {
    try {
        // Variables
        const {
            lastName,
            firstName,
            email,
            apiKeyReadOnly,
            secureKeyReadOnly,
            apiKeyTransfer,
            secureKeyTransfer,
            apiKey,
            secureKey,
            startSubscription,
            initialCapital,
            adminCreator,
        } = req.body;

        const newCustomer = await Client.create({
            lastName,
            firstName,
            email,
            apiKey,
            secureKey,
            apiKeyReadOnly,
            secureKeyReadOnly,
            apiKeyTransfer,
            secureKeyTransfer,
            startSubscription: moment(startSubscription, "YYYY-MM-DD").format("DD/MM/YYYY"),
            initialCapital: Number(initialCapital),
            adminCreator
        })

        res.json({ msg: 'Nouveau client ajouté avec succès !', customer: newCustomer })

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}
