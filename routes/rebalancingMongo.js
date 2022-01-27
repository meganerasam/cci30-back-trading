const express = require('express');
const { rebalancing } = require("../controller/rebalancingMongo");

const router = express.Router();

router.get("/rebalancing", rebalancing);

module.exports = router;