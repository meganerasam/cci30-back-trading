const {
    getBinanceAccountInfo,
    getAllUSDTPairs,
    getUsdtOrderPrice,
    getBinanceWalletBTCValues,
    getOrderListWithoutQty,
    getOrderQty,
    placeSellMarketOrders,
    placeBuyLimitOrders,
    getOpenOrdersList,
    convertToBnbArray,
    convertToBnb,
    getAllHistoryOfTheDay
} = require('./binance');
const { getCCi30Info } = require('./constituents');
const { getAllUsers } = require('./auth');
const moment = require('moment');
const sendEmail = require('../utils/sendEmail');

const isInArray = (arrayToCkeck, assetToCheck) => {
    let arr = arrayToCkeck;

    return arr.some(function (a) {
        return a.asset === assetToCheck;
    });
}

exports.rebalancing = async (req, res, next) => {
    try {
        // Variables
        let allUsers;
        let cci30Constituents;
        let ordersWithQty;
        let exeSellMarketStatus;
        let exeBuyLimitStatus;
        let canceledOrders;

        const callPromises = await Promise.all([
            // 1. Get CCi30 constituents from Google Sheet
            getCCi30Info()
        ]);
        cci30Constituents = callPromises[1];

        // 3. Loop through all users and rebalance their wallet
        // Inner variables for each user 
        let apiKey = req.query.api;
        let secureKey = req.quesry.secure;

        // 3.1. Get Binance wallet info
        let userWalletConstituents = await getBinanceAccountInfo(apiKey, secureKey);

        // 3.2. Get all cci30 USDT value
        let allUsdtPairsRaw = await getAllUSDTPairs(apiKey, secureKey, userWalletConstituents, cci30Constituents);
        let allUsdtPairs = allUsdtPairsRaw[0];

        // 3.3. Get all cci30 USDT order price
        let allUsdtPairsWithOrderPriceRaw = await getUsdtOrderPrice(apiKey, secureKey, allUsdtPairs);
        let allUsdtPairsWithOrderPrice = allUsdtPairsWithOrderPriceRaw[0];

        // 3.4. Get wallet BTC value of each coins
        let binanceWalletBtcValue = await getBinanceWalletBTCValues(userWalletConstituents, allUsdtPairsWithOrderPrice);
        //console.log(u.firstName, " WALLET: ");
        console.log("PERCENTAGE: ", binanceWalletBtcValue.clientWallet)
        //console.log("TOTAL BTC: ", binanceWalletBtcValue.totalBTC)
        //console.log("TOTAL USDT: ", binanceWalletBtcValue.totalUSDT)

        // 3.5. Get order list without quantity yet
        let ordersWithoutQty = await getOrderListWithoutQty(binanceWalletBtcValue.clientWallet, binanceWalletBtcValue.totalUSDT, cci30Constituents, allUsdtPairs)

        // 3.6. Get order list with quantity
        if (ordersWithoutQty.orderList.length > 0) {
            ordersWithQty = await getOrderQty(ordersWithoutQty.orderList, allUsdtPairs, binanceWalletBtcValue.totalBTC)

            console.log("ORDERS LIST: ", ordersWithQty);

            // Inner variables
            let sellOrders = [];
            let buyOrders = [];

            // Separate SELL from BUY
            await ordersWithQty[0].map(async (o) => {
                if (o.order_type == "SELL") {
                    if (isInArray(sellOrders, o.asset) == false) {
                        sellOrders.push(o);
                    }
                } else {
                    if (isInArray(buyOrders, o.asset) == false) {
                        buyOrders.push(o);
                    }
                }
            })

            // 3.7. If there are sell orders, execute them first to have USDT liquidity
            if (sellOrders.length > 0) {
                exeSellMarketStatus = await placeSellMarketOrders(sellOrders, u)
            }

            // 3.8. Place all buy limit order after 3min so that we are sure that are executed all sell markets
            setTimeout(async () => {
                exeBuyLimitStatus = await placeBuyLimitOrders(apiKey, secureKey, buyOrders)
                //console.log("EXEC BUY LIMIT: ", exeBuyLimitStatus)
            }, (i + 0.5) * 60 * 1000);

            // 3.9. Check for limit orders that have not been executed yet
            // 3.10. Cancel them and go for market orders
            setTimeout(async () => {
                canceledOrders = await getOpenOrdersList(apiKey, secureKey);

                // 3.11. Convert dust to BNB
                /*let newUserWalletConstituents = await getBinanceAccountInfo(apiKey, secureKey);
                let bnbConversionArray = await convertToBnbArray(cci30Constituents, newUserWalletConstituents);
                let bnbConversionOrder = await convertToBnb(apiKey, secureKey, bnbConversionArray);*/
            }, (i + 1.5) * 60 * 1000);

            // 3.12. Get order history of rebalacing
            setTimeout(async () => {
                let combinedConsituents = [];

                // 3.12.1 Get Binance wallet info
                let walletConstituents = await getBinanceAccountInfo(apiKey, secureKey);

                // 3.12.2. Loop though all assets inside client wallet
                Promise.all(walletConstituents.map(async (t) => {
                    if (t.asset != "USDT") {
                        combinedConsituents.push(t);
                    }

                    return combinedConsituents;
                }))

                let end = moment(new Date()).utcOffset('+0000').format("x");
                let start = moment(end, "x").subtract(60, 'minutes').format("x");

                // 3.12.3. Get order history of merged assets
                await getAllHistoryOfTheDay(combinedConsituents, u, start, end, "Rebalancing");
            }, (i + 2) * 60 * 1000);

        } else {
            console.log("NO ORDER TO MAKE")
            try {
                await sendEmail({
                    to: u.email,
                    bcc: 'megane@crypto-bulot.com',
                    subject: `Portefeuille à jour`,
                    text: `Le pourcentage de chaque coin pour ce mois de ${moment(new Date).format("MMM")} ne nécessite aucun rééquilibrage`
                });

                console.log("Email sent for no Rebalancing")
            } catch (error) {
                console.log("Email could not be sent for no Rebalancing")
            }
        }
    } catch (error) {
        console.log("ERROR IN REBALAING: ", error)
    }
}

