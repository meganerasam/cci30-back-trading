const express = require('express');
const { 
    rebalancing, 
    getOpenOrders, 
    addRebalancingAccountsnapshot, 
    convertDust, 
    addBeforeRebalancingAccountsnapshot,
    sendFirstRebalancingEmail 
} = require("../controller/rebalancing");

const router = express.Router();

router.get("/rebalancing", rebalancing);
router.get("/openOrders", getOpenOrders);
router.get("/convertDust", convertDust);
router.get("/addBeforeRebalancingAS", addBeforeRebalancingAccountsnapshot);
router.get("/addRebalancingAS", addRebalancingAccountsnapshot);
router.get("/sendEmailFirstRebalancing", sendFirstRebalancingEmail);

module.exports = router;