const express = require('express');
const { rebalancing, getOpenOrders, addRebalancingAccountsnapshot, convertDust } = require("../controller/rebalancing");

const router = express.Router();

router.get("/rebalancing", rebalancing);
router.get("/openOrders", getOpenOrders);
router.get("/convertDust", convertDust);
router.get("/addRebalancingAS", addRebalancingAccountsnapshot);

module.exports = router;