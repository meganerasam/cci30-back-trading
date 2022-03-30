const express = require('express');
const { 
    pnl, 
    addBeforeRebalancingAccountsnapshot, 
    placeSellOrders,
    updateWithdrawDetails,
    rebalancingOK
 } = require("../controller/transfer");

const router = express.Router();

router.get("/pnl", pnl);
router.get("/walletBF", addBeforeRebalancingAccountsnapshot);
router.get("/sell", placeSellOrders);
router.get("/test", rebalancingOK);
module.exports = router;