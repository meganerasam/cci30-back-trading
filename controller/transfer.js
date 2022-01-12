const { getAllUsers } = require("./auth");
const { getBinanceAccountInfo, getUsdtOrderPrice, getAllUSDTPairs, getOrderQtyForTransfer, accountSnapshotSpecificDate, fiatDepositWithdrawHistory } = require("./binance");
const { getCCi30Info } = require("./constituents");
const moment = require("moment");


exports.transfer = async () => {
    try {
        // Variables
        let allUsers;
        let cci30Constituents;
        let ordersWithQty;
        let exeSellMarketStatus;
        let exeBuyLimitStatus;
        let canceledOrders;

        const callPromises = await Promise.all([
            // 1. Get all users from DB
            getAllUsers(),
            // 2. Get CCi30 constituents from Google Sheet
            getCCi30Info()
        ]);

        allUsers = callPromises[0];
        cci30Constituents = callPromises[1];

        // Loop through all users and rebalance their wallet
        await allUsers.map(async (u, i) => {
            setTimeout(async () => {
                // Inner variables for each user 
                let apiKey = u.apiKey;
                let secureKey = u.secureKey;

                // Get account details on first day of last month
                let startFirstday = moment(new Date()).subtract(1, 'months').startOf('month').format('DD/MM/YYYY');
                let startFirstdaySX = moment(startFirstday + " 00:00:00", "DD/MM/YYYY HH:mm:ss").utcOffset('+0000').format("x")
                let endFirstdaySX = moment(startFirstday + " 23:59:59", "DD/MM/YYYY HH:mm:ss").utcOffset('+0000').format("x")
                let startFirstdayBtcX = moment(endFirstdaySX, "x").utcOffset('+0000').subtract(1, 'hour').format("x")
                let endFirstdayBtcX = moment(startFirstday + " 23:59:59", "DD/MM/YYYY HH:mm:ss").utcOffset('+0000').format("x")

                let firstDayLastMonthAccount = await accountSnapshotSpecificDate(apiKey, secureKey, startFirstdaySX, endFirstdaySX, startFirstdayBtcX, endFirstdayBtcX)

                // Get account details on last day of last month
                let endFirstday = moment(new Date()).subtract(1, 'months').endOf('month').format('DD/MM/YYYY');
                let startFirstdayEX = moment(endFirstday + " 00:00:00", "DD/MM/YYYY HH:mm:ss").utcOffset('+0000').format("x")
                let endFirstdayEX = moment(endFirstday + " 23:59:59", "DD/MM/YYYY HH:mm:ss").utcOffset('+0000').format("x")
                let startFirstdayBtcEX = moment(endFirstdayEX, "x").utcOffset('+0000').subtract(1, 'hour').format("x")
                let endFirstdayBtcEX = moment(endFirstday + " 23:59:59", "DD/MM/YYYY HH:mm:ss").utcOffset('+0000').format("x")

                let lastDayLastMonthAccount = await accountSnapshotSpecificDate(apiKey, secureKey, startFirstdayEX, endFirstdayEX, startFirstdayBtcEX, endFirstdayBtcEX)

                // Get deposit for last month
                let depositInfo = await fiatDepositWithdrawHistory(u, startFirstdaySX, endFirstdayEX, 0);

                // Get withdraw for last month
                let withdrawInfo = await fiatDepositWithdrawHistory(u, startFirstdaySX, endFirstdayEX, 1);

                // Compute total gain
                let gain = lastDayLastMonthAccount.totalAssetOfUsdt - firstDayLastMonthAccount.totalAssetOfUsdt - depositInfo + withdrawInfo;

                console.log("GAIN: ", gain);

                

                // Get Binance wallet info
                /*let userWalletConstituents = await getBinanceAccountInfo(apiKey, secureKey);

                console.log("WALLET: ", userWalletConstituents);


                // Get all cci30 USDT value
                let allUsdtPairsRaw = await getAllUSDTPairs(apiKey, secureKey, userWalletConstituents, cci30Constituents);
                let allUsdtPairs = allUsdtPairsRaw[0];

                // Get all cci30 USDT order price
                let allUsdtPairsWithOrderPriceRaw = await getUsdtOrderPrice(apiKey, secureKey, allUsdtPairs);
                let allUsdtPairsWithOrderPrice = allUsdtPairsWithOrderPriceRaw[0];

                // Get order list
                let orderListToUsdt = await getOrderQtyForTransfer(userWalletConstituents, allUsdtPairsWithOrderPrice);

                console.log("ORDER LIST: ", orderListToUsdt);*/



            }, i * 60 * 1000);
        })


        // Get binance wallet info

        // Sell everything to USDT

        // Make transfer to Crypto Bulot

        // Get account to get what's left after transfer

        // Perform rebalancing

    } catch (error) {
        console.log("Error in transfer function: ", error)
    }
}