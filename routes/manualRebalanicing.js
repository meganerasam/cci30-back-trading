const express = require('express');
const { rebalancing } = require("../controller/manualRebalancing");

const router = express.Router();

router.get("/rebalancing", rebalancing);

module.exports = router;