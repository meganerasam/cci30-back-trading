const express = require('express');
const { rebalancing } = require("../controller/rebalancing");

const router = express.Router();

router.get("/rebalancing", rebalancing);

module.exports = router;