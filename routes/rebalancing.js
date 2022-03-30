const express = require('express');
const { 
    rebalancingFirst, 
    rebalancingSecond,
    getOpenOrders, 
    addRebalancingAccountsnapshot, 
    convertDust, 
    addBeforeRebalancingAccountsnapshot,
    sendFirstRebalancingEmail,
    sendWithoutPnlRebalancingEmail,
    sendAllInOne,
    checkLastUsdtRemaning
} = require("../controller/rebalancing");

const router = express.Router();

router.get("/rebalancing1", rebalancingFirst);
router.get("/rebalancing2", rebalancingSecond);
router.get("/openOrders", getOpenOrders);
router.get("/checkUsdt", checkLastUsdtRemaning);
router.get("/convertDust", convertDust);
router.get("/addBeforeRebalancingAS", addBeforeRebalancingAccountsnapshot);
router.get("/addRebalancingAS", addRebalancingAccountsnapshot);
router.get("/sendEmailFirstRebalancing", sendFirstRebalancingEmail);
router.get("/sendEmailWithoutPnlRebalancing", sendWithoutPnlRebalancingEmail);
router.get("/sendAllInOne", sendAllInOne);


module.exports = router;