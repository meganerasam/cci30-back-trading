const { getAllUsers, getUsersAccountSnapshots, getUsersAccountSnapshotsLastHour, getUsersAccountSnapshotsCurrent } = require("./usersInfo");
const { getConstituentsInfo } = require("./constituentsInfo");
const { getAllUSDTPairs } = require("./binance");
const { Spot } = require('@binance/connector');
const axios = require("axios");
const moment = require("moment");
const https = require("https");
const req = require("express/lib/request");

const countDecimals = (value) => {

    if (Math.floor(value.valueOf()) === value.valueOf()) return 0;

    var str = value.toString();
    if (str.indexOf(".") !== -1 && str.indexOf("-") !== -1) {
        return str.split("-")[1] || 0;
    } else if (str.indexOf(".") !== -1) {
        return str.split(".")[1].length || 0;
    }
    return str.split("-")[1] || 0;
}

const isInArray = (arrayToCkeck, assetToCheck) => {
    let arr = arrayToCkeck;

    return arr.some(function (a) {
        return a.asset === assetToCheck;
    });
}

// Get all USDT info (MIN_NOTIONAL, STEP_SIZE, etc)
const allUsdtPairsFunction = async (user, clientwallet, cci30Info) => {
    try {
        // Variables
        let usdtPairsAssets = [];
        let stepSize;
        let minQty;
        let minNotional;
        let tickSize;

        // Combine both array so we will have all CCi30 components as well as those that are in the wallet but not in CCi30
        let combinedArray = [...clientwallet, ...cci30Info];

        // Connect to Binance account
        const client = new Spot(user.apiKeyReadOnly, user.secureKeyReadOnly);

        const cci30Mapping = combinedArray.map(async (c) => {
            //console.log("ASSET: ", c.asset, " EXISTS ? ", isInArray(usdtPairsAssets, c.asset), " ARRAY: ", usdtPairsAssets);
            if (c.asset != "USDT") {

                // Get exchange info to get all pairs
                await client.exchangeInfo({ symbol: `${c.asset}usdt` })
                    .then(async (response) => {
                        //client.logger.log(response.data.symbols);
                        response.data.symbols[0].filters.map(async (a) => {
                            // Get minimum lot size value
                            if (a.filterType == "LOT_SIZE") {
                                //client.logger.log(`LOT ${c.asset}: ${a.stepSize}`);
                                stepSize = Number(a.stepSize);
                                minQty = Number(a.minQty);
                            }

                            // Get minimum notional value
                            if (a.filterType == "MIN_NOTIONAL") {
                                //client.logger.log(`MIN ${c.asset}: ${a.minNotional}`);
                                minNotional = Number(a.minNotional);
                            }

                            // Get tick size value
                            if (a.filterType == "PRICE_FILTER") {
                                //client.logger.log(`MIN ${a.asset}: ${a.minNotional}`);
                                tickSize = Number(a.tickSize);
                            }
                        })

                        // Update assets allOrderPrice array
                        let tempObj = {
                            asset: c.asset,
                            step_size: stepSize,
                            order_price: 0,
                            min_qty: minQty,
                            min_notional: minNotional,
                            tick_size: tickSize,
                        }

                        if (await isInArray(usdtPairsAssets, c.asset) == false) {
                            //console.log("ALREADY EXIXTS");
                            usdtPairsAssets.push(tempObj);
                        }

                        //console.log("ARRAY: ", usdtPairsAssets)
                    })

                //console.log("BRO: ", usdtPairsAssets);
                return usdtPairsAssets;
            }
        })

        // Get all historical value to get the order price
        const numFruits = await Promise.all(cci30Mapping)
        //console.log("FRUIT: ", numFruits[0]);
        return numFruits
    } catch (error) {
        console.log("ALL USDT PAIRS CLIENT ERROR: ", error)
    }
}

// Get order price for each pair
const usdtOrderPriceFunction = async (user, asset) => {
    const client = new Spot(user.apiKeyReadOnly, user.secureKeyReadOnly);

    // Variables
    let order_price;
    let decimalNumber;
    let decimalTickSize;

    // Get order price for the asset
    try {
        const priceMapping = await asset.map(async (a) => {
            if (a.asset != "USDT") {
                //await client.historicalTrades(`${a.asset}usdt`, { limit: 120 })
                await client.avgPrice(`${a.asset}USDT`)
                    .then(async response => {
                        //console.log("AVG PRICE: ", Number((Number(response.data.price)).toFixed(2)));
                        let decimalCount = countDecimals(a.tick_size);

                        a.order_price = Number((Number(response.data.price)).toFixed(decimalCount));
                    })
            }

            return asset;
        })

        const numFruits = await Promise.all(priceMapping)
        return numFruits

    } catch (error) {
        console.log("ERROR IN HISTORICAL TRADES: ", error)
    }
}

// Calculate crypto percentage in user wallet
const calculatePercentageWallet = async (clientwallet, usdtpairs) => {
    // Variables
    let totalBTC = 0;
    let totalUSDT = 0;

    // Get all assets BTC value
    const btcValues = await clientwallet.map(async (w) => {
        if (w.asset == "BTC") {
            await usdtpairs.map(async (u) => {
                if (u.asset == "BTC") {
                    w.order_price = u.order_price;
                }
            })

            // BTC value is the same as the quantuty of BTC in wallet
            w.btc_value = Number(w.free);
            totalBTC = totalBTC + Number(w.free);
        } else if (w.asset == "USDT") {
            await usdtpairs.map(async (u) => {

                if (u.asset == "BTC") {
                    let decimalNumber = ((u.step_size).toString().length) - 2;

                    if (decimalNumber < 0) {
                        decimalNumber = 0;
                    }

                    w.btc_value = parseFloat((Number(w.free) / u.order_price).toFixed(decimalNumber));
                    w.order_price = u.order_price;
                    totalBTC = totalBTC + (Number(w.free) / u.order_price);
                }
            })
        } else if (w.asset != "USDT" && w.asset != "BTC") {
            await usdtpairs.map(async (u) => {
                if (w.asset == u.asset) {
                    w.order_price = u.order_price;

                    // 1. Get USDT value of the coin
                    let coinUSDTvalue = Number(Number(w.free)) * Number(u.order_price);

                    // 2. Get BTC value of the coin
                    await usdtpairs.map(async (u2) => {
                        let decimalNumber = Number(((u2.step_size).toString().length) - 2);

                        if (decimalNumber < 0) {
                            decimalNumber = 0;
                        }

                        if (u2.asset == "BTC") {
                            w.btc_value = parseFloat((coinUSDTvalue / Number(u2.order_price)).toFixed(decimalNumber));
                            totalBTC = totalBTC + (coinUSDTvalue / Number(u2.order_price));
                        }
                    })
                }
            })
        }
    })

    await usdtpairs.map(async (u) => {
        if (u.asset == "BTC") {
            totalUSDT = totalBTC * u.order_price;
        }
    })


    // Get BTC percentage of each coins in wallet
    const btcPercentage = await Promise.all(btcValues).then(async () => {
        // Get weight percentage of each asset
        await clientwallet.map(async (w) => {
            let weight;

            weight = (w.btc_value * 100) / totalBTC;
            w.weight_percentage = Number(weight.toFixed(0));
            w.weight_percentage_not_rounded = Number(weight.toFixed(2));

            //console.log("BTC ASST: ", w.btc_value, " TOTAL: ", totalBTC, " CALCUL WEIGHT: ", w.weight_percentage)
        })

        return clientwallet;
    });

    const numFruits = await Promise.all(btcPercentage);
    return { clientWallet: numFruits, totalBTC, totalUSDT: Number(totalUSDT.toFixed(2)) };
}

// Get order list without qty, just if it's sell or buy
const getOrderListTypeRoundedToUnit = async (walletBTCweight, walletUSDTtotal, cci30details, usdtpairs) => {
    // Variables
    let sortedArray;
    let sortedArrayDifference;
    let sortedArraySame;
    let orderList = [];

    try {
        // Get first 2 crypto in cci30
        sortedArray = cci30details
            .sort((a, b) => b.weight - a.weight)
            .slice(0, 2);
        //console.log("SORTED ARRAY: ", sortedArray);

        // Rebalancing only based on top 2
        if (walletUSDTtotal < 1500) {
            console.log("LESS THAN 3K");

            // Compare sorted Array and user wallet
            sortedArrayDifference = walletBTCweight.filter((w) => !sortedArray.some(s => w.asset === s.asset ))
            //console.log("SORTED ARRAY DIFF: ", sortedArrayDifference);

            sortedArraySame = walletBTCweight.filter((w) => sortedArray.some(s => w.asset === s.asset))
            //console.log("SORTED ARRAY SAME: ", sortedArraySame);

            // Switch case based on user account
            // Only take into consideration change > 2%
            if(walletUSDTtotal > 500 && walletUSDTtotal < 1100){
                // For all coins that are not supposed to be in the user wallet, make a SELL order directly with all qty
                await sortedArrayDifference.map(async (d) => {
                    if (d.weight_percentage >= 2) {
                        await usdtpairs.map(async (u) => {
                            if (u.asset == d.asset){
                                let tempObj = {
                                    asset: d.asset,
                                    order_type: "SELL",
                                    order_percentage: d.weight_percentage,
                                    order_price: u.order_price,
                                    min_qty: u.min_qty,
                                    qty: Number(d.free)
                                }

                                orderList.push(tempObj);
                            }
                        }) 
                    }
                })

                // For all coins supposed to be in wallet and that already have a certain qty, make calculation to check difference
                await sortedArraySame.map(async (s) => {
                    await usdtpairs.map(async (u) => {
                        if (s.asset == u.asset) {
                            let weightDifference = 50 - s.weight_percentage;

                            // If weight difference is > 2 or < -2
                            if (weightDifference >= 2) {
                                let tempObj = {
                                    asset: d.asset,
                                    order_type: "BUY",
                                    order_percentage: weightDifference,
                                    order_price: u.order_price
                                }

                                orderList.push(tempObj);
                            } else if (weightDifference <= -2) {
                                let tempObj = {
                                    asset: d.asset,
                                    order_type: "SELL",
                                    order_percentage: Math.abs(weightDifference),
                                    order_price: u.order_price
                                }

                                orderList.push(tempObj);
                            }
                        }
                    })
                })                
            } 
            // Only take into consideration change > 1%
            else if(walletUSDTtotal >= 1100 && walletUSDTtotal < 3300){
                // For all coins that are not supposed to be in the user wallet, make a SELL order directly with all qty
                await sortedArrayDifference.map(async (d) => {
                    if (d.weight_percentage >= 1) {
                        await usdtpairs.map(async (u) => {
                            if (u.asset == d.asset && d.asset != 'USDT'){
                                let tempObj = {
                                    asset: d.asset,
                                    order_type: "SELL",
                                    order_percentage: d.weight_percentage,
                                    order_price: u.order_price,
                                    min_qty: u.min_qty,
                                    qty: Number(d.free)
                                }

                                orderList.push(tempObj);
                            }
                        }) 
                    }
                })

                // For all coins supposed to be in wallet and that already have a certain qty, make calculation to check difference
                await sortedArraySame.map(async (s) => {
                    await usdtpairs.map(async (u) => {
                        if (s.asset == u.asset && s.asset != 'USDT') {
                            let weightDifference = 50 - s.weight_percentage;

                            // If weight difference is > 2 or < -2
                            if (weightDifference >= 1) {
                                let tempObj = {
                                    asset: s.asset,
                                    order_type: "BUY",
                                    order_percentage: weightDifference,
                                    order_price: u.order_price
                                }

                                orderList.push(tempObj);
                            } else if (weightDifference <= -1) {
                                let tempObj = {
                                    asset: s.asset,
                                    order_type: "SELL",
                                    order_percentage: Math.abs(weightDifference),
                                    order_price: u.order_price
                                }

                                orderList.push(tempObj);
                            }
                        }
                    })
                }) 
            }
        } else {
            console.log("MORE THAN 3K");

            // Compare sorted Array and user wallet
            sortedArrayDifference = walletBTCweight.filter((w) => !cci30details.some(s => w.asset === s.asset ))
            //console.log("SORTED ARRAY DIFF 2: ", sortedArrayDifference);

            sortedArraySame = walletBTCweight.filter((w) => cci30details.some(s => w.asset === s.asset))
            //console.log("SORTED ARRAY SAME 2: ", sortedArraySame);

            // For all coins that are not supposed to be in the user wallet, make a SELL order directly with all qty
            await sortedArrayDifference.map(async (d) => {
                if (d.weight_percentage >= 1) {
                    await usdtpairs.map(async (u) => {
                        if (u.asset == d.asset & d.asset != 'USDT'){
                            let tempObj = {
                                asset: d.asset,
                                order_type: "SELL",
                                order_percentage: d.weight_percentage,
                                order_price: u.order_price,
                                min_qty: u.min_qty,
                                qty: Number(d.free)
                            }

                            orderList.push(tempObj);
                        }
                    }) 
                }
            })

            // For all coins supposed to be in wallet and that already have a certain qty, make calculation to check difference
            await sortedArraySame.map(async (s) => {
                await cci30details.map(async (c) => {
                    if (s.asset == c.asset & s.asset != 'USDT') {
                        let weightDifference = c.weight - s.weight_percentage;
                        //console.log(weightDifference);

                        await usdtpairs.map(async (u) => {
                            if (s.asset == u.asset && s.asset != 'USDT') {
        
                                // If weight difference is > 1 or < -1
                                if (weightDifference >= 1) {
                                    let tempObj = {
                                        asset: s.asset,
                                        order_type: "BUY",
                                        order_percentage: weightDifference,
                                        order_price: u.order_price
                                    }
        
                                    orderList.push(tempObj);
                                } else if (weightDifference <= -1) {
                                    let tempObj = {
                                        asset: s.asset,
                                        order_type: "SELL",
                                        order_percentage: Math.abs(weightDifference),
                                        order_price: u.order_price
                                    }
        
                                    orderList.push(tempObj);
                                }
                            }
                        })
                    }
                })
            }) 
        }

        //console.log("ORDER LIST: ", orderList);
        return orderList;
        /*const numFruits = await Promise.all(checkExistenceWallet)
        //console.log("PFFFF: ", numFruits[0])
        return numFruits[0];*/

    } catch (error) {
        console.log("ERROR IN GET ORDER LIST FUNCRION: ", error);
    }
}

// Get order list without qty, just if it's sell or buy
const getOrderListTypeOK = async (walletBTCweight, walletUSDTtotal, cci30details, usdtpairs) => {
    // Variables
    let sortedArray;
    let sortedArrayDifference;
    let sortedArraySame;
    let sortedNotInWallet;
    let orderList = [];

    try {
        // Get first 2 crypto in cci30
        sortedArray = cci30details
            .sort((a, b) => b.weight - a.weight)
            .slice(0, 2);
        //console.log("SORTED ARRAY: ", sortedArray);

        /**********************************************************************************
         * x >= 500 && 1100 < x ==> minimum change: 2%
         * x >= 1100 && 2100 < x ==> minimum change: 1%
         * x >= 2100 && 3300 < x ==> minimum change: 0.5%
         * x >= 3300 && 4400 < x ==> minimum change: 0.4%
         * x >= 4400 && 5500 < x ==> minimum change: 0.3%
         * x >= 5500 && 10600 < x ==> minimum change: 0.2%
         * x >= 10600  ==> minimum change: 0.1%
         * ******************************************************************************* */ 

        // Rebalancing only based on top 2
        if (walletUSDTtotal < 3300) {
            console.log("LESS THAN 3K");

            // Compare sorted Array and user wallet
            sortedArrayDifference = walletBTCweight.filter((w) => !sortedArray.some(s => w.asset === s.asset ))
            //console.log("SORTED ARRAY DIFF: ", sortedArrayDifference);

            sortedArraySame = walletBTCweight.filter((w) => sortedArray.some(s => w.asset === s.asset))
            //console.log("SORTED ARRAY SAME: ", sortedArraySame);

            sortedNotInWallet = sortedArray.filter((s) => !walletBTCweight.some(w => s.asset === w.asset))
            //console.log("SORTED ARRAY SAME: ", sortedNotInWallet);

            // Switch case based on user account value           
            // Only take into consideration change > 2%
            if(walletUSDTtotal > 500 && walletUSDTtotal < 1100){
                console.log("x > 500 & 1100 < x")
                // For all coins that are not supposed to be in the user wallet, make a SELL order directly with all qty
                await sortedArrayDifference.map(async (d) => {
                    if (d.weight_percentage >= 2) {
                        await usdtpairs.map(async (u) => {
                            if (u.asset == d.asset && d.asset != "USDT"){
                                let stepSizeDecimal = countDecimals(u.min_qty);
                                let qty = Number(((Math.trunc(Number(d.free) / u.min_qty)) * u.min_qty).toFixed(stepSizeDecimal));

                                if (d.asset == "BNB") {
                                    qty = Number((((Math.trunc(Number(d.free) / u.min_qty)) - 2) * u.min_qty).toFixed(stepSizeDecimal));
                                }

                                let tempObj = {
                                    asset: d.asset,
                                    order_type: "SELL",
                                    order_percentage: d.weight_percentage,
                                    order_price: u.order_price,
                                    min_qty: u.min_qty,
                                    qty
                                }

                                orderList.push(tempObj);
                            }
                        }) 
                    }
                })

                // For all coins supposed to be in wallet and that already have a certain qty, make calculation to check difference
                await sortedArraySame.map(async (s) => {
                    await usdtpairs.map(async (u) => {
                        if (s.asset == u.asset) {
                            let weightDifference = Number((50 - s.weight_percentage_not_rounded).toFixed(2));
                            //console.log(weightDifference);

                            let stepSizeDecimal = countDecimals(u.min_qty);
                            let qtyToTrunc = Number((Math.abs(weightDifference) * Number(s.free) / s.weight_percentage_not_rounded).toFixed(stepSizeDecimal));
                            let qty = Number(((Math.trunc(qtyToTrunc / u.min_qty)) * u.min_qty).toFixed(stepSizeDecimal));

                            if (s.asset == "BNB") {
                                qty = Number((((Math.trunc(qtyToTrunc / u.min_qty)) - 2) * u.min_qty).toFixed(stepSizeDecimal));
                            }

                            // If weight difference is > 2 or < -2
                            if (weightDifference >= 2) {
                                let tempObj = {
                                    asset: s.asset,
                                    order_type: "BUY",
                                    order_percentage: weightDifference,
                                    order_price: u.order_price,
                                    min_qty: u.min_qty,
                                    qty
                                }

                                orderList.push(tempObj);
                            } else if (weightDifference <= -2) {
                                let tempObj = {
                                    asset: s.asset,
                                    order_type: "SELL",
                                    order_percentage: Math.abs(weightDifference),
                                    order_price: u.order_price,
                                    min_qty: u.min_qty,
                                    qty
                                }

                                orderList.push(tempObj);
                            }
                        }
                    })
                })   
                
                
            } 
            // Only take into consideration change > 1%
            else if(walletUSDTtotal >= 1100 && walletUSDTtotal < 2100){
                console.log("x > 1100 & 2100 < x")
                // For all coins that are not supposed to be in the user wallet, make a SELL order directly with all qty
                await sortedArrayDifference.map(async (d) => {
                    if (d.weight_percentage >= 1) {
                        await usdtpairs.map(async (u) => {
                            if (u.asset == d.asset && d.asset != "USDT"){
                                let stepSizeDecimal = countDecimals(u.min_qty);
                                let qty = Number(((Math.trunc(Number(d.free) / u.min_qty)) * u.min_qty).toFixed(stepSizeDecimal));

                                if (d.asset == "BNB") {
                                    qty = Number((((Math.trunc(Number(d.free) / u.min_qty)) - 2) * u.min_qty).toFixed(stepSizeDecimal));
                                }

                                let tempObj = {
                                    asset: d.asset,
                                    order_type: "SELL",
                                    order_percentage: d.weight_percentage,
                                    order_price: u.order_price,
                                    min_qty: u.min_qty,
                                    qty
                                }

                                orderList.push(tempObj);
                            }
                        }) 
                    }
                })

                // For all coins supposed to be in wallet and that already have a certain qty, make calculation to check difference
                await sortedArraySame.map(async (s) => {
                    await usdtpairs.map(async (u) => {
                        if (s.asset == u.asset) {
                            let weightDifference = Number((50 - s.weight_percentage_not_rounded).toFixed(2));
                            //console.log(weightDifference)

                            let stepSizeDecimal = countDecimals(u.min_qty);
                            let qtyToTrunc = Number((Math.abs(weightDifference) * Number(s.free) / s.weight_percentage_not_rounded).toFixed(stepSizeDecimal));
                            let qty = Number(((Math.trunc(qtyToTrunc / u.min_qty)) * u.min_qty).toFixed(stepSizeDecimal));

                            if (s.asset == "BNB") {
                                qty = Number((((Math.trunc(qtyToTrunc / u.min_qty)) - 2) * u.min_qty).toFixed(stepSizeDecimal));
                            }

                            // If weight difference is > 2 or < -2
                            if (weightDifference >= 1) {
                                let tempObj = {
                                    asset: s.asset,
                                    order_type: "BUY",
                                    order_percentage: weightDifference,
                                    order_price: u.order_price,
                                    min_qty: u.min_qty,
                                    qty
                                }

                                orderList.push(tempObj);
                            } else if (weightDifference <= -1) {
                                let tempObj = {
                                    asset: s.asset,
                                    order_type: "SELL",
                                    order_percentage: Math.abs(weightDifference),
                                    order_price: u.order_price,
                                    min_qty: u.min_qty,
                                    qty
                                }

                                orderList.push(tempObj);
                            }
                        }
                    })
                })                
            }
            // Only take into consideration change > 0.5%
            else if(walletUSDTtotal >= 2100 && walletUSDTtotal < 3300){
                console.log("x > 2100 && 3300 < x")
                // For all coins that are not supposed to be in the user wallet, make a SELL order directly with all qty
                await sortedArrayDifference.map(async (d) => {
                    if (d.weight_percentage >= 0.5) {
                        await usdtpairs.map(async (u) => {
                            if (u.asset == d.asset && d.asset != 'USDT'){
                                let stepSizeDecimal = countDecimals(u.min_qty);
                                let qty = Number(((Math.trunc(Number(d.free) / u.min_qty)) * u.min_qty).toFixed(stepSizeDecimal));

                                if (d.asset == "BNB") {
                                    qty = Number((((Math.trunc(Number(d.free) / u.min_qty)) - 2) * u.min_qty).toFixed(stepSizeDecimal));
                                }

                                let tempObj = {
                                    asset: d.asset,
                                    order_type: "SELL",
                                    order_percentage: d.weight_percentage,
                                    order_price: u.order_price,
                                    min_qty: u.min_qty,
                                    qty
                                }

                                orderList.push(tempObj);
                            }
                        }) 
                    }
                })

                // For all coins supposed to be in wallet and that already have a certain qty, make calculation to check difference
                await sortedArraySame.map(async (s) => {
                    await usdtpairs.map(async (u) => {
                        if (s.asset == u.asset && s.asset != 'USDT') {
                            let weightDifference = Number((50 - s.weight_percentage_not_rounded).toFixed(2));
                            //console.log(weightDifference);

                            let stepSizeDecimal = countDecimals(u.min_qty);
                            let qtyToTrunc = Number((Math.abs(weightDifference) * Number(s.free) / s.weight_percentage_not_rounded).toFixed(stepSizeDecimal));
                            let qty = Number(((Math.trunc(qtyToTrunc / u.min_qty)) * u.min_qty).toFixed(stepSizeDecimal));

                            if (s.asset == "BNB") {
                                qty = Number((((Math.trunc(qtyToTrunc / u.min_qty)) - 2) * u.min_qty).toFixed(stepSizeDecimal));
                            }

                            // If weight difference is > 2 or < -2
                            if (weightDifference >= 0.5) {
                                let tempObj = {
                                    asset: s.asset,
                                    order_type: "BUY",
                                    order_percentage: weightDifference,
                                    order_price: u.order_price,
                                    min_qty: u.min_qty,
                                    qty
                                }

                                orderList.push(tempObj);
                            } else if (weightDifference <= -0.5) {
                                let tempObj = {
                                    asset: s.asset,
                                    order_type: "SELL",
                                    order_percentage: Math.abs(weightDifference),
                                    order_price: u.order_price,
                                    min_qty: u.min_qty,
                                    qty
                                }

                                orderList.push(tempObj);
                            }
                        }
                    })
                }) 
            }
        } else {
            console.log("MORE THAN 3K");

            // Compare sorted Array and user wallet
            sortedArrayDifference = walletBTCweight.filter((w) => !cci30details.some(s => w.asset === s.asset ))
            //console.log("SORTED ARRAY DIFF 2: ", sortedArrayDifference);

            sortedArraySame = walletBTCweight.filter((w) => cci30details.some(s => w.asset === s.asset))
            //console.log("SORTED ARRAY SAME 2: ", sortedArraySame);

            // Only take into consideration change > 0.4%
            if(walletUSDTtotal >= 3300 && walletUSDTtotal < 4400){
                console.log("x > 4400 & 3300 < x")
                // For all coins that are not supposed to be in the user wallet, make a SELL order directly with all qty
                await sortedArrayDifference.map(async (d) => {
                    if (d.weight_percentage >= 0.4) {
                        await usdtpairs.map(async (u) => {
                            if (u.asset == d.asset & d.asset != 'USDT'){
                                let stepSizeDecimal = countDecimals(u.min_qty);
                                let qty = Number(((Math.trunc(Number(d.free) / u.min_qty)) * u.min_qty).toFixed(stepSizeDecimal));

                                if (d.asset == "BNB") {
                                    qty = Number((((Math.trunc(Number(d.free) / u.min_qty)) - 2) * u.min_qty).toFixed(stepSizeDecimal));
                                }

                                let tempObj = {
                                    asset: d.asset,
                                    order_type: "SELL",
                                    order_percentage: d.weight_percentage,
                                    order_price: u.order_price,
                                    min_qty: u.min_qty,
                                    qty
                                }

                                orderList.push(tempObj);
                            }
                        }) 
                    }
                })

                // For all coins supposed to be in wallet and that already have a certain qty, make calculation to check difference
                await sortedArraySame.map(async (s) => {
                    await cci30details.map(async (c) => {
                        if (s.asset == c.asset & s.asset != 'USDT') {
                            let weightDifference = Number((c.weight - s.weight_percentage_not_rounded).toFixed(2));
                            //console.log(weightDifference);

                            let stepSizeDecimal = countDecimals(u.min_qty);
                            let qtyToTrunc = Number((Math.abs(weightDifference) * Number(s.free) / s.weight_percentage_not_rounded).toFixed(stepSizeDecimal));
                            let qty = Number(((Math.trunc(qtyToTrunc / u.min_qty)) * u.min_qty).toFixed(stepSizeDecimal));

                            if (s.asset == "BNB") {
                                qty = Number((((Math.trunc(qtyToTrunc / u.min_qty)) - 2) * u.min_qty).toFixed(stepSizeDecimal));
                            }

                            await usdtpairs.map(async (u) => {
                                if (s.asset == u.asset && s.asset != 'USDT') {
            
                                    // If weight difference is > 1 or < -1
                                    if (weightDifference >= 0.4) {
                                        let tempObj = {
                                            asset: s.asset,
                                            order_type: "BUY",
                                            order_percentage: weightDifference,
                                            order_price: u.order_price,
                                    min_qty: u.min_qty,
                                            qty
                                        }
            
                                        orderList.push(tempObj);
                                    } else if (weightDifference <= -0.4) {
                                        let tempObj = {
                                            asset: s.asset,
                                            order_type: "SELL",
                                            order_percentage: Math.abs(weightDifference),
                                            order_price: u.order_price,
                                    min_qty: u.min_qty,
                                            qty
                                        }
            
                                        orderList.push(tempObj);
                                    }
                                }
                            })
                        }
                    })
                }) 
            } 
            // Only take into consideration change > 0.3%
            else if(walletUSDTtotal >= 4400 && walletUSDTtotal < 5500){
                console.log("x > 4400 & 5500 < x")
                // For all coins that are not supposed to be in the user wallet, make a SELL order directly with all qty
                await sortedArrayDifference.map(async (d) => {
                    if (d.weight_percentage >= 0.3) {
                        await usdtpairs.map(async (u) => {
                            if (u.asset == d.asset & d.asset != 'USDT'){
                                let stepSizeDecimal = countDecimals(u.min_qty);
                                let qty = Number(((Math.trunc(Number(d.free) / u.min_qty)) * u.min_qty).toFixed(stepSizeDecimal));

                                if (d.asset == "BNB") {
                                    qty = Number((((Math.trunc(Number(d.free) / u.min_qty)) - 3) * u.min_qty).toFixed(stepSizeDecimal));
                                }

                                let tempObj = {
                                    asset: d.asset,
                                    order_type: "SELL",
                                    order_percentage: d.weight_percentage,
                                    order_price: u.order_price,
                                    min_qty: u.min_qty,
                                    qty
                                }

                                orderList.push(tempObj);
                            }
                        }) 
                    }
                })

                // For all coins supposed to be in wallet and that already have a certain qty, make calculation to check difference
                await sortedArraySame.map(async (s) => {
                    await cci30details.map(async (c) => {
                        if (s.asset == c.asset & s.asset != 'USDT') {
                            let weightDifference = Number((c.weight - s.weight_percentage_not_rounded).toFixed(2));
                            //console.log(weightDifference);

                            let stepSizeDecimal = countDecimals(u.min_qty);
                            let qtyToTrunc = Number((Math.abs(weightDifference) * Number(s.free) / s.weight_percentage_not_rounded).toFixed(stepSizeDecimal));
                            let qty = Number(((Math.trunc(qtyToTrunc / u.min_qty)) * u.min_qty).toFixed(stepSizeDecimal));

                            if (s.asset == "BNB") {
                                qty = Number((((Math.trunc(qtyToTrunc / u.min_qty)) - 3) * u.min_qty).toFixed(stepSizeDecimal));
                            }

                            await usdtpairs.map(async (u) => {
                                if (s.asset == u.asset && s.asset != 'USDT') {
            
                                    // If weight difference is > 1 or < -1
                                    if (weightDifference >= 0.3) {
                                        let tempObj = {
                                            asset: s.asset,
                                            order_type: "BUY",
                                            order_percentage: weightDifference,
                                            order_price: u.order_price,
                                    min_qty: u.min_qty,
                                            qty
                                        }
            
                                        orderList.push(tempObj);
                                    } else if (weightDifference <= -0.3) {
                                        let tempObj = {
                                            asset: s.asset,
                                            order_type: "SELL",
                                            order_percentage: Math.abs(weightDifference),
                                            order_price: u.order_price,
                                    min_qty: u.min_qty,
                                            qty
                                        }
            
                                        orderList.push(tempObj);
                                    }
                                }
                            })
                        }
                    })
                }) 
            } 
            // Only take into consideration change > 0.2%
            else if(walletUSDTtotal >= 5500 && walletUSDTtotal < 10600){
                console.log("x > 5500 & 10600 < x")
                // For all coins that are not supposed to be in the user wallet, make a SELL order directly with all qty
                await sortedArrayDifference.map(async (d) => {
                    if (d.weight_percentage >= 0.2) {
                        await usdtpairs.map(async (u) => {
                            if (u.asset == d.asset & d.asset != 'USDT'){
                                let stepSizeDecimal = countDecimals(u.min_qty);
                                let qty = Number(((Math.trunc(Number(d.free) / u.min_qty)) * u.min_qty).toFixed(stepSizeDecimal));

                                if (d.asset == "BNB") {
                                    qty = Number((((Math.trunc(Number(d.free) / u.min_qty)) - 4) * u.min_qty).toFixed(stepSizeDecimal));
                                }

                                let tempObj = {
                                    asset: d.asset,
                                    order_type: "SELL",
                                    order_percentage: d.weight_percentage,
                                    order_price: u.order_price,
                                    min_qty: u.min_qty,
                                    qty
                                }

                                orderList.push(tempObj);
                            }
                        }) 
                    }
                })

                // For all coins supposed to be in wallet and that already have a certain qty, make calculation to check difference
                await sortedArraySame.map(async (s) => {
                    await cci30details.map(async (c) => {
                        if (s.asset == c.asset & s.asset != 'USDT') {
                            let weightDifference = Number((c.weight - s.weight_percentage_not_rounded).toFixed(2));
                            //console.log(weightDifference);

                            let stepSizeDecimal = countDecimals(u.min_qty);
                            let qtyToTrunc = Number((Math.abs(weightDifference) * Number(s.free) / s.weight_percentage_not_rounded).toFixed(stepSizeDecimal));
                            let qty = Number(((Math.trunc(qtyToTrunc / u.min_qty)) * u.min_qty).toFixed(stepSizeDecimal));

                            if (s.asset == "BNB") {
                                qty = Number((((Math.trunc(qtyToTrunc / u.min_qty)) - 4) * u.min_qty).toFixed(stepSizeDecimal));
                            }

                            await usdtpairs.map(async (u) => {
                                if (s.asset == u.asset && s.asset != 'USDT') {
            
                                    // If weight difference is > 1 or < -1
                                    if (weightDifference >= 0.2) {
                                        let tempObj = {
                                            asset: s.asset,
                                            order_type: "BUY",
                                            order_percentage: weightDifference,
                                            order_price: u.order_price,
                                    min_qty: u.min_qty,
                                            qty
                                        }
            
                                        orderList.push(tempObj);
                                    } else if (weightDifference <= -0.2) {
                                        let tempObj = {
                                            asset: s.asset,
                                            order_type: "SELL",
                                            order_percentage: Math.abs(weightDifference),
                                            order_price: u.order_price,
                                    min_qty: u.min_qty,
                                            qty
                                        }
            
                                        orderList.push(tempObj);
                                    }
                                }
                            })
                        }
                    })
                }) 
            } 
            // Only take into consideration change > 0.1%
            else if(walletUSDTtotal >= 10600){
                console.log(">10600")
                // For all coins that are not supposed to be in the user wallet, make a SELL order directly with all qty
                await sortedArrayDifference.map(async (d) => {
                    if (d.weight_percentage >= 0.1) {
                        await usdtpairs.map(async (u) => {
                            if (u.asset == d.asset & d.asset != 'USDT'){
                                let stepSizeDecimal = countDecimals(u.min_qty);
                                let qty = Number(((Math.trunc(Number(d.free) / u.min_qty)) * u.min_qty).toFixed(stepSizeDecimal));

                                if (d.asset == "BNB") {
                                    qty = Number((((Math.trunc(Number(d.free) / u.min_qty)) - 5) * u.min_qty).toFixed(stepSizeDecimal));
                                }

                                let tempObj = {
                                    asset: d.asset,
                                    order_type: "SELL",
                                    order_percentage: d.weight_percentage,
                                    order_price: u.order_price,
                                    min_qty: u.min_qty,
                                    qty
                                }

                                orderList.push(tempObj);
                            }
                        }) 
                    }
                })

                // For all coins supposed to be in wallet and that already have a certain qty, make calculation to check difference
                await sortedArraySame.map(async (s) => {
                    await cci30details.map(async (c) => {
                        if (s.asset == c.asset & s.asset != 'USDT') {
                            let weightDifference = Number((c.weight - s.weight_percentage_not_rounded).toFixed(2));
                            //console.log(weightDifference);

                            let stepSizeDecimal = countDecimals(u.min_qty);
                            let qtyToTrunc = Number((Math.abs(weightDifference) * Number(s.free) / s.weight_percentage_not_rounded).toFixed(stepSizeDecimal));
                            let qty = Number(((Math.trunc(qtyToTrunc / u.min_qty)) * u.min_qty).toFixed(stepSizeDecimal));

                            if (s.asset == "BNB") {
                                qty = Number((((Math.trunc(qtyToTrunc / u.min_qty)) - 5) * u.min_qty).toFixed(stepSizeDecimal));
                            }

                            await usdtpairs.map(async (u) => {
                                if (s.asset == u.asset && s.asset != 'USDT') {
            
                                    // If weight difference is > 1 or < -1
                                    if (weightDifference >= 0.1) {
                                        let tempObj = {
                                            asset: s.asset,
                                            order_type: "BUY",
                                            order_percentage: weightDifference,
                                            order_price: u.order_price,
                                            min_qty: u.min_qty,
                                            qty
                                        }
            
                                        orderList.push(tempObj);
                                    } else if (weightDifference <= -0.1) {
                                        let tempObj = {
                                            asset: s.asset,
                                            order_type: "SELL",
                                            order_percentage: Math.abs(weightDifference),
                                            order_price: u.order_price,
                                            min_qty: u.min_qty,
                                            qty
                                        }
            
                                        orderList.push(tempObj);
                                    }
                                }
                            })
                        }
                    })
                }) 
            } 
        }

        //console.log("ORDER LIST: ", orderList);
        return orderList;
    } catch (error) {
        console.log("ERROR IN GET ORDER LIST FUNCRION: ", error);
    }
}

// Get order list without qty, just if it's sell or buy
const getOrderListType = async (walletBTCweight, walletUSDTtotal, cci30details, usdtpairs) => {
    // Variables
    let sortedArray;
    let sortedArrayDifference;
    let sortedArraySame;
    let sortedNotInWallet;
    let orderList = [];

    try {
        // Get first 2 crypto in cci30
        sortedArray = cci30details
            .sort((a, b) => b.weight - a.weight)
            .slice(0, 2);
        //console.log("SORTED ARRAY: ", sortedArray);

        /**********************************************************************************
         * x >= 500 && 1100 < x ==> minimum change: 2%
         * x >= 1100 && 2100 < x ==> minimum change: 1%
         * x >= 2100 && 3300 < x ==> minimum change: 0.5%
         * x >= 3300 && 4400 < x ==> minimum change: 0.4%
         * x >= 4400 && 5500 < x ==> minimum change: 0.3%
         * x >= 5500 && 10600 < x ==> minimum change: 0.2%
         * x >= 10600  ==> minimum change: 0.1%
         * ******************************************************************************* */ 

        // Rebalancing only based on top 2
        if (walletUSDTtotal < 3300) {
            console.log("LESS THAN 3K");

            // Compare sorted Array and user wallet
            sortedArrayDifference = walletBTCweight.filter((w) => !sortedArray.some(s => w.asset === s.asset ))
            //console.log("SORTED ARRAY DIFF: ", sortedArrayDifference);

            sortedArraySame = walletBTCweight.filter((w) => sortedArray.some(s => w.asset === s.asset))
            //console.log("SORTED ARRAY SAME: ", sortedArraySame);

            sortedNotInWallet = sortedArray.filter((s) => !walletBTCweight.some(w => s.asset === w.asset))
            //console.log("SORTED ARRAY SAME: ", sortedNotInWallet);

            // Switch case based on user account value           
            // Only take into consideration change > 2%
            if(walletUSDTtotal > 500 && walletUSDTtotal < 1100){
                console.log("x > 500 & 1100 < x")
                // For all coins that are not supposed to be in the user wallet, make a SELL order directly with all qty
                await sortedArrayDifference.map(async (d) => {
                    if (d.weight_percentage >= 2) {
                        await usdtpairs.map(async (u) => {
                            if (u.asset == d.asset && d.asset != "USDT"){
                                let stepSizeDecimal = countDecimals(u.min_qty);
                                let qty = Number(((Math.trunc(Number(d.free) / u.min_qty)) * u.min_qty).toFixed(stepSizeDecimal));

                                if (d.asset == "BNB") {
                                    qty = Number((((Math.trunc(Number(d.free) / u.min_qty)) - 2) * u.min_qty).toFixed(stepSizeDecimal));
                                }

                                let tempObj = {
                                    asset: d.asset,
                                    order_type: "SELL",
                                    order_percentage: d.weight_percentage,
                                    order_price: u.order_price,
                                    min_qty: u.min_qty,
                                    qty
                                }

                                orderList.push(tempObj);
                            }
                        }) 
                    }
                })

                // For all coins supposed to be in wallet and that already have a certain qty, make calculation to check difference
                await sortedArraySame.map(async (s) => {
                    await usdtpairs.map(async (u) => {
                        if (s.asset == u.asset) {
                            let weightDifference = Number((50 - s.weight_percentage_not_rounded).toFixed(2));
                            //console.log(weightDifference);

                            let stepSizeDecimal = countDecimals(u.min_qty);
                            let qtyToTrunc = Number((Math.abs(weightDifference) * Number(s.free) / s.weight_percentage_not_rounded).toFixed(stepSizeDecimal));
                            let qty = Number(((Math.trunc(qtyToTrunc / u.min_qty)) * u.min_qty).toFixed(stepSizeDecimal));

                            if (s.asset == "BNB") {
                                qty = Number((((Math.trunc(qtyToTrunc / u.min_qty)) - 2) * u.min_qty).toFixed(stepSizeDecimal));
                            }

                            // If weight difference is > 2 or < -2
                            if (weightDifference >= 2) {
                                let tempObj = {
                                    asset: s.asset,
                                    order_type: "BUY",
                                    order_percentage: weightDifference,
                                    order_price: u.order_price,
                                    min_qty: u.min_qty,
                                    qty
                                }

                                orderList.push(tempObj);
                            } else if (weightDifference <= -2) {
                                let tempObj = {
                                    asset: s.asset,
                                    order_type: "SELL",
                                    order_percentage: Math.abs(weightDifference),
                                    order_price: u.order_price,
                                    min_qty: u.min_qty,
                                    qty
                                }

                                orderList.push(tempObj);
                            }
                        }
                    })
                })    

                // For all coins that are not  in the user wallet, make a SELL order directly with all qty
                await sortedNotInWallet.map(async (d) => {
                    if (d.weight >= 2) {
                        await usdtpairs.map(async (u) => {
                            if (u.asset == d.asset & d.asset != 'USDT'){

                                let tempObj = {
                                    asset: d.asset,
                                    order_type: "BUY",
                                    order_percentage: d.weight,
                                    order_price: u.order_price,
                                    min_qty: u.min_qty,
                                    qty: 0
                                }

                                orderList.push(tempObj);
                            }
                        }) 
                    }
                })
            } 
            // Only take into consideration change > 1%
            else if(walletUSDTtotal >= 1100 && walletUSDTtotal < 2100){
                console.log("x > 1100 & 2100 < x")
                // For all coins that are not supposed to be in the user wallet, make a SELL order directly with all qty
                await sortedArrayDifference.map(async (d) => {
                    if (d.weight_percentage >= 1) {
                        await usdtpairs.map(async (u) => {
                            if (u.asset == d.asset && d.asset != "USDT"){
                                let stepSizeDecimal = countDecimals(u.min_qty);
                                let qty = Number(((Math.trunc(Number(d.free) / u.min_qty)) * u.min_qty).toFixed(stepSizeDecimal));

                                if (d.asset == "BNB") {
                                    qty = Number((((Math.trunc(Number(d.free) / u.min_qty)) - 2) * u.min_qty).toFixed(stepSizeDecimal));
                                }

                                let tempObj = {
                                    asset: d.asset,
                                    order_type: "SELL",
                                    order_percentage: d.weight_percentage,
                                    order_price: u.order_price,
                                    min_qty: u.min_qty,
                                    qty
                                }

                                orderList.push(tempObj);
                            }
                        }) 
                    }
                })

                // For all coins supposed to be in wallet and that already have a certain qty, make calculation to check difference
                await sortedArraySame.map(async (s) => {
                    await usdtpairs.map(async (u) => {
                        if (s.asset == u.asset) {
                            let weightDifference = Number((50 - s.weight_percentage_not_rounded).toFixed(2));
                            //console.log(weightDifference)

                            let stepSizeDecimal = countDecimals(u.min_qty);
                            let qtyToTrunc = Number((Math.abs(weightDifference) * Number(s.free) / s.weight_percentage_not_rounded).toFixed(stepSizeDecimal));
                            let qty = Number(((Math.trunc(qtyToTrunc / u.min_qty)) * u.min_qty).toFixed(stepSizeDecimal));

                            if (s.asset == "BNB") {
                                qty = Number((((Math.trunc(qtyToTrunc / u.min_qty)) - 2) * u.min_qty).toFixed(stepSizeDecimal));
                            }

                            // If weight difference is > 2 or < -2
                            if (weightDifference >= 1) {
                                let tempObj = {
                                    asset: s.asset,
                                    order_type: "BUY",
                                    order_percentage: weightDifference,
                                    order_price: u.order_price,
                                    min_qty: u.min_qty,
                                    qty
                                }

                                orderList.push(tempObj);
                            } else if (weightDifference <= -1) {
                                let tempObj = {
                                    asset: s.asset,
                                    order_type: "SELL",
                                    order_percentage: Math.abs(weightDifference),
                                    order_price: u.order_price,
                                    min_qty: u.min_qty,
                                    qty
                                }

                                orderList.push(tempObj);
                            }
                        }
                    })
                })    
                
                // For all coins that are not  in the user wallet, make a SELL order directly with all qty
                await sortedNotInWallet.map(async (d) => {
                    if (d.weight >= 1) {
                        await usdtpairs.map(async (u) => {
                            if (u.asset == d.asset & d.asset != 'USDT'){

                                let tempObj = {
                                    asset: d.asset,
                                    order_type: "BUY",
                                    order_percentage: d.weight,
                                    order_price: u.order_price,
                                    min_qty: u.min_qty,
                                    qty: 0
                                }

                                orderList.push(tempObj);
                            }
                        }) 
                    }
                })
            }
            // Only take into consideration change > 0.5%
            else if(walletUSDTtotal >= 2100 && walletUSDTtotal < 3300){
                console.log("x > 2100 && 3300 < x")
                // For all coins that are not supposed to be in the user wallet, make a SELL order directly with all qty
                await sortedArrayDifference.map(async (d) => {
                    if (d.weight_percentage >= 0.5) {
                        await usdtpairs.map(async (u) => {
                            if (u.asset == d.asset && d.asset != 'USDT'){
                                let stepSizeDecimal = countDecimals(u.min_qty);
                                let qty = Number(((Math.trunc(Number(d.free) / u.min_qty)) * u.min_qty).toFixed(stepSizeDecimal));

                                if (d.asset == "BNB") {
                                    qty = Number((((Math.trunc(Number(d.free) / u.min_qty)) - 2) * u.min_qty).toFixed(stepSizeDecimal));
                                }

                                let tempObj = {
                                    asset: d.asset,
                                    order_type: "SELL",
                                    order_percentage: d.weight_percentage,
                                    order_price: u.order_price,
                                    min_qty: u.min_qty,
                                    qty
                                }

                                orderList.push(tempObj);
                            }
                        }) 
                    }
                })

                // For all coins supposed to be in wallet and that already have a certain qty, make calculation to check difference
                await sortedArraySame.map(async (s) => {
                    await usdtpairs.map(async (u) => {
                        if (s.asset == u.asset && s.asset != 'USDT') {
                            let weightDifference = Number((50 - s.weight_percentage_not_rounded).toFixed(2));
                            //console.log(weightDifference);

                            let stepSizeDecimal = countDecimals(u.min_qty);
                            let qtyToTrunc = Number((Math.abs(weightDifference) * Number(s.free) / s.weight_percentage_not_rounded).toFixed(stepSizeDecimal));
                            let qty = Number(((Math.trunc(qtyToTrunc / u.min_qty)) * u.min_qty).toFixed(stepSizeDecimal));

                            if (s.asset == "BNB") {
                                qty = Number((((Math.trunc(qtyToTrunc / u.min_qty)) - 2) * u.min_qty).toFixed(stepSizeDecimal));
                            }

                            // If weight difference is > 2 or < -2
                            if (weightDifference >= 0.5) {
                                let tempObj = {
                                    asset: s.asset,
                                    order_type: "BUY",
                                    order_percentage: weightDifference,
                                    order_price: u.order_price,
                                    min_qty: u.min_qty,
                                    qty
                                }

                                orderList.push(tempObj);
                            } else if (weightDifference <= -0.5) {
                                let tempObj = {
                                    asset: s.asset,
                                    order_type: "SELL",
                                    order_percentage: Math.abs(weightDifference),
                                    order_price: u.order_price,
                                    min_qty: u.min_qty,
                                    qty
                                }

                                orderList.push(tempObj);
                            }
                        }
                    })
                }) 

                // For all coins that are not  in the user wallet, make a SELL order directly with all qty
                await sortedNotInWallet.map(async (d) => {
                    if (d.weight >= 0.5) {
                        await usdtpairs.map(async (u) => {
                            if (u.asset == d.asset & d.asset != 'USDT'){

                                let tempObj = {
                                    asset: d.asset,
                                    order_type: "BUY",
                                    order_percentage: d.weight,
                                    order_price: u.order_price,
                                    min_qty: u.min_qty,
                                    qty: 0
                                }

                                orderList.push(tempObj);
                            }
                        }) 
                    }
                })
            }
        } else {
            console.log("MORE THAN 3K");

            // Compare sorted Array and user wallet
            sortedArrayDifference = walletBTCweight.filter((w) => !cci30details.some(s => w.asset === s.asset ))
            //console.log("SORTED ARRAY DIFF 2: ", sortedArrayDifference);

            sortedArraySame = walletBTCweight.filter((w) => cci30details.some(s => w.asset === s.asset))
            //console.log("SORTED ARRAY SAME 2: ", sortedArraySame);

            sortedNotInWallet = cci30details.filter((c) => !walletBTCweight.some(w => c.asset === w.asset))
            //console.log("SORTED ARRAY NOT IN WALLET 2: ", sortedNotInWallet);

            // Only take into consideration change > 1%
            /*if(walletUSDTtotal >= 1100 && walletUSDTtotal < 2100){
                console.log("x > 1100 & 2100 < x")
                // For all coins that are not supposed to be in the user wallet, make a SELL order directly with all qty
                await sortedArrayDifference.map(async (d) => {
                    if (d.weight_percentage >= 1) {
                        await usdtpairs.map(async (u) => {
                            if (u.asset == d.asset & d.asset != 'USDT'){
                                let stepSizeDecimal = countDecimals(u.min_qty);
                                let qty = Number(((Math.trunc(Number(d.free) / u.min_qty)) * u.min_qty).toFixed(stepSizeDecimal));

                                if (d.asset == "BNB") {
                                    qty = Number((((Math.trunc(Number(d.free) / u.min_qty)) - 2) * u.min_qty).toFixed(stepSizeDecimal));
                                }

                                let tempObj = {
                                    asset: d.asset,
                                    order_type: "SELL",
                                    order_percentage: d.weight_percentage,
                                    order_price: u.order_price,
                                    min_qty: u.min_qty,
                                    qty
                                }

                                orderList.push(tempObj);
                            }
                        }) 
                    }
                })

                // For all coins supposed to be in wallet and that already have a certain qty, make calculation to check difference
                await sortedArraySame.map(async (s) => {
                    await cci30details.map(async (c) => {
                        if (s.asset == c.asset & s.asset != 'USDT') {
                            let weightDifference = Number((c.weight - s.weight_percentage_not_rounded).toFixed(2));
                            //console.log(weightDifference);

                            await usdtpairs.map(async (u) => {
                                if (s.asset == u.asset && s.asset != 'USDT') {

                                    let stepSizeDecimal = countDecimals(u.min_qty);
                                    let qtyToTrunc = Number((Math.abs(weightDifference) * Number(s.free) / s.weight_percentage_not_rounded).toFixed(stepSizeDecimal));
                                    let qty = Number(((Math.trunc(qtyToTrunc / u.min_qty)) * u.min_qty).toFixed(stepSizeDecimal));

                                    if (s.asset == "BNB") {
                                        qty = Number((((Math.trunc(qtyToTrunc / u.min_qty)) - 2) * u.min_qty).toFixed(stepSizeDecimal));
                                    }
            
                                    // If weight difference is > 1 or < -1
                                    if (weightDifference >= 1) {
                                        let tempObj = {
                                            asset: s.asset,
                                            order_type: "BUY",
                                            order_percentage: weightDifference,
                                            order_price: u.order_price,
                                            min_qty: u.min_qty,
                                            qty
                                        }
            
                                        orderList.push(tempObj);
                                    } else if (weightDifference <= -1) {
                                        let tempObj = {
                                            asset: s.asset,
                                            order_type: "SELL",
                                            order_percentage: Math.abs(weightDifference),
                                            order_price: u.order_price,
                                            min_qty: u.min_qty,
                                            qty
                                        }
            
                                        orderList.push(tempObj);
                                    }
                                }
                            })
                        }
                    })
                })   
                
                // For all coins that are not  in the user wallet, make a SELL order directly with all qty
                await sortedNotInWallet.map(async (d) => {
                    if (d.weight >= 1) {
                        await usdtpairs.map(async (u) => {
                            if (u.asset == d.asset & d.asset != 'USDT'){

                                let tempObj = {
                                    asset: d.asset,
                                    order_type: "BUY",
                                    order_percentage: d.weight,
                                    order_price: u.order_price,
                                    min_qty: u.min_qty,
                                    qty: 0
                                }

                                orderList.push(tempObj);
                            }
                        }) 
                    }
                })
            }
            // Only take into consideration change > 0.5%
            else if(walletUSDTtotal >= 2100 && walletUSDTtotal < 3300){
                console.log("x > 2100 && 3300 < x")
                // For all coins that are not supposed to be in the user wallet, make a SELL order directly with all qty
                await sortedArrayDifference.map(async (d) => {
                    if (d.weight_percentage >= 0.5) {
                        await usdtpairs.map(async (u) => {
                            if (u.asset == d.asset & d.asset != 'USDT'){
                                let stepSizeDecimal = countDecimals(u.min_qty);
                                let qty = Number(((Math.trunc(Number(d.free) / u.min_qty)) * u.min_qty).toFixed(stepSizeDecimal));

                                if (d.asset == "BNB") {
                                    qty = Number((((Math.trunc(Number(d.free) / u.min_qty)) - 2) * u.min_qty).toFixed(stepSizeDecimal));
                                }

                                let tempObj = {
                                    asset: d.asset,
                                    order_type: "SELL",
                                    order_percentage: d.weight_percentage,
                                    order_price: u.order_price,
                                    min_qty: u.min_qty,
                                    qty
                                }

                                orderList.push(tempObj);
                            }
                        }) 
                    }
                })

                // For all coins supposed to be in wallet and that already have a certain qty, make calculation to check difference
                await sortedArraySame.map(async (s) => {
                    await cci30details.map(async (c) => {
                        if (s.asset == c.asset & s.asset != 'USDT') {
                            let weightDifference = Number((c.weight - s.weight_percentage_not_rounded).toFixed(2));
                            //console.log(weightDifference);

                            let stepSizeDecimal = countDecimals(u.min_qty);
                            let qtyToTrunc = Number((Math.abs(weightDifference) * Number(s.free) / s.weight_percentage_not_rounded).toFixed(stepSizeDecimal));
                            let qty = Number(((Math.trunc(qtyToTrunc / u.min_qty)) * u.min_qty).toFixed(stepSizeDecimal));

                            if (s.asset == "BNB") {
                                qty = Number((((Math.trunc(qtyToTrunc / u.min_qty)) - 2) * u.min_qty).toFixed(stepSizeDecimal));
                            }

                            await usdtpairs.map(async (u) => {
                                if (s.asset == u.asset && s.asset != 'USDT') {
            
                                    // If weight difference is > 1 or < -1
                                    if (weightDifference >= 0.5) {
                                        let tempObj = {
                                            asset: s.asset,
                                            order_type: "BUY",
                                            order_percentage: weightDifference,
                                            order_price: u.order_price,
                                            min_qty: u.min_qty,
                                            qty
                                        }
            
                                        orderList.push(tempObj);
                                    } else if (weightDifference <= -0.5) {
                                        let tempObj = {
                                            asset: s.asset,
                                            order_type: "SELL",
                                            order_percentage: Math.abs(weightDifference),
                                            order_price: u.order_price,
                                            min_qty: u.min_qty,
                                            qty
                                        }
            
                                        orderList.push(tempObj);
                                    }
                                }
                            })
                        }
                    })
                }) 

                // For all coins that are not  in the user wallet, make a SELL order directly with all qty
                await sortedNotInWallet.map(async (d) => {
                    if (d.weight >= 0.5) {
                        await usdtpairs.map(async (u) => {
                            if (u.asset == d.asset & d.asset != 'USDT'){

                                let tempObj = {
                                    asset: d.asset,
                                    order_type: "BUY",
                                    order_percentage: d.weight,
                                    order_price: u.order_price,
                                    min_qty: u.min_qty,
                                    qty: 0
                                }

                                orderList.push(tempObj);
                            }
                        }) 
                    }
                })
            }*/
            // Only take into consideration change > 0.4%
            if(walletUSDTtotal >= 3300 && walletUSDTtotal < 4400){
                console.log("x > 4400 & 3300 < x")
                // For all coins that are not supposed to be in the user wallet, make a SELL order directly with all qty
                await sortedArrayDifference.map(async (d) => {
                    if (d.weight_percentage >= 0.4) {
                        await usdtpairs.map(async (u) => {
                            if (u.asset == d.asset & d.asset != 'USDT'){
                                let stepSizeDecimal = countDecimals(u.min_qty);
                                let qty = Number(((Math.trunc(Number(d.free) / u.min_qty)) * u.min_qty).toFixed(stepSizeDecimal));

                                if (d.asset == "BNB") {
                                    qty = Number((((Math.trunc(Number(d.free) / u.min_qty)) - 2) * u.min_qty).toFixed(stepSizeDecimal));
                                }

                                let tempObj = {
                                    asset: d.asset,
                                    order_type: "SELL",
                                    order_percentage: d.weight_percentage,
                                    order_price: u.order_price,
                                    min_qty: u.min_qty,
                                    qty
                                }

                                orderList.push(tempObj);
                            }
                        }) 
                    }
                })

                // For all coins supposed to be in wallet and that already have a certain qty, make calculation to check difference
                await sortedArraySame.map(async (s) => {
                    await cci30details.map(async (c) => {
                        if (s.asset == c.asset & s.asset != 'USDT') {
                            let weightDifference = Number((c.weight - s.weight_percentage_not_rounded).toFixed(2));
                            //console.log(weightDifference);

                            let stepSizeDecimal = countDecimals(u.min_qty);
                            let qtyToTrunc = Number((Math.abs(weightDifference) * Number(s.free) / s.weight_percentage_not_rounded).toFixed(stepSizeDecimal));
                            let qty = Number(((Math.trunc(qtyToTrunc / u.min_qty)) * u.min_qty).toFixed(stepSizeDecimal));

                            if (s.asset == "BNB") {
                                qty = Number((((Math.trunc(qtyToTrunc / u.min_qty)) - 2) * u.min_qty).toFixed(stepSizeDecimal));
                            }

                            await usdtpairs.map(async (u) => {
                                if (s.asset == u.asset && s.asset != 'USDT') {
            
                                    // If weight difference is > 1 or < -1
                                    if (weightDifference >= 0.4) {
                                        let tempObj = {
                                            asset: s.asset,
                                            order_type: "BUY",
                                            order_percentage: weightDifference,
                                            order_price: u.order_price,
                                    min_qty: u.min_qty,
                                            qty
                                        }
            
                                        orderList.push(tempObj);
                                    } else if (weightDifference <= -0.4) {
                                        let tempObj = {
                                            asset: s.asset,
                                            order_type: "SELL",
                                            order_percentage: Math.abs(weightDifference),
                                            order_price: u.order_price,
                                    min_qty: u.min_qty,
                                            qty
                                        }
            
                                        orderList.push(tempObj);
                                    }
                                }
                            })
                        }
                    })
                }) 

                // For all coins that are not  in the user wallet, make a SELL order directly with all qty
                await sortedNotInWallet.map(async (d) => {
                    if (d.weight >= 0.4) {
                        await usdtpairs.map(async (u) => {
                            if (u.asset == d.asset & d.asset != 'USDT'){

                                let tempObj = {
                                    asset: d.asset,
                                    order_type: "BUY",
                                    order_percentage: d.weight,
                                    order_price: u.order_price,
                                    min_qty: u.min_qty,
                                    qty: 0
                                }

                                orderList.push(tempObj);
                            }
                        }) 
                    }
                })
            } 
            // Only take into consideration change > 0.3%
            else if(walletUSDTtotal >= 4400 && walletUSDTtotal < 5500){
                console.log("x > 4400 & 5500 < x")
                // For all coins that are not supposed to be in the user wallet, make a SELL order directly with all qty
                await sortedArrayDifference.map(async (d) => {
                    if (d.weight_percentage >= 0.3) {
                        await usdtpairs.map(async (u) => {
                            if (u.asset == d.asset & d.asset != 'USDT'){
                                let stepSizeDecimal = countDecimals(u.min_qty);
                                let qty = Number(((Math.trunc(Number(d.free) / u.min_qty)) * u.min_qty).toFixed(stepSizeDecimal));

                                if (d.asset == "BNB") {
                                    qty = Number((((Math.trunc(Number(d.free) / u.min_qty)) - 3) * u.min_qty).toFixed(stepSizeDecimal));
                                }

                                let tempObj = {
                                    asset: d.asset,
                                    order_type: "SELL",
                                    order_percentage: d.weight_percentage,
                                    order_price: u.order_price,
                                    min_qty: u.min_qty,
                                    qty
                                }

                                orderList.push(tempObj);
                            }
                        }) 
                    }
                })

                // For all coins supposed to be in wallet and that already have a certain qty, make calculation to check difference
                await sortedArraySame.map(async (s) => {
                    await cci30details.map(async (c) => {
                        if (s.asset == c.asset & s.asset != 'USDT') {
                            let weightDifference = Number((c.weight - s.weight_percentage_not_rounded).toFixed(2));
                            //console.log(weightDifference);

                            let stepSizeDecimal = countDecimals(u.min_qty);
                            let qtyToTrunc = Number((Math.abs(weightDifference) * Number(s.free) / s.weight_percentage_not_rounded).toFixed(stepSizeDecimal));
                            let qty = Number(((Math.trunc(qtyToTrunc / u.min_qty)) * u.min_qty).toFixed(stepSizeDecimal));

                            if (s.asset == "BNB") {
                                qty = Number((((Math.trunc(qtyToTrunc / u.min_qty)) - 3) * u.min_qty).toFixed(stepSizeDecimal));
                            }

                            await usdtpairs.map(async (u) => {
                                if (s.asset == u.asset && s.asset != 'USDT') {
            
                                    // If weight difference is > 1 or < -1
                                    if (weightDifference >= 0.3) {
                                        let tempObj = {
                                            asset: s.asset,
                                            order_type: "BUY",
                                            order_percentage: weightDifference,
                                            order_price: u.order_price,
                                            min_qty: u.min_qty,
                                            qty
                                        }
            
                                        orderList.push(tempObj);
                                    } else if (weightDifference <= -0.3) {
                                        let tempObj = {
                                            asset: s.asset,
                                            order_type: "SELL",
                                            order_percentage: Math.abs(weightDifference),
                                            order_price: u.order_price,
                                            min_qty: u.min_qty,
                                            qty
                                        }
            
                                        orderList.push(tempObj);
                                    }
                                }
                            })
                        }
                    })
                }) 

                // For all coins that are not  in the user wallet, make a SELL order directly with all qty
                await sortedNotInWallet.map(async (d) => {
                    if (d.weight >= 0.3) {
                        await usdtpairs.map(async (u) => {
                            if (u.asset == d.asset & d.asset != 'USDT'){

                                let tempObj = {
                                    asset: d.asset,
                                    order_type: "BUY",
                                    order_percentage: d.weight,
                                    order_price: u.order_price,
                                    min_qty: u.min_qty,
                                    qty: 0
                                }

                                orderList.push(tempObj);
                            }
                        }) 
                    }
                })
            } 
            // Only take into consideration change > 0.2%
            else if(walletUSDTtotal >= 5500 && walletUSDTtotal < 10600){
                console.log("x > 5500 & 10600 < x")
                // For all coins that are not supposed to be in the user wallet, make a SELL order directly with all qty
                await sortedArrayDifference.map(async (d) => {
                    if (d.weight_percentage >= 0.2) {
                        await usdtpairs.map(async (u) => {
                            if (u.asset == d.asset & d.asset != 'USDT'){
                                let stepSizeDecimal = countDecimals(u.min_qty);
                                let qty = Number(((Math.trunc(Number(d.free) / u.min_qty)) * u.min_qty).toFixed(stepSizeDecimal));

                                if (d.asset == "BNB") {
                                    qty = Number((((Math.trunc(Number(d.free) / u.min_qty)) - 4) * u.min_qty).toFixed(stepSizeDecimal));
                                }

                                let tempObj = {
                                    asset: d.asset,
                                    order_type: "SELL",
                                    order_percentage: d.weight_percentage,
                                    order_price: u.order_price,
                                    min_qty: u.min_qty,
                                    qty
                                }

                                orderList.push(tempObj);
                            }
                        }) 
                    }
                })

                // For all coins supposed to be in wallet and that already have a certain qty, make calculation to check difference
                await sortedArraySame.map(async (s) => {
                    await cci30details.map(async (c) => {
                        if (s.asset == c.asset & s.asset != 'USDT') {
                            let weightDifference = Number((c.weight - s.weight_percentage_not_rounded).toFixed(2));
                            //console.log(weightDifference);

                            let stepSizeDecimal = countDecimals(u.min_qty);
                            let qtyToTrunc = Number((Math.abs(weightDifference) * Number(s.free) / s.weight_percentage_not_rounded).toFixed(stepSizeDecimal));
                            let qty = Number(((Math.trunc(qtyToTrunc / u.min_qty)) * u.min_qty).toFixed(stepSizeDecimal));

                            if (s.asset == "BNB") {
                                qty = Number((((Math.trunc(qtyToTrunc / u.min_qty)) - 4) * u.min_qty).toFixed(stepSizeDecimal));
                            }

                            await usdtpairs.map(async (u) => {
                                if (s.asset == u.asset && s.asset != 'USDT') {
            
                                    // If weight difference is > 1 or < -1
                                    if (weightDifference >= 0.2) {
                                        let tempObj = {
                                            asset: s.asset,
                                            order_type: "BUY",
                                            order_percentage: weightDifference,
                                            order_price: u.order_price,
                                            min_qty: u.min_qty,
                                            qty
                                        }
            
                                        orderList.push(tempObj);
                                    } else if (weightDifference <= -0.2) {
                                        let tempObj = {
                                            asset: s.asset,
                                            order_type: "SELL",
                                            order_percentage: Math.abs(weightDifference),
                                            order_price: u.order_price,
                                            min_qty: u.min_qty,
                                            qty
                                        }
            
                                        orderList.push(tempObj);
                                    }
                                }
                            })
                        }
                    })
                }) 

                // For all coins that are not  in the user wallet, make a SELL order directly with all qty
                await sortedNotInWallet.map(async (d) => {
                    if (d.weight >= 0.2) {
                        await usdtpairs.map(async (u) => {
                            if (u.asset == d.asset & d.asset != 'USDT'){

                                let tempObj = {
                                    asset: d.asset,
                                    order_type: "BUY",
                                    order_percentage: d.weight,
                                    order_price: u.order_price,
                                    min_qty: u.min_qty,
                                    qty: 0
                                }

                                orderList.push(tempObj);
                            }
                        }) 
                    }
                })
            } 
            // Only take into consideration change > 0.1%
            else if(walletUSDTtotal >= 10600){
                console.log(">10600")
                // For all coins that are not supposed to be in the user wallet, make a SELL order directly with all qty
                await sortedArrayDifference.map(async (d) => {
                    if (d.weight_percentage >= 0.1) {
                        await usdtpairs.map(async (u) => {
                            if (u.asset == d.asset & d.asset != 'USDT'){
                                let stepSizeDecimal = countDecimals(u.min_qty);
                                let qty = Number(((Math.trunc(Number(d.free) / u.min_qty)) * u.min_qty).toFixed(stepSizeDecimal));

                                if (d.asset == "BNB") {
                                    qty = Number((((Math.trunc(Number(d.free) / u.min_qty)) - 5) * u.min_qty).toFixed(stepSizeDecimal));
                                }

                                let tempObj = {
                                    asset: d.asset,
                                    order_type: "SELL",
                                    order_percentage: d.weight_percentage,
                                    order_price: u.order_price,
                                    min_qty: u.min_qty,
                                    qty
                                }

                                orderList.push(tempObj);
                            }
                        }) 
                    }
                })

                // For all coins supposed to be in wallet and that already have a certain qty, make calculation to check difference
                await sortedArraySame.map(async (s) => {
                    await cci30details.map(async (c) => {
                        if (s.asset == c.asset & s.asset != 'USDT') {
                            let weightDifference = Number((c.weight - s.weight_percentage_not_rounded).toFixed(2));
                            //console.log(weightDifference);

                            let stepSizeDecimal = countDecimals(u.min_qty);
                            let qtyToTrunc = Number((Math.abs(weightDifference) * Number(s.free) / s.weight_percentage_not_rounded).toFixed(stepSizeDecimal));
                            let qty = Number(((Math.trunc(qtyToTrunc / u.min_qty)) * u.min_qty).toFixed(stepSizeDecimal));

                            if (s.asset == "BNB") {
                                qty = Number((((Math.trunc(qtyToTrunc / u.min_qty)) - 5) * u.min_qty).toFixed(stepSizeDecimal));
                            }

                            await usdtpairs.map(async (u) => {
                                if (s.asset == u.asset && s.asset != 'USDT') {
            
                                    // If weight difference is > 1 or < -1
                                    if (weightDifference >= 0.1) {
                                        let tempObj = {
                                            asset: s.asset,
                                            order_type: "BUY",
                                            order_percentage: weightDifference,
                                            order_price: u.order_price,
                                            min_qty: u.min_qty,
                                            qty
                                        }
            
                                        orderList.push(tempObj);
                                    } else if (weightDifference <= -0.1) {
                                        let tempObj = {
                                            asset: s.asset,
                                            order_type: "SELL",
                                            order_percentage: Math.abs(weightDifference),
                                            order_price: u.order_price,
                                            min_qty: u.min_qty,
                                            qty
                                        }
            
                                        orderList.push(tempObj);
                                    }
                                }
                            })
                        }
                    })
                }) 

                // For all coins that are not  in the user wallet, make a SELL order directly with all qty
                await sortedNotInWallet.map(async (d) => {
                    if (d.weight >= 0.1) {
                        await usdtpairs.map(async (u) => {
                            if (u.asset == d.asset & d.asset != 'USDT'){

                                let tempObj = {
                                    asset: d.asset,
                                    order_type: "BUY",
                                    order_percentage: d.weight,
                                    order_price: u.order_price,
                                    min_qty: u.min_qty,
                                    qty: 0
                                }

                                orderList.push(tempObj);
                            }
                        }) 
                    }
                })
            } 
        }

        //console.log("ORDER LIST: ", orderList);
        return orderList;
    } catch (error) {
        console.log("ERROR IN GET ORDER LIST FUNCRION: ", error);
    }
}

// Place SELL MARKET orders
const placeSellMarketOrders = async (sellMarketOrders, user) => {
    try {
        // Variables 
        let successSellMarket = [];
        let errorSellMarket = [];

        // Connect to Binance account
        const client = new Spot(user.apiKeyTrading, user.secureKeyTrading);
        //const client = new Spot("rRXajWMHKX9KcayH0guPm92eASkWEMMnQ08s0v9gura5ryPN0SPGbMsl3ofABjlu", "ctu171S5oEKRrwQyZTQbQJyw0VZYBf1FjUQGUVrFVIUK5SpWdzyfWWeJ3icw1GcK", { baseURL: 'https://testnet.binance.vision'});

        await sellMarketOrders.map(async (sm, i) => {
            //if (sm.asset == "UNI"){
                setTimeout(() => {
                    /*client.newOrder(`BTCUSDT`, 'SELL', 'MARKET', {
                        quantity: 0.01252,
                    })*/
                    client.newOrder(`${sm.asset}USDT`, 'SELL', 'MARKET', {
                        quantity: sm.qty,
                    }).then(async (response) => {
                        successSellMarket.push(response.data);
                        client.logger.log("AFTER SELL MRAKET: ", response.data)
    
                        let email = user.email;
                        let rebalancingOrderId = response.data.orderId;
    
                        const newOrder = await axios.get(
                            `https://123987c444.com/rQ7v9UAskb42CSDvC/api/rebalancing/create/${email}/${response.data.transactTime}/${rebalancingOrderId}`,  
                            {
                                httpsAgent: new https.Agent({
                                    rejectUnauthorized:false
                                }),
                                data: {
                                    rebalancingOrderDetail: response.data
                                }
                            }
                        )
    
                        //console.log("NEW ORDER SENT: ", newOrder.data);
                    })
                        .catch(error => {
                            errorSellMarket.push(sm);
                            console.log("ERROR IN SELL MARKET: ", error);
                        })
                }, i * 0.3 * 60 * 1000);
            //} 
        })
    } catch (error) {
        console.log("ERROR IN SELL MARKET ORDER: ", error)
    }

}

// Place all BUY LIMIT orders
const placeBuyLimitOrders = async (buyLimitOrders, user, remainingUsdt) => {
    console.log("IN PLACE BUY LIMIT")
    try {
        // Variables
        let totalPercentage = 0;
        let newOrders = [];

        // Connect to Binance account
        const client = new Spot(user.apiKeyTrading, user.secureKeyTrading);
        //const client = new Spot("rRXajWMHKX9KcayH0guPm92eASkWEMMnQ08s0v9gura5ryPN0SPGbMsl3ofABjlu", "ctu171S5oEKRrwQyZTQbQJyw0VZYBf1FjUQGUVrFVIUK5SpWdzyfWWeJ3icw1GcK", { baseURL: 'https://testnet.binance.vision'});


        // Sum total percentage of all buy limit to place
        await buyLimitOrders.map(async (b) => {
            totalPercentage = totalPercentage + b.order_percentage;
        })

        // Recalculate percentage based on remaining usdt
        await buyLimitOrders.map(async (b) => {
            let newPercentage = Number((b.order_percentage * 100 / totalPercentage).toFixed(2));
            let allocatedUsdt = Number((newPercentage * remainingUsdt / 100).toFixed(2));
            let stepSize = countDecimals(b.min_qty);
            //let limitPrice = Number((allocatedUsdt / b.qty).toFixed(2));
            let qty = Number((Math.trunc((allocatedUsdt / b.order_price) / b.min_qty) * b.min_qty).toFixed(stepSize));

            // Check if min_notional is respected
            //if (b.qty * limitPrice > 10) {
            if (qty * b.order_price > 10) {
                /*let tempObj = {
                    asset: b.asset,
                    order_type: "BUY",
                    order_percentage: newPercentage,
                    order_price: limitPrice,
                    min_qty: b.min_qty,
                    qty: b.qty
                }*/

                let tempObj = {
                    asset: b.asset,
                    order_type: "BUY",
                    order_percentage: newPercentage,
                    order_price: b.order_price,
                    min_qty: b.min_qty,
                    qty
                }

                //console.log("TEMP: ", tempObj);
                newOrders.push(tempObj);

                /*await client.newOrder(`BTCUSDT`, 'BUY', 'LIMIT', {
                    price: `37043.97`,
                    quantity: 0.01276,
                    timeInForce: 'GTC',
                })*/
                await client.newOrder(`${b.asset}USDT`, 'BUY', 'LIMIT', {
                    price: `${b.order_price}`,
                    quantity: qty,
                    timeInForce: 'GTC',
                })
                .then(async (response) => {
                    client.logger.log("AFTER BUY LIMIT ORDER: ", response.data);

                    let email = user.email;
                    let rebalancingOrderId = response.data.orderId;
    
                    const newOrder = await axios.get(
                        `https://123987c444.com/rQ7v9UAskb42CSDvC/api/rebalancing/create/${email}/${response.data.transactTime}/${rebalancingOrderId}`,  
                        {
                            httpsAgent: new https.Agent({
                                rejectUnauthorized:false
                            }),
                            data: {
                                rebalancingOrderDetail: response.data
                            }
                        }
                    )

                    //console.log("NEW ORDER SENT: ", newOrder.data);
                })        
            } else {
                let tempObj = {
                    asset: b.asset,
                    order_type: "BUY",
                    order_percentage: newPercentage,
                    order_price: b.order_price,
                    min_qty: b.min_qty,
                    qty
                }

                console.log("MIN_NOTINAL NOT RESPECTED: ", user.id, tempObj)
            }
        })
    } catch (error) {
        console.log("ERROR IN BUY LIMIT ORDER: ", error)
    }
}

// Get all available USDT after sell
const availableUsdtAfterSellFunction = async (user) => {
    try {
        // Variables
        let today = moment(new Date()).utcOffset('+0000').format("DD/MM/YYYY");
        let totalUsdtAfterSell = 0;

        const availUsdt = await axios.get(
            `https://123987c444.com/rQ7v9UAskb42CSDvC/api/rebalancing/allOrdersUserDate/${user.email}`,
            {
                httpsAgent: new https.Agent({
                    rejectUnauthorized:false
                }),
                data: {
                    date: today
                }
            }
        )
        //console.log("AVIL: ", availUsdt.data.allOrders);

        await availUsdt.data.allOrders.map(async (a) => {
            if (a.type == "SELL") {
                totalUsdtAfterSell = totalUsdtAfterSell + Number(a.rebalancingOrderValue);
            }
        })

        return Number(totalUsdtAfterSell.toFixed(2));
        
    } catch (error) {
        console.log("ERROR in available usdt after sell function: ", error);
    }
}

// Get total value of wallet in USDT
const calculateTotalAssetOfUsdt = async (user, totalAssetOfBtc) => {
    try {
        // Connect to client
        let client = new Spot(user.apiKeyReadOnly, user.secureKeyReadOnly);

        let totalUsdt;

        totalUsdt = await client.avgPrice(`BTCUSDT`).then(async (response) => {
            //console.log(response.data);
            let price = Number(response.data.price);

            return Number((totalAssetOfBtc * price).toFixed(2));
        })

        //console.log("HERE: ", Number((totalUsdt).toFixed(2)));
        return Number((totalUsdt).toFixed(2));

    } catch (error) {
        console.log("ERROR in calculate total asset of USDT: ", error);
    }
}

// Get open orders
const getOpenOrdersList = async (user) => {
    try {
        // Connect to Binance account
        const client = new Spot(user.apiKeyTrading, user.secureKeyTrading);

        // Get list of all open orders
        await client.openOrders()
            .then(async (response) => {
                //console.log("OPEN ORDER FOR USER: ", user.id, " DATA: ", response.data);

                // Cancel open orders
                if (response.data.length > 0) {
                    console.log("USER: ", user.id, " NUMBER OF ORDERS TO BE RE-EXECUTED: ", response.data.length);
                    await response.data.map(async (o) => {
                        // Get order to cancel
                        let order = await axios.get(
                            `https://123987c444.com/rQ7v9UAskb42CSDvC/api/rebalancing/getOneOrder/${o.orderId}`,  
                            {
                                httpsAgent: new https.Agent({
                                    rejectUnauthorized:false
                                })
                            }
                        )

                        //console.log("OD: ", order.data.order);

                        client.cancelOrder(`${o.symbol}`, {
                            orderId: o.orderId,
                            recvWindow: 60000
                        }).then(async (resp) => {
                            //client.logger.log("CANCELED: ", resp.data);

                            let orderDetail = resp.data;
                            let type = resp.data.side + "/CANCELED"

                            // Update rebalancing record
                            let updatedOrder = await axios.get(
                                `https://123987c444.com/rQ7v9UAskb42CSDvC/api/rebalancing/updateOrders/${o.orderId}`,  
                                {
                                    httpsAgent: new https.Agent({
                                        rejectUnauthorized:false
                                    }),
                                    data: {
                                        rebalancingOrderDetail: JSON.stringify(orderDetail),
                                        type
                                    }
                                }
                            )

                            //console.log("UPDATE ORDER: ", updatedOrder.data);

                            // Make a new buy limit with new average price

                        })
                    })
                } else {
                    console.log("USER: ", user.id, " ALL ORDERS HAVE BEEN FILLED");

                    // Update BUY orders to BUY/FILLED
                    let rebalancingOrders = await getRebalancingOrderThisMonth(user);

                    if (rebalancingOrders.length > 0) {
                        // Loop through all type=BUY and update them as them have been filled
                        await rebalancingOrders.map(async (r) => {
                            if (r.type == "BUY") {
                                // Get order detail and update DB
                                let orderDetail = JSON.parse(r.rebalancingOrderDetail);

                                await client.getOrder(`${orderDetail.symbol}`, {
                                    orderId: r.rebalancingOrderId
                                }).then(async (resp) => {
                                    //console.log(resp.data)

                                    let updatedOrder = await axios.get(
                                        `https://123987c444.com/rQ7v9UAskb42CSDvC/api/rebalancing/updateOrders/${r.rebalancingOrderId}`,  
                                        {
                                            httpsAgent: new https.Agent({
                                                rejectUnauthorized:false
                                            }),
                                            data: {
                                                rebalancingOrderDetail: JSON.stringify(resp.data),
                                                type: "BUY/FILLED",
                                                rebalancingOrderValue: Number((Number(resp.data.cummulativeQuoteQty)).toFixed(2))
                                            }
                                        }
                                    )
        
                                    //console.log("UPDATE ORDER: ", updatedOrder.data);
                                })
                            }
                        })
                    }
                }
            })

    } catch (error) {
        console.log("ERROR IN GET OPEN ORDER LIST: ", error)
    }
}

// Get all rebalancing order for this month
const getRebalancingOrderThisMonth = async (user) => {
    try {
        // Variables
        let month = moment(new Date()).utcOffset('+0000').format("MM");
        let year = moment(new Date()).utcOffset('+0000').format("YYYY");
        let totalUsdtAfterSell = 0;

        const ordersThisMonth = await axios.get(
            `https://123987c444.com/rQ7v9UAskb42CSDvC/api/rebalancing/allOrdersUserDate/${user.email}`,
            {
                httpsAgent: new https.Agent({
                    rejectUnauthorized:false
                }),
                data: {
                    month,
                    year
                }
            }
        )
        
        //console.log("THIS MONTH: ", ordersThisMonth.data.allOrders);
        return ordersThisMonth.data.allOrders;

        
    } catch (error) {
        console.log("ERROR in available usdt after sell function: ", error);
    }
}

exports.rebalancing2 = async () => {
    try {
        // Variables
        let allUsers;
        let allConstituents;

        const callPromises = await Promise.all([
            // Get all users from DB
            getAllUsers(),
            // Get CCi30 constituents from Google Sheet
            getConstituentsInfo()
        ]);        

        allUsers = callPromises[0]; //console.log("USERS: ", allUsers)
        allConstituents = callPromises[1]; //console.log("CONSTITUENTS: ", allConstituents);

        // Loop through all users
        await allUsers.map(async (u, i) => {
            setTimeout(async () => {
                // Get user wallet constituents
                //let userWalletConstituents = await getUsersAccountSnapshots(u.email);
                //let userWalletConstituents = await getUsersAccountSnapshotsLastHour(u.email);
                let userWalletConstituents = await getUsersAccountSnapshotsCurrent(u.email);
                console.log("USER WALLET: ", userWalletConstituents.accountWithBtc);

                // Get USDT pairs info (MIN_NOTIONAL, MIN_QTY, STEP_SIZE, etc)
                //let allUsdtPairsRaw = await allUsdtPairsFunction(u, JSON.parse(userWalletConstituents[0].balances), allConstituents);
                let allUsdtPairsRaw = await allUsdtPairsFunction(u, userWalletConstituents.accountWithBtc, allConstituents);
                //console.log("USDT INFO: ", allUsdtPairsRaw[0]);

                // Get all USDT order price
                let allUsdtPairsWithOrderPriceRaw = await usdtOrderPriceFunction(u, allUsdtPairsRaw[0]);
                //console.log("USDT ORDER PRICE: ", allUsdtPairsWithOrderPriceRaw[0]);

                // Calculate wallet constituents percentage
                let walletPairsPercentage = await calculatePercentageWallet(userWalletConstituents.accountWithBtc, allUsdtPairsWithOrderPriceRaw[0]);
                console.log("WALLET PAIRS PERCENTAGE: ", walletPairsPercentage.clientWallet);

                // Get all order type (SELL or BUY) with its quantity
                /*let orderList = await getOrderListType(walletPairsPercentage.clientWallet, Number(userWalletConstituents[0].totalAssetOfUsdt), allConstituents, allUsdtPairsRaw[0]);
                //console.log("ORDER LIST: ", orderList);

                // Do no rebalancing if there is no order
                if(orderList.length > 0) {
                    let sellOrders = [];
                    let buyOrders = []; 

                    // Separate SELL from BUY
                    orderList.map(async (o) => {
                        if (o.order_type == "SELL") {
                            sellOrders.push(o);
                        } else if (o.order_type == "BUY") {
                            buyOrders.push(o);
                        }
                    })

                    //console.log("SELL ORDERS: ", sellOrders);
                    //console.log("BUY ORDERS: ", buyOrders);

                    // Start by sell all sell orders to be able to buy coins afterward
                    if (sellOrders.length > 0) {
                        //let exeSellMarketStatus = await placeSellMarketOrders(sellOrders, u);

                        let availableUsdt = 0;
                        // Find all remaining USDT after SELL (free USDT (if any) + sum of USDT obtained after selling coins)
                        await JSON.parse(userWalletConstituents[0].balances).map(async (a) => {
                            if(a.asset == "USDT") {
                                availableUsdt = availableUsdt + Number(Number(a.free).toFixed(2));
                                //console.log("AVAILABLE USDT:" , availableUsdt);
                            }
                        })

                        // Fetch all usdt that are now available after sell
                        let availableUsdtAfterSell = await availableUsdtAfterSellFunction(u);
                        availableUsdt = availableUsdt + availableUsdtAfterSell;
                        //console.log("AFTER SELL AVAILABLE USDT: ", availableUsdtAfterSell);
                        //console.log("TOTAL: ", availableUsdt);

                        // Recalculate BUY orders based on the USDT available
                        let buyOrdersList = await getBuyOrderList(buyOrders, availableUsdt);

                    } 
                    // Either account has only USDT or some SELL orders have already been triggered
                    else {

                    }
                }*/



            }, i * 1.5 * 60 * 1000);
        })

    } catch (error) {
        console.log("ERROR in rebalancing: ", error)
    }
}

// Start rebalancing process
exports.rebalancing = async () => {
    try {
        // Variables
        let allUsers;
        let allConstituents;

        const callPromises = await Promise.all([
            // Get all users from DB
            getAllUsers(),
            // Get CCi30 constituents from Google Sheet
            getConstituentsInfo()
        ]);        

        allUsers = callPromises[0]; //console.log("USERS: ", allUsers)
        allConstituents = callPromises[1]; //console.log("CONSTITUENTS: ", allConstituents);

        // Loop through all users
        await allUsers.map(async (u, i) => {
            setTimeout(async () => {
                // Variables
                let totalAssetOfBtc = 0;

                // Get user wallet constituents
                let userWalletConstituents = await getUsersAccountSnapshotsCurrent(u.email);
                //console.log("USER WALLET: ", userWalletConstituents.accountWithBtc);

                // Sum up all BTC value of these coins
                await userWalletConstituents.accountWithBtc.map(async (a) => {
                    totalAssetOfBtc = totalAssetOfBtc + a.btcValue
                })

                // Get USDT value of BTC value
                let totalAssetOfUsdt = await calculateTotalAssetOfUsdt(u, Number((totalAssetOfBtc).toFixed(2)));
                //console.log("USDT: ", Number((totalAssetOfUsdt).toFixed(2)));
                
                // Get USDT pairs info (MIN_NOTIONAL, MIN_QTY, STEP_SIZE, etc)
                let allUsdtPairsRaw = await allUsdtPairsFunction(u, userWalletConstituents.accountWithBtc, allConstituents);
                //console.log("USDT INFO: ", allUsdtPairsRaw[0]);

                // Get all USDT order price
                let allUsdtPairsWithOrderPriceRaw = await usdtOrderPriceFunction(u, allUsdtPairsRaw[0]);
                //console.log("USDT ORDER PRICE: ", allUsdtPairsWithOrderPriceRaw[0]);

                // Calculate wallet constituents percentage
                let walletPairsPercentage = await calculatePercentageWallet(userWalletConstituents.accountWithBtc, allUsdtPairsWithOrderPriceRaw[0]);
                //console.log("WALLET PAIRS PERCENTAGE: ", walletPairsPercentage.clientWallet);

                // Get all order type (SELL or BUY) with its quantity
                let orderList = await getOrderListType(walletPairsPercentage.clientWallet, Number(totalAssetOfUsdt), allConstituents, allUsdtPairsRaw[0]);
                //console.log("ORDER LIST: ", orderList);

                // Do no rebalancing if there is no order
                if(orderList.length > 0) {
                    let sellOrders = [];
                    let buyOrders = []; 

                    // Separate SELL from BUY
                    orderList.map(async (o) => {
                        if (o.order_type == "SELL") {
                            sellOrders.push(o);
                        } else if (o.order_type == "BUY") {
                            buyOrders.push(o);
                        }
                    })

                    //console.log("SELL ORDERS: ", sellOrders);
                    //console.log("BUY ORDERS: ", buyOrders);

                    // Start by sell all sell orders to be able to buy coins afterward
                    if (sellOrders.length > 0) {
                        await placeSellMarketOrders(sellOrders, u);
                    } else {
                        console.log("UID: ", u.id, " HAS NO SELL ORDERS TO PLACE")
                    }

                    // Either account has only USDT or some SELL orders have already been triggered
                    setTimeout(async () => {
                        if (buyOrders.length > 0) {
                            let currentAvailableUsdt;
    
                            // Get current account snapshot after sells
                            let currentAvailableUsdtRaw = await getUsersAccountSnapshotsCurrent(u.email);
                            
                            // Get available USDT
                            await currentAvailableUsdtRaw.accountWithBtc.map(async (a) => {
                                if (a.asset == "USDT") {
                                    currentAvailableUsdt = Number(Number(a.free).toFixed(2))
                                }
                            })
                            //console.log("AV: ", currentAvailableUsdt);
    
                            await placeBuyLimitOrders(buyOrders, u, currentAvailableUsdt);
                        
                        } else {
                            console.log("UID: ", u.id, " HAS NO BUY ORDERS TO PLACE")
                        }  
                    }, (i + 0.5) * 60 * 1000);  
                } else {
                    console.log("USER: ", u.id, " HAS NO ORDERS TO PLACE")
                }

            }, i * 2 * 60 * 1000);
        })

    } catch (error) {
        console.log("ERROR in rebalancing: ", error)
    }
}

// Check for unfilled buy limit orders
exports.getOpenOrders = async () => {
    try {
        // Variables
        let allUsers;
        let canceledOrderArray = [];

        const callPromises = await Promise.all([
            // Get all users from DB
            getAllUsers()
        ]);        

        allUsers = callPromises[0]; //console.log("USERS: ", allUsers)

        // Loop through all users
        await allUsers.map(async (u, i) => {
            setTimeout(async () => {
                let canceledOrders = await getOpenOrdersList(u);
                
            }, i * 0.5 * 60 * 1000);
        })

    } catch (error) {
        console.log("ERROR in check orpen orders: ", error);
    }
}

// Convert dust to BNB
exports.convertDust = async () => {
    try {
        // Variables
        let allUsers;

        // Get all users
        const callPromises = await Promise.all([
            // Get all users from DB
            getAllUsers()
        ]); 

        allUsers = callPromises[0];

        // Find all coins than are less than 10$
        await allUsers.map(async (u, i) => {
            setTimeout(async () => {
                let currentBalance = await getUsersAccountSnapshotsCurrent(u.email);
                let client =  new Spot(u.apiKeyTrading, u.secureKeyTrading);
                let btcusdt;
                let lessThanTen = [];

                // Get current BTCUSDT price
                await client.avgPrice(`BTCUSDT`)
                    .then(async response => {
                        //console.log("AVG PRICE: ", Number((Number(response.data.price)).toFixed(2)));
                        btcusdt = Number((Number(response.data.price)).toFixed(2));
                    })

                // Compute all asset and push asset less than 10$ into array
                await currentBalance.accountWithBtc.map(async (a) => {
                    let usdtValue = Number((Number(a.btcValue) * Number(btcusdt)).toFixed(2));

                    if (usdtValue < 10) {
                        lessThanTen.push(a.asset);
                    }
                })

                // Convert to BNB
                await client.dustTransfer(lessThanTen)
                    .then(response => client.logger.log("DUST CONVERSION: ", response.data))
                    .catch(error => client.logger.error(error))
            }, i * 0.2 * 60 * 1000);
        })
    } catch (error) {
        console.log("ERROR in convert dust: ", error);
    }
}

// Get all rebalancing orders for this month and send email if all filled
exports.addRebalancingAccountsnapshot = async () => {
    try {
        // Variables
        let month = moment(new Date()).utcOffset('+0000').format("MM");
        let year = moment(new Date()).utcOffset('+0000').format("YYYY");
        let ordersNotFilled = 0;
        let allUsers;

        // Fetch all orders for this month
        const allOrders = await axios.get(
            `https://123987c444.com/rQ7v9UAskb42CSDvC/api/rebalancing/allMonth/${month}/${year}`,  
            {
                httpsAgent: new https.Agent({
                    rejectUnauthorized:false
                })
            }
        )

        //console.log("ALL ORDER THIS MONTH: ", allOrders.data.allOrders);

        // Loop through all orders type
        await allOrders.data.allOrders.map(async (a) => {
            if (a.type == "BUY") {
                ordersNotFilled = ordersNotFilled + 1;
            }
        })

        // If ordersNotFilled = 0, we can send rebalancing email to client, else we need to redo rebalancing again
        if (ordersNotFilled == 0) {
            console.log("SEND EMAIL")
            // Get all users
            const callPromises = await Promise.all([
                // Get all users from DB
                getAllUsers()
            ]); 

            allUsers = callPromises[0];

            // Loop though all users
            await allUsers.map(async (u) => {
                // Add current account after rebalancing into DB
                let newRebalancingAS = await getUsersAccountSnapshotsCurrent(u.email);
                //console.log("TEST: ", newRebalancingAS.accountWithBtc)
                let totalAssetOfBtc = 0;
                
                // Sum up all BTC value of these coins
                await newRebalancingAS.accountWithBtc.map(async (a) => {
                    totalAssetOfBtc = totalAssetOfBtc + a.btcValue
                })

                // Get USDT value of BTC value
                let totalAssetOfUsdt = await calculateTotalAssetOfUsdt(u, Number((totalAssetOfBtc).toFixed(2)));
                //console.log("USDT IN HERE: ", Number((totalAssetOfUsdt).toFixed(2)));

                const newRAS = await axios.get(
                    `https://123987c444.com/rQ7v9UAskb42CSDvC/api/rebalancingAS/add`,  
                    {
                        httpsAgent: new https.Agent({
                            rejectUnauthorized:false
                        }),
                        data: {
                            uid: u.id,
                            updateTime: moment(new Date()).utcOffset('+0000').format("x"),
                            date: moment(new Date()).utcOffset('+0000').format("DD/MM/YYYY"),
                            month: moment(new Date()).utcOffset('+0000').format("MM"),
                            year: moment(new Date()).utcOffset('+0000').format("YYYY"),
                            timing: "AF - START PERIOD",
                            totalAssetOfBtc: Number((totalAssetOfBtc).toFixed(8)),
                            totalAssetOfUsdt: Number((totalAssetOfUsdt).toFixed(2)),
                            balances: newRebalancingAS.accountWithBtc
                        }
                    }
                )

                console.log("NEW RAS: ", newRAS.data);

            })
            // Find user start capital at begging of period = capital de début
            // Find new deposit
            // Find new withdraw
            // Find current account snapshot before rebalancing and transfer = capital de fin
            // Compute profit this month
            // Find to be paid for user (in case less than 10)
            // 1. Find if there is rebalancing orders this month for specific user
            // 2. Find if there is profit or not
        } else {
            console.log("START REBALANCING AGAIN")
        }

        

    } catch (error) {
        console.log("ERROR in get all orders for this month: ", error);
    }
}

// Send email