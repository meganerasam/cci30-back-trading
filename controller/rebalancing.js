const { 
    getAllUsers, 
    getUsersAccountSnapshots, 
    getUsersAccountSnapshotsLastHour, 
    getUsersAccountSnapshotsCurrent,
    getUsersAccountSnapshotsCurrentAndUpdate 
} = require("./usersInfo");
const { getConstituentsInfo } = require("./constituentsInfo");
const { getAllUSDTPairs } = require("./binance");
const { Spot } = require('@binance/connector');
const axios = require("axios");
const moment = require("moment");
const https = require("https");
const req = require("express/lib/request");
const { response } = require("express");
const {find, update } = require('../utils/crud')

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
    //console.log("ALL USDT PAIRS: ", clientwallet);

    try {
        // Variables
        let usdtPairsAssets = [];
        let stepSize;
        let minQty;
        let minNotional;
        let tickSize;

        // Combine both array so we will have all CCi30 components as well as those that are in the wallet but not in CCi30
        let combinedArray = [...clientwallet, ...cci30Info];
        //console.log("COMBINED: ", combinedArray);

        // Connect to Binance account
        const client = new Spot(user.apiKeyReadOnly, user.secureKeyReadOnly);

        const cci30Mapping = combinedArray.map(async (c) => {
            //console.log("ASSET: ", c.asset, " EXISTS ? ", isInArray(usdtPairsAssets, c.asset), " ARRAY: ", usdtPairsAssets);
            if (
                c.asset != "USDT" && 
                c.asset != "WBTC" &&
                c.asset != "SNT" &&
                c.asset != "CND" &&
                c.asset != "VRT" &&
                c.asset != "RCN" &&
                c.asset != "BRD" &&
                c.asset != "BCD" &&
                c.asset != "SNGLS" &&
                c.asset != "GAS" &&
                c.asset != "SGB" &&
                c.asset != "LOOM" &&
                c.asset != "SOLO" &&
                c.asset != "BETH" &&
                c.asset != "BOBA" &&
                c.asset != "EASY" &&
                c.asset != "LDLIT" &&
                c.asset != "NFT" &&
                c.asset != "TNT" &&
                c.asset != "LDUSDT" &&
                c.asset != "LDBNB" &&
                c.asset != "LDCAKE" &&
                c.asset != "LDFTM" &&
                c.asset != "LDMANA" &&
                c.asset != "LDCHZ" &&
                c.asset != "LDSHIB2" &&
                c.asset != "LDENJ" &&
                c.asset != "LDBUSD" &&
                c.asset != "LDGRT" &&
                c.asset != "LDAVA" &&
                c.asset != "LDBTC" &&
                c.asset != "GLM"
            ) {
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

            else if (
                c.asset == "WBTC" ||
                c.asset == "SNT" ||
                c.asset == "CND" ||
                c.asset == "BRD" ||
                c.asset == "BCD" ||
                c.asset == "GAS" ||
                c.asset == "SGB" ||
                c.asset == "GLM"
            ) {
                // Get exchange info to get all pairs
                await client.exchangeInfo({ symbol: `${c.asset}BTC` })
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

            return usdtPairsAssets;
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
            if (
                a.asset != "USDT" &&
                a.asset != "WBTC" &&
                a.asset != "SNT" &&
                a.asset != "CND" &&
                a.asset != "BRD" &&
                a.asset != "BCD" &&
                a.asset != "GAS" &&
                a.asset != "GLM"
            ) {
                //await client.historicalTrades(`${a.asset}usdt`, { limit: 120 })
                await client.avgPrice(`${a.asset}USDT`)
                    .then(async response => {
                        //console.log("AVG PRICE: ", Number((Number(response.data.price)).toFixed(2)));
                        let decimalCount = countDecimals(a.tick_size);

                        a.order_price = Number((Number(response.data.price)).toFixed(decimalCount));
                    })
            } else if (
                a.asset == "WBTC" ||
                a.asset == "SNT" ||
                a.asset == "CND" ||
                a.asset == "BRD" ||
                a.asset == "BCD" ||
                a.asset == "GAS"
            ) {
                await client.avgPrice(`${a.asset}BTC`)
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

// Get order price for each pair
const usdtOrderAggPriceFunction = async (user, asset) => {
    const client = new Spot(user.apiKeyReadOnly, user.secureKeyReadOnly);

    // Get order price for the asset
    try {
        const priceMapping = await asset.map(async (a) => {
            if (
                a.asset != "USDT" &&
                a.asset != "WBTC" &&
                a.asset != "SNT" &&
                a.asset != "CND" &&
                a.asset != "BRD" &&
                a.asset != "BCD" &&
                a.asset != "GAS" &&
                a.asset != "EASY" &&
                a.asset != "SOLO" &&
                a.asset != "BETH" &&
                a.asset != "BOBA" &&
                a.asset != "TNT" &&
                a.asset != "GLM" &&
                a.asset != "SGB" &&
                a.asset != "LDLIT" &&
                a.asset != "VRT" &&
                a.asset != "NFT" &&
                a.asset != "LDCHZ" &&
                a.asset != "LDUSDT" &&
                a.asset != "LDBNB" &&
                a.asset != "LDCAKE" &&
                a.asset != "LDFTM" &&
                a.asset != "LDMANA" &&
                a.asset != "LDSHIB2" &&
                a.asset != "LDENJ" &&
                a.asset != "LDBUSD" &&
                a.asset != "LDGRT" &&
                a.asset != "LDAVA" &&
                a.asset != "LDBTC"
            ) {
                await client.aggTrades(`${a.asset}USDT`, {
                    limit: 1000
                })
                    .then(async response => {
                        let price = 0;

                        await response.data.map(async (r, i) => {
                            price = price + Number(r.p);
                        })
    
                        let avgPrice = price / (response.data).length;
                        let decimalCount = countDecimals(a.tick_size);

                        a.order_price = Number(avgPrice.toFixed(decimalCount));
                    })
            } else if (
                a.asset == "WBTC" ||
                a.asset == "SNT" ||
                a.asset == "CND" ||
                a.asset == "BRD" ||
                a.asset == "BCD" ||
                a.asset == "GAS" ||
                a.asset == "SGB" ||
                a.asset ==" GLM"
            ) {
                await client.aggTrades(`${a.asset}BTC`, {
                    limit: 1000
                })
                    .then(async response => {
                        let price = 0;

                        await response.data.map(async (r, i) => {
                            price = price + Number(r.p);
                        })
    
                        let avgPrice = price / (response.data).length;
                        let decimalCount = countDecimals(a.tick_size);

                        a.order_price = Number(avgPrice.toFixed(decimalCount));
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
        if (w.asset == "BTC" || w.asset == "WBTC") {
            await usdtpairs.map(async (u) => {
                if (u.asset == w.asset) {
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
        } else if (w.asset == "SNT") {
            await usdtpairs.map(async (u) => {
                if (u.asset == w.asset) {
                    w.order_price = u.order_price;
                }
            })

            // BTC value is the same as the quantuty of BTC in wallet
            w.btc_value = Number(w.btcValue);
            totalBTC = totalBTC + Number(w.btcValue);
        } else if (w.asset != "USDT" && w.asset != "BTC" && w.asset != "WBTC") {
            await usdtpairs.map(async (u) => {
                
                if (w.asset == u.asset) {
                    //console.log("W: ", w.asset, " U: ", u.asset);

                    w.order_price = u.order_price;

                    //console.log("W2: ", w, " U2: ", u);

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

// Calculate crypto percentage in user wallet
const calculatePercentageWalletTransfer = async (clientwallet, usdtpairs) => {
    // Variables
    let totalBTC = 0;
    let totalUSDT = 0;

    // Get all assets BTC value
    const btcValues = await clientwallet.map(async (w) => {
        if (w.asset == "BTC" || w.asset == "WBTC") {
            await usdtpairs.map(async (u) => {
                if (u.asset == w.asset) {
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
        } else if (w.asset == "SNT") {
            await usdtpairs.map(async (u) => {
                if (u.asset == w.asset) {
                    w.order_price = u.order_price;
                }
            })

            // BTC value is the same as the quantuty of BTC in wallet
            w.btc_value = Number(w.btcValue);
            totalBTC = totalBTC + Number(w.btcValue);
        } else if (w.asset != "USDT" && w.asset != "BTC" && w.asset != "WBTC") {
            await usdtpairs.map(async (u) => {
                
                if (w.asset == u.asset) {
                    //console.log("W: ", w.asset, " U: ", u.asset);

                    w.order_price = u.order_price;

                    //console.log("W2: ", w, " U2: ", u);

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
            if(walletUSDTtotal > 300 && walletUSDTtotal < 1100){
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
            else if(walletUSDTtotal >= 1100 && walletUSDTtotal < 3200){
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
         * x >= 2100 && 3200 < x ==> minimum change: 0.5%
         * x >= 3200 && 4400 < x ==> minimum change: 0.4%
         * x >= 4400 && 5500 < x ==> minimum change: 0.3%
         * x >= 5500 && 10600 < x ==> minimum change: 0.2%
         * x >= 10600  ==> minimum change: 0.1%
         * ******************************************************************************* */ 

        // Rebalancing only based on top 2
        if (walletUSDTtotal < 3200) {
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
            else if(walletUSDTtotal >= 2100 && walletUSDTtotal < 3200){
                console.log("x > 2100 && 3200 < x")
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
            if(walletUSDTtotal >= 3200 && walletUSDTtotal < 4400){
                console.log("x > 4400 & 3200 < x")
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
    //console.log("COMPARE: ", walletBTCweight);

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
         * x >= 2100 && 3200 < x ==> minimum change: 0.5%
         * x >= 3200 && 4400 < x ==> minimum change: 0.4%
         * x >= 4400 && 5500 < x ==> minimum change: 0.3%
         * x >= 5500 && 10600 < x ==> minimum change: 0.2%
         * x >= 10600  ==> minimum change: 0.1%
         * ******************************************************************************* */ 

        // Rebalancing only based on top 2
        if (walletUSDTtotal < 3200) {
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
            if(walletUSDTtotal > 400 && walletUSDTtotal < 1100){
                console.log("x > 550 & 1100 < x")
                // For all coins that are not supposed to be in the user wallet, make a SELL order directly with all qty
                await sortedArrayDifference.map(async (d) => {
                    if (d.weight_percentage_not_rounded >= 2) {
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
                                    order_percentage: d.weight_percentage_not_rounded,
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
                    if (d.weight_percentage_not_rounded >= 1) {
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
            else if(walletUSDTtotal >= 2100 && walletUSDTtotal < 3200){
                console.log("x > 2100 && 3200 < x")
                // For all coins that are not supposed to be in the user wallet, make a SELL order directly with all qty
                await sortedArrayDifference.map(async (d) => {
                    if (d.weight_percentage_not_rounded >= 0.5) {
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
            else if(walletUSDTtotal >= 2100 && walletUSDTtotal < 3200){
                console.log("x > 2100 && 3200 < x")
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
            if(walletUSDTtotal >= 3200 && walletUSDTtotal < 4400){
                console.log("x > 4400 & 3200 < x")
                // For all coins that are not supposed to be in the user wallet, make a SELL order directly with all qty
                await sortedArrayDifference.map(async (d) => {
                    if (d.weight_percentage_not_rounded >= 0.4) {
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
                                    order_percentage: d.weight_percentage_not_rounded,
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
                    if (d.weight_percentage_not_rounded >= 0.3) {
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
                                    order_percentage: d.weight_percentage_not_rounded,
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
                                        qty = Number((((Math.trunc(qtyToTrunc / u.min_qty)) - 3) * u.min_qty).toFixed(stepSizeDecimal));
                                    }
            
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
                    if (d.weight_percentage_not_rounded >= 0.2) {
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
                                    order_percentage: d.weight_percentage_not_rounded,
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
                                        qty = Number((((Math.trunc(qtyToTrunc / u.min_qty)) - 4) * u.min_qty).toFixed(stepSizeDecimal));
                                    }
            
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
                    if (d.weight_percentage_not_rounded >= 0.05) {
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
                                    order_percentage: d.weight_percentage_not_rounded,
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
                                        qty = Number((((Math.trunc(qtyToTrunc / u.min_qty)) - 5) * u.min_qty).toFixed(stepSizeDecimal));
                                    }
            
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
                //setTimeout(() => {
                    /*client.newOrder(`BTCUSDT`, 'SELL', 'MARKET', {
                        quantity: 0.01252,
                    })*/

                    // If coin does not pair with USDT
                    if (
                        sm.asset == "WBTC" || 
                        sm.asset == "SNT" ||
                        sm.asset == "GAS"
                    ) {
                        client.newOrder(`${sm.asset}BTC`, 'SELL', 'MARKET', {
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
                    }
                    
                    // Else use USDT 
                    else {
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
                    }
                //}, i * 0.05 * 60 * 1000);
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

// Place all BUY LIMIT orders
const placeBuyMarketOrders = async (buyLimitOrders, user, remainingUsdt) => {
    console.log("IN PLACE BUY MARKET")
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

        if (buyLimitOrders.length == 1) {
            // Recalculate percentage based on remaining usdt
        await buyLimitOrders.map(async (b) => {
            //let newPercentage = Number((b.order_percentage * 100 / totalPercentage).toFixed(2));
            //let allocatedUsdt = Number((newPercentage * remainingUsdt / 100).toFixed(2));
            let stepSize = countDecimals(b.min_qty);
            let qty = Number((Math.trunc((remainingUsdt / b.order_price) / b.min_qty) * b.min_qty).toFixed(stepSize));
            console.log("REMAINING USDT ONLY ONE ORDER: ", remainingUsdt);
            console.log("VALUE USDT ONLY ONE ORDER: ", (qty * b.order_price));
            console.log("QTY ONLY ONE ORDER: ", qty);

            // Check if min_notional is respected
            //if (b.qty * limitPrice > 10) {
            if (qty * b.order_price > 10) {
                let tempObj = {
                    asset: b.asset,
                    order_type: "BUY",
                    order_percentage: 0,
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
                await client.newOrder(`${b.asset}USDT`, 'BUY', 'MARKET', {
                    quantity: qty,
                }).then(async (response) => {
                    client.logger.log("AFTER BUY MARKET ORDER: ", response.data);

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
                    order_percentage: 0,
                    order_price: b.order_price,
                    min_qty: b.min_qty,
                    qty
                }

                console.log("MIN_NOTINAL NOT RESPECTED: ", user.id, tempObj)
            }
        })
        }

        else {
        // Recalculate percentage based on remaining usdt
        await buyLimitOrders.map(async (b) => {
            let newPercentage = Number((b.order_percentage * 100 / totalPercentage).toFixed(2));
            let allocatedUsdt = Number((newPercentage * remainingUsdt / 100).toFixed(2));
            let stepSize = countDecimals(b.min_qty);
            let qty = Number((Math.trunc((allocatedUsdt / b.order_price) / b.min_qty) * b.min_qty).toFixed(stepSize));

            // Check if min_notional is respected
            //if (b.qty * limitPrice > 10) {
            if (qty * b.order_price > 10) {
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
                await client.newOrder(`${b.asset}USDT`, 'BUY', 'MARKET', {
                    quantity: qty,
                })
                .then(async (response) => {
                    client.logger.log("AFTER BUY MARKET ORDER: ", response.data);

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
    }
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

        console.log("HERE: ", Number((totalUsdt).toFixed(2)));
        return Number((totalUsdt).toFixed(2));

    } catch (error) {
        console.log("ERROR in calculate total asset of USDT: ", error);
    }
}

const calculateTotalAssetOfUsdtTest = async (u) => {
    //console.log("TRANS: ", transactions);
    const client = new Spot(u.apiKeyReadOnly, u.secureKeyReadOnly);

    // Inner varaibles
    let balances = [];
    let totalWalletUsdt = 0;

    // Get user current wallet
    await client.account()
        .then(async (response) => {
            await response.data.balances.map(async (b) => {
                if (
                    b.asset != "SOLO" &&
                    b.asset != "NFT" &&
                    b.asset != "BETH" &&
                    b.asset != "TNT" &&
                    b.asset != "VRT" &&
                    b.asset != "BOBA" &&
                    b.asset != "BRD" &&
                    b.asset != "DON" &&
                    b.asset != "ETF" &&
                    b.asset != "EASY" &&
                    b.asset != "BCD" &&
                    b.asset != "SNGLS" &&
                    b.asset != "LDLIT" &&
                    b.asset != "LDUSDT" &&
                    b.asset != "LDBNB" &&
                    b.asset != "LDCAKE" &&
                    b.asset != "LDFTM" &&
                    b.asset != "LDMANA" &&
                    b.asset != "LDSHIB2" &&
                    b.asset != "LDCHZ" &&
                    b.asset != "LDENJ" &&
                    b.asset != "LDBUSD" &&
                    b.asset != "LDGRT" &&
                    b.asset != "LDAVA" &&
                    b.asset != "LDBTC"
                ) {
                    if (Number(b.free) > 0) {
                        balances.push(b);
                    }
                }
            })
        })

        newCapitalUsdt = balances.map(async (b, i) => {
            if (
                b.asset != "USDT" &&
                b.asset != "SOLO" &&
                b.asset != "NFT" &&
                b.asset != "RCN" &&
                b.asset != "BETH" &&
                b.asset != "TNT" &&
                b.asset != "BOBA" &&
                b.asset != "CND" &&
                b.asset != "GLM" &&
                b.asset != "LOOM" &&
                b.asset != "SGB" &&
                b.asset != "EASY" &&
                b.asset != "NSBT" &&
                b.asset != "VRT" &&
                b.asset != "SNT" &&
                b.asset != "TNT" &&
                b.asset != "SGB" &&
                b.asset != "PURSE" &&
                b.asset != "LDLIT" &&
                b.asset != "LDUSDT" &&
                b.asset != "LDCHZ" &&
                b.asset != "LDBNB" &&
                b.asset != "LDCAKE" &&
                b.asset != "LDFTM" &&
                b.asset != "LDMANA" &&
                b.asset != "LDSHIB2" &&
                b.asset != "LDENJ" &&
                b.asset != "LDBUSD" &&
                b.asset != "LDGRT" &&
                b.asset != "LDAVA" &&
                b.asset != "LDBTC"
            ) { 
                await client.aggTrades(`${b.asset}USDT`, { 
                    limit: 1000
                })
                    .then(async (response) => {
                        //console.log("ASSET: ", b.asset, " PRICE 1: ", response.data[0].p);
                        let price = 0;
                        
                        await response.data.map(async (r, i) => {
                            price = price + Number(r.p);
                        })

                        let avgPrice = price / (response.data).length;
                        let assetValue = Number(b.free) * Number(avgPrice);

                        if (b.asset){
                            totalWalletUsdt = totalWalletUsdt + assetValue;
                        }

                        //console.log("ASSET: ", b.asset, " PRICE: ", price / (response.data).length, " VALUE: ", assetValue, " TOTAL: ", totalWalletUsdt);*/
                    })
                    .catch(error => client.logger.error(error))
            } else if (b.asset == "USDT") {
                totalWalletUsdt = totalWalletUsdt + Number(b.free);
            }
        })

        const numFruits = await Promise.all(newCapitalUsdt).then(async () => {
            console.log("TEST IT: ", totalWalletUsdt);
            return Number(totalWalletUsdt.toFixed(2));
        })
        return numFruits;
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

// Get aggregate price
const getAggPriceUsdt = async (user, balances) => {
    // Variables
    let total = 0;

    // Connect client to Binance
    const client = new Spot(user.apiKeyReadOnly, user.secureKeyReadOnly);

    // Get average aggregate price
    let totalUsdt = await balances.map(async (a, i) => {
        if (
            a.asset != "USDT" &&
            a.asset != "SOLO" &&
            a.asset != "BETH" &&
            a.asset != "SGB" &&
            a.asset != "NFT" &&
            a.asset != "TNT" &&
            a.asset != "GLM" &&
            a.asset != "BOBA" &&
            a.asset != "EASY" &
            a.asset != "VRT" &&
            a.asset != "LDUSDT" &&
            a.asset != "LDCHZ" &&
            a.asset != "LDBNB" &&
            a.asset != "LDCAKE" &&
            a.asset != "LDLIT" &&
            a.asset != "LDFTM" &&
            a.asset != "LDMANA" &&
            a.asset != "LDSHIB2" &&
            a.asset != "LDENJ" &&
            a.asset != "LDBUSD" &&
            a.asset != "LDGRT" &&
            a.asset != "LDAVA" &&
            a.asset != "LDBTC"
        ) {
            await client.aggTrades(`${a.asset}USDT`, { 
                limit: 1000,
            })
                .then(async (response) => {
                    //console.log("ASSET: ", b.asset, " PRICE 1: ", response.data[0].p);
                    let price = 0;
                    
                    await response.data.map(async (r, i) => {
                        price = price + Number(r.p);
                    })

                    let avgPrice = price / (response.data).length;
                    let assetValue = Number(a.free) * Number(avgPrice);

                    if (a.asset){
                        total = total + assetValue;
                    }

                    //console.log("ASSET: ", b.asset, " PRICE: ", price / (response.data).length, " VALUE: ", assetValue, " TOTAL: ", totalWalletUsdt);
                })
                .catch(error => client.logger.error(error))
        } else if (a.asset == "USDT") {
            total = total + Number(a.free);
        }
    })

    let returnTotal = await Promise.all(totalUsdt).then(async () => {
        //console.log("T:" , total);
        return total;
    })
    return Number(returnTotal.toFixed(2));
}

// Get aggregate price BTCUSDT
const getAggPriceBtc = async (user, usdtValue) => {
    // Variables
    let total = 0;

    // Connect client to Binance
    const client = new Spot(user.apiKeyReadOnly, user.secureKeyReadOnly);

    // Get average aggregate price
    await client.aggTrades(`BTCUSDT`, { 
        limit: 1000,
    })
        .then(async (response) => {
            //console.log("ASSET: ", b.asset, " PRICE 1: ", response.data[0].p);
            let price = 0;
            
            await response.data.map(async (r, i) => {
                price = price + Number(r.p);
            })

            let avgPrice = price / (response.data).length;
            total = usdtValue / Number(avgPrice);

            //console.log("ASSET: ", b.asset, " PRICE: ", price / (response.data).length, " VALUE: ", assetValue, " TOTAL: ", totalWalletUsdt);
        })
        .catch(error => client.logger.error(error))

    return Number(total.toFixed(8));
}

// Get BCT value of each coins
const getBtcValue = async (user, balances) => {
    try {
        // Variables
        let newCoins = [];

        // Connect client to Binance
        let client = new Spot(user.apiKeyReadOnly, user.secureKeyReadOnly);

        let resBtc = await balances.map(async (c, i) => {
            if (
                c.asset != "BTC" && 
                c.asset != "USDT" && 
                c.asset != "SHIB" && 
                c.asset != "EUR" && 
                c.asset != "EASY" &&
                c.asset != "SOLO" &&
                c.asset != "NFT" && 
                c.asset != "VRT" &&
                c.asset != "TNT" &&
                c.asset != "BETH" &&
                c.asset != "BOBA" &&
                c.asset != "LDUSDT" &&
                c.asset != "LDLIT" &&
                c.asset != "LDBNB" &&
                c.asset != "BUSD" &&
                c.asset != "RCN" &&
                c.asset != "LDCAKE" &&
                c.asset != "LDCHZ" &&
                c.asset != "LDFTM" &&
                c.asset != "LDMANA" &&
                c.asset != "LDSHIB2" &&
                c.asset != "LDBTC" &&
                c.asset != "DON" &&
                c.asset != "ERN" &&
                c.asset != "BTTC" &&
                c.asset != "ETF" &&
                c.asset != "VTHO" &&
                c.asset != "TNT" &&
                c.asset != "LDENJ" &&
                c.asset != "PURSE" &&
                c.asset != "LDBUSD" &&
                c.asset != "LDGRT" &&
                c.asset != "PUNDIX" &&
                c.asset != "LDAVA" &&
                c.asset != "DEXE"
            ) {
                await client.aggTrades(`${c.asset}BTC`, {
                    limit: 1000
                })
                    .then(async (response) => {
                        //console.log("ASSET: ", b.asset, " PRICE 1: ", response.data[0].p);
                        let price = 0;
                        
                        await response.data.map(async (r, i) => {
                            price = price + Number(r.p);
                        })
            
                        let avgPrice = price / (response.data).length;
                        let btcValue = Number((avgPrice * Number(c.free)).toFixed(8));

                        let tempObj = {
                            asset: c.asset,
                            free: c.free,
                            btcValue
                        }
    
                        newCoins.push(tempObj);
                    })
                    .catch(error => client.logger.error(error))
            } else if (c.asset == "BTC") {
                let btcValue = Number(Number(c.free).toFixed(8));

                let tempObj = {
                    asset: c.asset,
                    free: c.free,
                    btcValue
                }

                newCoins.push(tempObj);
            } else if (c.asset == "USDT") {
                await client.aggTrades(`BTCUSDT`, { 
                    limit: 1000,
                })
                    .then(async (response) => {
                        //console.log("ASSET: ", b.asset, " PRICE 1: ", response.data[0].p);
                        let price = 0;
                        
                        await response.data.map(async (r, i) => {
                            price = price + Number(r.p);
                        })
            
                        let avgPrice = price / (response.data).length;
                        let btcValue = Number((Number(c.free) / avgPrice).toFixed(8));

                        let tempObj = {
                            asset: c.asset,
                            free: c.free,
                            btcValue
                        }
    
                        newCoins.push(tempObj);            
                    })
                    .catch(error => client.logger.error(error))
            } else if (
                c.asset == "SHIB" || 
                c.asset == "BUSD" || 
                c.asset == "ERN" ||
                c.asset == "BTTC" ||
                c.asset == "VTHO" ||
                c.asset == "PUNDIX" ||
                c.asset == "DEXE"
            ) {
                await client.aggTrades(`${c.asset}USDT`, { 
                    limit: 1000,
                })
                    .then(async (response) => {
                        //console.log("ASSET: ", b.asset, " PRICE 1: ", response.data[0].p);
                        let price = 0;
                        
                        await response.data.map(async (r, i) => {
                            price = price + Number(r.p);
                        })
            
                        let avgPrice = price / (response.data).length;
                        let totalShib = Number((Number(c.free) * Number(avgPrice)).toFixed(8));

                        await client.aggTrades(`BTCUSDT`, { 
                            limit: 1000,
                        })
                            .then(async (response2) => {
                                //console.log("ASSET: ", b.asset, " PRICE 1: ", response.data[0].p);
                                let priceBtc = 0;
                                
                                await response2.data.map(async (r2) => {
                                    priceBtc = priceBtc + Number(r2.p);
                                })
                    
                                let avgPriceBtc = priceBtc / (response2.data).length;
                                let btcValue = Number((totalShib / Number(avgPriceBtc)).toFixed(8));

                                let tempObj = {
                                    asset: c.asset,
                                    free: c.free,
                                    btcValue
                                }
            
                                newCoins.push(tempObj);

                            })
                            .catch(error => client.logger.error(error))
            
                    })
                    .catch(error => client.logger.error(error))
            } else if (c.asset == "EUR") {
                await client.aggTrades(`BTCEUR`, { 
                    limit: 1000,
                })
                    .then(async (response) => {
                        //console.log("ASSET: ", b.asset, " PRICE 1: ", response.data[0].p);
                        let price = 0;
                        
                        await response.data.map(async (r, i) => {
                            price = price + Number(r.p);
                        })
            
                        let avgPrice = price / (response.data).length;
                        let btcValue = Number((Number(c.free) /avgPrice).toFixed(8));

                        let tempObj = {
                            asset: c.asset,
                            free: c.free,
                            btcValue
                        }
    
                        newCoins.push(tempObj);
                    })
                    .catch(error => client.logger.error(error))
            }

            return newCoins
        })

        let returnValue = await Promise.all(resBtc).then(async () => {
            return newCoins
        });

        return returnValue;
        
    } catch (error) {
        console.log("ERROR IN GET BTC VALUE: ", error);
    }
}

// Get isTranfer value after adding PNL into DB
const computePnlValueToTransfer = async (email) => {
    try {
        // Calculate PNL
        const addPnlToDb = await axios.get(
            `https://123987c444.com/rQ7v9UAskb42CSDvC/api/pnl/calculatePnl/${email}`,  
            {
                httpsAgent: new https.Agent({
                    rejectUnauthorized:false
                })
            }
        )

        const computedPnl = await axios.get(
            `https://123987c444.com/rQ7v9UAskb42CSDvC/api/pnl/getPnl/${email}`,  
            {
                httpsAgent: new https.Agent({
                    rejectUnauthorized:false
                })
            }
        )

        console.log("COMPUTED PNL: ", computedPnl.data);
        return computedPnl;
        
    } catch (error) {
        console.log("ERROR IN getPnl: ", error);
    }
}

// Check if enough USDT to perform transfer to CB
const isEnoughUsdt = async (u, pnlValueToTransfer, sellOrders, userWallet, allConstituents) => {
    try { 
        let client = new Spot(u.apiKeyTransfer, u.secureKeyTransfer);
        let clientT= new Spot(u.apiKeyTrading, u.secureKeyTrading);

        // Check if PNL >= 12
        if (pnlValueToTransfer.data >= 12) {
            let usdtExist = false;

            // Make transfer
            let currentAssetBalance = await JSON.parse(userWallet.array_balances);

            // Check of there USDT >= PNL to transfer
            await currentAssetBalance.map(async (c, j) => {
                // Check if there are USDT avaialible in user account
                if (c.asset == "USDT") {
                    // Check if available USDT >= PNL to transfer, usdtExist = true
                    if (c.free >= pnlValueToTransfer.data) {
                        usdtExist = true;
                    }
                }
            })

            // If usdtExist, make transfer
            if (usdtExist) {
                console.log("MAKE TRANSFER");

                await client.withdraw(
                    'USDT', // coin
                    'bnb136ns6lfw4zs5hg4n85vdthaad7hq5m4gtkgf23', // withdraw address
                    pnlValueToTransfer.data, // amount
                    {
                        network: 'BNB',
                        addressTag: 354505026,
                    }
                ).then(async (response) => {
                    client.logger.log("WITHDRAWAL 2: ", response.data);

                    let newTransfer = await axios.get(
                        `https://123987c444.com/rQ7v9UAskb42CSDvC/api/transfer/add/${u.email}`,  
                        {
                            httpsAgent: new https.Agent({
                                rejectUnauthorized:false
                            }),
                            data: {
                                withdrawOrderId: response.data.id,
                                withdrawDetail: "0"
                            }
                        }
                    )

                    // find and  Update status to 1
                    const condition_param = "uid , status";
                    const condition_value= `${uid}, 0`;
                    const pnal_of_user = await find("profit_and_loss" , condition_param , condition_value);

                    await Promise.all(pnal_of_user).then(async()=>{
                        if(pnal_of_user){

                            pnal_of_user.map(async(p,i)=>{

                                const variable_array_update ="1";
                                const table_update ="profit_and_loss";
                                const columns_update = "status";
                                const condition_param_update = "id";
                                const condition_value_update = `${p.id}`
                                await update(variable_array_update, table_update, columns_update, condition_param_update, condition_value_update);
                                console.log("WITHDRAWAL 2 Update profit and loss id" , p.id)
                            })

                          
                        }
                    })

                    


                })
                    .catch(error => client.logger.error(error))
            } else {
                if (sellOrders.length > 0) {
                    await placeSellMarketOrders(sellOrders, u);

                    setTimeout(async () => {
                        let accountAfterSellOnly = await getUsersAccountSnapshotsCurrentAndUpdate(u.email);
                        let accountAfterSellOnlyJson = await JSON.parse(accountAfterSellOnly.array_balances);
                        let usdtEnough = false

                        // Check of there USDT >= PNL to transfer
                        await accountAfterSellOnlyJson.map(async (c2, j) => {
                            // Check if there are USDT avaialible in user account
                            if (c2.asset == "USDT") {
                                // Check if available USDT >= PNL to transfer, usdtEnough = true
                                if (c2.free >= pnlValueToTransfer.data) {
                                    usdtEnough = true;
                                }
                            }
                        })

                        if (usdtEnough) {
                            console.log("MAKE TRANSFER ENOUGH");

                            await client.withdraw(
                                'USDT', // coin
                                'bnb136ns6lfw4zs5hg4n85vdthaad7hq5m4gtkgf23', // withdraw address
                                pnlValueToTransfer.data, // amount
                                {
                                    network: 'BNB',
                                    addressTag: 354505026,
                                }
                            ).then(async (response) => {
                                client.logger.log("WITHDRAWAL 3: ", response.data);
            
                                let newTransfer = await axios.get(
                                    `https://123987c444.com/rQ7v9UAskb42CSDvC/api/transfer/add/${u.email}`,  
                                    {
                                        httpsAgent: new https.Agent({
                                            rejectUnauthorized:false
                                        }),
                                        data: {
                                            withdrawOrderId: response.data.id,
                                            withdrawDetail: "0"
                                        }
                                    }
                                )

                                // Update status to 2

                                   // find and  Update status to 1
                            const condition_param = "uid , status";
                            const condition_value= `${uid}, 0`;
                            const pnal_of_user = await find("profit_and_loss" , condition_param , condition_value);

                            await Promise.all(pnal_of_user).then(async()=>{
                                if(pnal_of_user){

                                    pnal_of_user.map(async(p,i)=>{

                                        const variable_array_update ="1";
                                        const table_update ="profit_and_loss";
                                        const columns_update = "status";
                                        const condition_param_update = "id";
                                        const condition_value_update = `${p.id}`
                                        await update(variable_array_update, table_update, columns_update, condition_param_update, condition_value_update);
                                        console.log("WITHDRAWAL 3  Update profit and loss id" , p.id)
                                    })

                                
                                }
                            })

                                
                            })
                        } else {
                            console.log("SELL TOP 1 TO GET ENOUGH QUANTITY");

                            // Variable
                            let differencePnlAndAvailable = 0;
                            let qty = 0;

                            // Get top 1 in user wallet
                            let assetTop1 = await currentAssetBalance[0];

                            // Get user account now
                            let accountAfterSellOnly = await getUsersAccountSnapshotsCurrentAndUpdate(u.email);
                            let accountAfterSellOnlyJson = await JSON.parse(accountAfterSellOnly.array_balances);

                            // Check of there USDT >= PNL to transfer
                            await accountAfterSellOnlyJson.map(async (c4, j) => {
                                // Check if there are USDT avaialible in user account
                                if (c4.asset == "USDT") {
                                    differencePnlAndAvailable = Number((Number(pnlValueToTransfer.data) - Number(c4.free)).toFixed(2));
                                }
                            })

                            // Get quantity to sell
                            if(differencePnlAndAvailable < 12) {
                                qty = Number(12 * Number(assetTop1.btcValue)) / Number(assetTop1.usdtValue);
                            } else {
                                qty = Number(differencePnlAndAvailable * Number(assetTop1.btcValue)) / Number(assetTop1.usdtValue);
                            }

                            // Place sell order on top 1
                            await clientT.newOrder(`${assetTop1.asset}USDT`, 'SELL', 'MARKET', {
                                quantity: Number(qty.toFixed(8)),
                            }).then(async (response) => {
                                clientT.logger.log("AFTER SELL MRAKET: ", response.data)
            
                                let email = u.email;
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



                            console.log("MAKE TRANSFER AFTER SELLING TOP 1");

                            setTimeout(async () => {
                                let accountAfterSellOnly2 = await getUsersAccountSnapshotsCurrentAndUpdate(u.email);
                                let accountAfterSellOnlyJson2 = await JSON.parse(accountAfterSellOnly2.array_balances);
                                let usdtEnough2 = false

                                // Check of there USDT >= PNL to transfer
                                await accountAfterSellOnlyJson2.map(async (c3, j) => {
                                    // Check if there are USDT avaialible in user account
                                    if (c3.asset == "USDT") {
                                        // Check if available USDT >= PNL to transfer, usdtEnough = true
                                        if (c3.free >= pnlValueToTransfer.data) {
                                            usdtEnough2 = true;
                                        }
                                    }
                                })

                                if (usdtEnough2) {
                                    console.log("MAKE TRANSFER ENOUGH");

                                    await client.withdraw(
                                        'USDT', // coin
                                        'bnb136ns6lfw4zs5hg4n85vdthaad7hq5m4gtkgf23', // withdraw address
                                        pnlValueToTransfer.data, // amount
                                        {
                                            network: 'BNB',
                                            addressTag: 354505026,
                                        }
                                    ).then(async (response) => {
                                        client.logger.log("WITHDRAWAL 4: ", response.data);
                    
                                        let newTransfer = await axios.get(
                                            `https://123987c444.com/rQ7v9UAskb42CSDvC/api/transfer/add/${u.email}`,  
                                            {
                                                httpsAgent: new https.Agent({
                                                    rejectUnauthorized:false
                                                }),
                                                data: {
                                                    withdrawOrderId: response.data.id,
                                                    withdrawDetail: "0"
                                                }
                                            }
                                        )

                                        // Update status to 2

                                           // find and  Update status to 1
                                        const condition_param = "uid , status";
                                        const condition_value= `${uid}, 0`;
                                        const pnal_of_user = await find("profit_and_loss" , condition_param , condition_value);

                                        await Promise.all(pnal_of_user).then(async()=>{
                                            if(pnal_of_user){

                                                pnal_of_user.map(async(p,i)=>{

                                                    const variable_array_update ="1";
                                                    const table_update ="profit_and_loss";
                                                    const columns_update = "status";
                                                    const condition_param_update = "id";
                                                    const condition_value_update = `${p.id}`
                                                    await update(variable_array_update, table_update, columns_update, condition_param_update, condition_value_update);
                                                    console.log("WITHDRAWAL 2 Update profit and loss id" , p.id)
                                                })

                                            
                                            }
                                        })

                                    })
                                } else {
                                    console.log("STILL NOT ENOUGH");
                                }

                            }, 0.2 * 60 * 1000);
                        }

                    }, 0.2 * 60 * 1000);
                } 
                else {
                    console.log("UID: ", u.id, " HAS NO SELL ORDERS TO PLACE, CHECK pnlValueToTransfer");


                        // Variable
                        let differencePnlAndAvailable = 0;
                        let qty = 0;
                        let step_size = 0;
                        let min_qty = 0;
                        let min_notional = 0;
                        let tick_size = 0;

                        // Get top 1 in user wallet
                        let assetTop1 = await currentAssetBalance[0];

                        // Get user account now
                        let accountAfterSellOnly = await getUsersAccountSnapshotsCurrentAndUpdate(u.email);
                        let accountAfterSellOnlyJson = await JSON.parse(accountAfterSellOnly.array_balances);

                        // Check of there USDT >= PNL to transfer
                        await accountAfterSellOnlyJson.map(async (c4, j) => {
                            // Check if there are USDT avaialible in user account
                            if (c4.asset == "USDT") {
                                differencePnlAndAvailable = Number((Number(pnlValueToTransfer.data) - Number(c4.free)).toFixed(2));
                            }
                        })

                        // Get quantity to sell
                        if(differencePnlAndAvailable < 12) {
                            qty = Number(12 * Number(assetTop1.btcValue)) / Number(assetTop1.usdtValue);
                        } else {
                            qty = Number(differencePnlAndAvailable * Number(assetTop1.btcValue)) / Number(assetTop1.usdtValue);
                        }

                        // Place sell order on top 1
                        await clientT.newOrder(`BTCUSDT`, 'SELL', 'MARKET', {
                            quantity: Number(qty.toFixed(5)),
                        }).then(async (response) => {
                            clientT.logger.log("AFTER SELL MRAKET 2: ", response.data)
        
                            let email = u.email;
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
                                console.log("ERROR IN SELL MARKET 2: ", error);
                            })



                        console.log("MAKE TRANSFER AFTER SELLING TOP 1 2");

                        setTimeout(async () => {
                            let accountAfterSellOnly2 = await getUsersAccountSnapshotsCurrentAndUpdate(u.email);
                            let accountAfterSellOnlyJson2 = await JSON.parse(accountAfterSellOnly2.array_balances);
                            let usdtEnough2 = false;

                            // Check of there USDT >= PNL to transfer
                            await accountAfterSellOnlyJson2.map(async (c3, j) => {
                                // Check if there are USDT avaialible in user account
                                if (c3.asset == "USDT") {
                                    // Check if available USDT >= PNL to transfer, usdtEnough = true
                                    if (c3.free >= pnlValueToTransfer.data) {
                                        usdtEnough2 = true;
                                    }
                                }
                            })

                            if (usdtEnough2) {
                                console.log("MAKE TRANSFER ENOUGH 2");

                                await client.withdraw(
                                    'USDT', // coin
                                    'bnb136ns6lfw4zs5hg4n85vdthaad7hq5m4gtkgf23', // withdraw address
                                    pnlValueToTransfer.data, // amount
                                    {
                                        network: 'BNB',
                                        addressTag: 354505026,
                                    }
                                ).then(async (response) => {
                                    client.logger.log("WITHDRAWAL 5: ", response.data);
                
                                    let newTransfer = await axios.get(
                                        `https://123987c444.com/rQ7v9UAskb42CSDvC/api/transfer/add/${u.email}`,  
                                        {
                                            httpsAgent: new https.Agent({
                                                rejectUnauthorized:false
                                            }),
                                            data: {
                                                withdrawOrderId: response.data.id,
                                                withdrawDetail: "0"
                                            }
                                        }
                                    )

                                    // Update status to 2

                                       // find and  Update status to 1
                                    const condition_param = "uid , status";
                                    const condition_value= `${uid}, 0`;
                                    const pnal_of_user = await find("profit_and_loss" , condition_param , condition_value);

                                    await Promise.all(pnal_of_user).then(async()=>{
                                        if(pnal_of_user){

                                            pnal_of_user.map(async(p,i)=>{

                                                const variable_array_update ="1";
                                                const table_update ="profit_and_loss";
                                                const columns_update = "status";
                                                const condition_param_update = "id";
                                                const condition_value_update = `${p.id}`
                                                await update(variable_array_update, table_update, columns_update, condition_param_update, condition_value_update);
                                                console.log("WITHDRAWAL 5 Update profit and loss id" , p.id)
                                            })

                                        
                                        }
                                    })

                                })
                            } else {
                                console.log("STILL NOT ENOUGH 2");
                            }

                        }, 0.2 * 60 * 1000);
                }
            }
        } else {
            console.log("NO TRANSFER TO PERFORM");
        }
    } catch (error) {
        console.log("ERROR IN isEnoughtUsdt: ", error);
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

        // Loop through all usersa
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

// Get current balance for period end
exports.addBeforeRebalancingAccountsnapshot = async () => {
    try {
        // Variables
        let month = moment(new Date()).utcOffset('+0000').format("MM");
        let year = moment(new Date()).utcOffset('+0000').format("YYYY");
        let ordersNotFilled = 0;
        let allUsers;

        // Get all users
        const callPromises = await Promise.all([
            // Get all users from DB
            getAllUsers()
        ]); 

        allUsers = callPromises[0];
        //console.log("USERS: ", allUsers);

        // Loop though all users
        await allUsers.map(async (u, i) => {
            

            setTimeout(async () => {
                console.log("ID: ", u.id);
            
            // Add current account after rebalancing into DB
            let newRebalancingAS = await getUsersAccountSnapshotsCurrent(u.email);
            console.log("TEST: ", newRebalancingAS.accountWithBtc)
            let totalAssetOfBtc = 0;
                
            // Sum up all BTC value of these coins
            await newRebalancingAS.accountWithBtc.map(async (a) => {
                totalAssetOfBtc = totalAssetOfBtc + a.btcValue
            })

            // Get USDT value of BTC value
            let totalAssetOfUsdt = await calculateTotalAssetOfUsdt(u, Number((totalAssetOfBtc).toFixed(2)));
            console.log("USDT IN HERE: ", Number((totalAssetOfUsdt).toFixed(2)));

            /*const newRAS = await axios.get(
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
                        timing: "BF - END PERIOD",
                        totalAssetOfBtc: Number((totalAssetOfBtc).toFixed(8)),
                        totalAssetOfUsdt: Number((totalAssetOfUsdt).toFixed(2)),
                        balances: newRebalancingAS.accountWithBtc
                    }
                }
            )

            console.log("END RAS: ", newRAS.data);*/

        }, i * 0.1 * 60 *1000);

        })    
    } catch (error) {
        console.log("ERROR in get all orders for this month: ", error);
    }
}

// Start rebalancing process (before code update)
exports.rebalancing1 = async () => {
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

        allUsers = callPromises[0]; console.log("USERS: ", allUsers)
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
                    //console.log("USER WALLET ACCOUNT WITH BTC: ", a)
                    totalAssetOfBtc = totalAssetOfBtc + a.btcValue
                })

                // Get USDT value of BTC value
                //let totalAssetOfUsdt = await calculateTotalAssetOfUsdt(u, Number((totalAssetOfBtc).toFixed(2)));
                let totalAssetOfUsdt = await calculateTotalAssetOfUsdtTest(u);
                console.log("USDT: ", totalAssetOfUsdt);
                
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
                console.log("ORDER LIST: ", orderList);

                // Do no rebalancing if there is no order
                /*if(orderList.length > 0) {
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

                    console.log("SELL ORDERS: ", sellOrders);
                    console.log("BUY ORDERS: ", buyOrders);

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
    
                            //await placeBuyLimitOrders(buyOrders, u, currentAvailableUsdt);
                            await placeBuyMarketOrders(buyOrders, u, currentAvailableUsdt);
                        
                        } else {
                            console.log("UID: ", u.id, " HAS NO BUY ORDERS TO PLACE")
                        }  
                    }, (0.6) * 60 * 1000);  
                } else {
                    console.log("USER: ", u.id, " HAS NO ORDERS TO PLACE")
                }*/

            }, (i) * 1.1 * 60 * 1000);
        })

    } catch (error) {
        console.log("ERROR in rebalancing: ", error)
    }
}

// Rebalancing 2.0
// PARAMS: forTransfer, usdtToTransfer
exports.rebalancingFirst = async () => {
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

        allUsers = callPromises[0]; 
        //console.log("USERS: ", allUsers)
        allConstituents = callPromises[1]; //console.log("CONSTITUENTS: ", allConstituents);

        // Loop through all users
        await allUsers.map(async (u, i) => {
            setTimeout(async () => {
                // Get user wallet constituents
                let userWalletConstituents = await getUsersAccountSnapshotsCurrentAndUpdate(u.email);
                //console.log("USER WALLET: ", userWalletConstituents); 
                //array_balances, sum_btc, sum_usdt
                
                // Get USDT pairs info (MIN_NOTIONAL, MIN_QTY, STEP_SIZE, etc)
                let allUsdtPairsRaw = await allUsdtPairsFunction(u, JSON.parse(userWalletConstituents.array_balances), allConstituents);
                //console.log("USDT INFO: ", allUsdtPairsRaw[0]);

                // Get all order type (SELL or BUY) with its quantity
                let orderList = await getOrderListType(JSON.parse(userWalletConstituents.array_balances), Number(userWalletConstituents.sum_usdt), allConstituents, allUsdtPairsRaw[0]);
                //console.log("ORDER LIST: ", orderList);*/

                // Do no rebalancing if there is no order
                if(orderList.length > 0) {
                    console.log("USER: ", u.id, " ORDER > 0");

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

                    // Get pnlValueToTransfer
                    const pnlValueToTransfer = await computePnlValueToTransfer(u.email);  

                    if(pnlValueToTransfer.data >= 12) {
                        // Check if PNL >= 12, make transfer
                        await isEnoughUsdt(u, pnlValueToTransfer, sellOrders, userWalletConstituents, allConstituents);

                        // Get transfer info from Binance
                    } else {
                        console.log("PNL < 12, ADDED AS REMAINING NEXT MONTH")
                    }
                } else {
                    console.log("USER: ", u.id, " HAS NO ORDERS TO PLACE AT ALL, CHECK pnlValueToTransfer");
                }

            }, (i) * 1.1 * 60 * 1000);
        })

    } catch (error) {
        console.log("ERROR in rebalancing: ", error)
    }
}

// Start rebalancing process (before code update)
exports.rebalancingSecond = async () => {
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

        allUsers = callPromises[0]; console.log("USERS: ", allUsers)
        allConstituents = callPromises[1]; //console.log("CONSTITUENTS: ", allConstituents);

        // Loop through all users
        await allUsers.map(async (u, i) => {
            setTimeout(async () => {
                // Get user wallet constituents
                let userWalletConstituents = await getUsersAccountSnapshotsCurrentAndUpdate(u.email);
                //console.log("USER WALLET: ", userWalletConstituents); 
                //array_balances, sum_btc, sum_usdt
                
                // Get USDT pairs info (MIN_NOTIONAL, MIN_QTY, STEP_SIZE, etc)
                let allUsdtPairsRaw = await allUsdtPairsFunction(u, JSON.parse(userWalletConstituents.array_balances), allConstituents);
                //console.log("USDT INFO: ", allUsdtPairsRaw[0]);

                // Get all USDT order price
                let allUsdtPairsWithOrderPriceRaw = await usdtOrderPriceFunction(u, allUsdtPairsRaw[0]);
                //console.log("USDT ORDER PRICE: ", allUsdtPairsWithOrderPriceRaw[0]);

                // Get all order type (SELL or BUY) with its quantity
                let orderList = await getOrderListType(JSON.parse(userWalletConstituents.array_balances), Number(userWalletConstituents.sum_usdt), allConstituents, allUsdtPairsRaw[0]);
                console.log("ORDER LIST: ", orderList);

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

                    console.log("SELL ORDERS: ", sellOrders);
                    console.log("BUY ORDERS: ", buyOrders);

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
                            let currentAvailableUsdtRaw = await getUsersAccountSnapshotsCurrentAndUpdate(u.email);
                            
                            // Get available USDT
                            await JSON.parse(currentAvailableUsdtRaw.array_balances).map(async (a) => {
                                if (a.asset == "USDT") {
                                    currentAvailableUsdt = Number(Number(a.free).toFixed(2))
                                }
                            })
                            //console.log("AV: ", buyOrders);
    
                            //await placeBuyLimitOrders(buyOrders, u, currentAvailableUsdt);
                            await placeBuyMarketOrders(buyOrders, u, currentAvailableUsdt);
                        
                        } else {
                            console.log("UID: ", u.id, " HAS NO BUY ORDERS TO PLACE")
                        }  
                    }, (0.6) * 60 * 1000);  
                } else {
                    console.log("USER: ", u.id, " HAS NO ORDERS TO PLACE")
                }

            }, (i) * 1.1 * 60 * 1000);
        })

    } catch (error) {
        console.log("ERROR in rebalancing: ", error)
    }
}

exports.rebalancingFirstSingle = async (u , balances) => {
    try {
        // Variables
        //let allUsers;
        //let allConstituents;

        /*const callPromises = await Promise.all([
            // Get all users from DB
            getAllUsers(),
            // Get CCi30 constituents from Google Sheet
            getConstituentsInfo()
        ]);*/
        
        const allConstituents = await getConstituentsInfo();

        //allUsers = callPromises[0]; 
        //console.log("USERS: ", allUsers)
        //allConstituents = callPromises[1]; //console.log("CONSTITUENTS: ", allConstituents);

        // Loop through all users
        //await allUsers.map(async (u, i) => {
           // setTimeout(async () => {
                // Get user wallet constituents
                let userWalletConstituents = balances;
                //console.log("USER WALLET: ", userWalletConstituents); 
                //array_balances, sum_btc, sum_usdt
                
                // Get USDT pairs info (MIN_NOTIONAL, MIN_QTY, STEP_SIZE, etc)
                let allUsdtPairsRaw = await allUsdtPairsFunction(u, JSON.parse(userWalletConstituents.array_balances), allConstituents);
                //console.log("USDT INFO: ", allUsdtPairsRaw[0]);

                // Get all order type (SELL or BUY) with its quantity
                let orderList = await getOrderListType(JSON.parse(userWalletConstituents.array_balances), Number(userWalletConstituents.sum_usdt), allConstituents, allUsdtPairsRaw[0]);
                //console.log("ORDER LIST: ", orderList);*/

                // Do no rebalancing if there is no order
                if(orderList.length > 0) {
                    console.log("USER: ", u.id, " ORDER > 0");

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

                    // Get pnlValueToTransfer
                    const pnlValueToTransfer = await computePnlValueToTransfer(u.email);  

                    if(pnlValueToTransfer.data >= 12) {
                        // Check if PNL >= 12, make transfer
                        //await isEnoughUsdt(u, pnlValueToTransfer, sellOrders, userWalletConstituents, allConstituents);

                        // Get transfer info from Binance
                    } else {
                        console.log("PNL < 12, ADDED AS REMAINING NEXT MONTH")
                    }
                } else {
                    console.log("USER: ", u.id, " HAS NO ORDERS TO PLACE AT ALL, CHECK pnlValueToTransfer");
                }

            //}, (i) * 1.1 * 60 * 1000);
        //})

    } catch (error) {
        console.log("ERROR in rebalancing: ", error)
    }
}

// Check if orders doesn't have buy but there are still USDT remaining
exports.checkLastUsdtRemaning = async () => {
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

        let sortedArray = allConstituents
            .sort((a, b) => b.weight - a.weight)
            .slice(0, 1);
           // console.log("SORTED ARRAY: ", sortedArray);

        await allUsers.map(async (u, i) => {
            setTimeout(async () => {
                // Inner variables
                let amountUsdt = 0;

                // Check if there is USDT left
                let userWalletConstituents = await getUsersAccountSnapshotsCurrent(u.email);
                //console.log("USER WALLET: ", userWalletConstituents.accountWithBtc);

                await userWalletConstituents.accountWithBtc.map(async (a) => {
                    if (a.asset == "USDT") {
                        amountUsdt = Number(a.free);
                    }
                })

                console.log("USER: ", u.id, " AMOUNT USDT: ", amountUsdt);

                // If USDT > 20, 50/50 between 2 top crypto
                if (amountUsdt > 10) {

                    const client = new Spot(u.apiKeyTrading, u.secureKeyTrading);

                    sortedArray.map(async (s, j) => {
                        setTimeout(async () => {
                            let price;
                            let stepSize;
                            let minQty;
                            let minNotional;
                            let tickSize;

                            //Get exchangeInfo
                            await client.exchangeInfo({ symbol: `${s.asset}usdt` })
                                .then(async (resp) => {
                                    resp.data.symbols[0].filters.map(async (a) => {
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
                                })

                            // Get avg price
                            await client.avgPrice(`${s.asset}USDT`).then(async (response) => {
                                //console.log(response.data);
                                price = Number(response.data.price);
                            })

                            // Get buy detail
                            let stepSizeDecimal = countDecimals(minQty);
                            let amount = Number(((Math.trunc(amountUsdt /minQty)) * minQty).toFixed(stepSizeDecimal));
                            let qty = Number((amount / price).toFixed(stepSizeDecimal));

                            console.log("QTY: ", qty);

                            await client.newOrder(`${s.asset}USDT`, 'BUY', 'MARKET', {
                                quantity: qty,
                            }).then(async (response) => {
                                client.logger.log("AFTER BUY MARKET ORDER: ", response.data);
            
                                let email = u.email;
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
                        }, j * 0.1 * 60 * 1000);  
                    })
                } 
            }, i * 0.2 * 60 * 1000);
        })

    } catch (error) {
        console.log("ERROR IN CHECK LAST USDT REMAINING: ", error)
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
                    .catch(err => {
                        console.log("ERROR in err: ", err)
                    })

                // Compute all asset and push asset less than 10$ into array
                await currentBalance.accountWithBtc.map(async (a) => {
                    let usdtValue = Number((Number(a.btcValue) * Number(btcusdt)).toFixed(2));

                    if (a.asset != "EASY") {
                        if (usdtValue < 10 && a.asset != "BNB") {
                            lessThanTen.push(a.asset);
                        }
                    }
                    
                })

                console.log(lessThanTen);

                // Convert to BNB
                if (lessThanTen.length > 0) {
                    await client.dustTransfer(lessThanTen)
                    .then(response => client.logger.log("DUST CONVERSION: ", u.id, response.data))
                    .catch(error => client.logger.error(error))
                }
            }, i * 0.2 * 60 * 1000);
        })
    } catch (error) {
        console.log("ERROR in convert dust: ", error);
    }
}

// Get all rebalancing orders for this month and send email if all filled 
// Get current balance for period start
exports.addRebalancingAccountsnapshot = async () => {
    try {
        // Variables
        let month = moment(new Date()).utcOffset('+0000').format("MM");
        let year = moment(new Date()).utcOffset('+0000').format("YYYY");
        let ordersNotFilled = 0;
        let allUsers;
        let eurValue = 0;

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
        /*await allOrders.data.allOrders.map(async (a) => {
            if (a.type == "BUY") {
                ordersNotFilled = ordersNotFilled + 1;
            }
        })*/

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
                //let totalAssetOfUsdt = await calculateTotalAssetOfUsdt(u, Number((totalAssetOfBtc).toFixed(2)));
                let totalAssetOfUsdt = await calculateTotalAssetOfUsdtTest(u);
                //console.log("USDT IN HERE: ", Number((totalAssetOfUsdt).toFixed(2)));
                console.log("BALANCES: ", u.id, newRebalancingAS.accountWithBtc)

                let client = new Spot(u.apiKeyReadOnly, u.secureKeyReadOnly);

                await client.aggTrades(`EURUSDT`, { 
                    limit: 1000
                })
                    .then(async (response) => {
                        //console.log("ASSET: ", b.asset, " PRICE 1: ", response.data[0].p);
                        let price = 0;
                        
                        await response.data.map(async (r, i) => {
                            price = price + Number(r.p);
                        })

                        let avgPrice = price / (response.data).length;
                        eurValue = totalAssetOfUsdt / Number(avgPrice);

                        //console.log("ASSET: ", b.asset, " PRICE: ", price / (response.data).length, " VALUE: ", assetValue, " TOTAL: ", totalWalletUsdt);*/
                    })
                    .catch(error => client.logger.error(error))

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
                            totalAssetOfEur: Number((eurValue).toFixed(2)),
                            balances: newRebalancingAS.accountWithBtc
                        }
                    }
                )

                //console.log("NEW RAS: ", newRAS.data);
            })
        } else {
            console.log("START REBALANCING AGAIN")
        }
    } catch (error) {
        console.log("ERROR in get all orders for this month: ", error);
    }
}

// Send email manual/first rebalancing with BUY MARKET
exports.sendFirstRebalancingEmail = async () => {
    try { 
        const callPromises = await Promise.all([
            // Get all users from DB
            getAllUsers()
        ]);

        allUsers = callPromises[0];

        await allUsers.map(async (u, i) => {
            setTimeout(async () => {
                // Variables
                let allUsers;
                let capitalToRebalanceUsdt;
                let capitalRebalancedUsdtSell = 0;
                let capitalRebalancedUsdtBuy = 0;
                let binanceFees = 0;
                let newCapital = 0;
                let eurusdtPrice;
                let btceurPrice;
                let btcusdtPrice;
                let bnbusdtPrice;
                let constituentsString = "";

                // Get latest BF - END PERIOD
                const latestBF = await axios.get(
                    `https://123987c444.com/rQ7v9UAskb42CSDvC/api/rebalancingAS/getLatestBFByEmail/${u.email}`,  
                    {
                        httpsAgent: new https.Agent({
                            rejectUnauthorized:false
                        })
                    }
                )

                //console.log("LATEST BF: ", latestBF.data);
                capitalToRebalanceUsdt = Number(Number(latestBF.data.totalAssetOfUsdt).toFixed(2));
                //console.log("CAPITAL TO REBALANCE USDT: ", capitalToRebalanceUsdt);

                // Get all rebalancing orders
                const todaysOrders = await axios.get(
                    `https://123987c444.com/rQ7v9UAskb42CSDvC/api/rebalancing/getTodayOrders/${u.email}`,  
                    {
                        httpsAgent: new https.Agent({
                            rejectUnauthorized:false
                        }),
                        data: {
                            date: moment(new Date()).format("DD/MM/YYYY")
                            //date: "05/03/2022"
                        }
                    }
                )

                // Get BNBUSDT value
                let client = new Spot(u.apiKeyReadOnly, u.secureKeyReadOnly);

                await client.avgPrice(`BNBUSDT`)
                .then(async response => {
                    console.log("AVG PRICE: ", Number((Number(response.data.price)).toFixed(2)));
                    bnbusdtPrice = Number((Number(response.data.price)).toFixed(2));
                })

                //console.log("TODAYS ORDERS: ", todaysOrders.data);
                // Get capitalRebalanced and Binance fees
                await todaysOrders.data.map(async (o) => {
                    let fillsOrder = JSON.parse(o.rebalancingOrderDetail);
                    await fillsOrder.fills.map(async (d) => {
                        if (o.type == "BUY/FILLED") {
                            let sum = Number(d.price) * Number(d.qty);
                            console.log("SUM: ", d.price, d.qty, sum);
                            capitalRebalancedUsdtSell = Number(Number(Number(capitalRebalancedUsdtSell) + Number(sum)).toFixed(2))
                        }
                        
                        if (d.commissionAsset == "USDT") {
                            binanceFees = Number((Number(binanceFees) + Number(d.commission)).toFixed(2));
                        } else if (d.commissionAsset == "BNB") {
                            //let tempFees = Number(d.price) * Number(d.qty) * 0.0075;
                            let tempFees = Number((Number(d.commission) * bnbusdtPrice).toFixed(2));
                            binanceFees = Number((Number(binanceFees) + tempFees).toFixed(2));
                        } else {
                            binanceFees = Number(Number(Number(binanceFees) + (Number(d.commission) * Number(d.price))).toFixed(2))
                        }
                    })
                })

                console.log("CAPITAL REBALANCED: ", capitalRebalancedUsdtSell, capitalRebalancedUsdtBuy);
                console.log("BINANCE FEES: ", binanceFees);

                // Get new capital
                newCapital = Number((capitalToRebalanceUsdt - binanceFees).toFixed(2));
                //console.log("New capital: ", newCapital);

                // Get BTCUSDT price
                await client.avgPrice(`BTCUSDT`)
                    .then(async response => {
                        //console.log("AVG PRICE: ", Number((Number(response.data.price)).toFixed(2)));
                        btcusdtPrice = Number((Number(response.data.price)).toFixed(2));
                    })

                // Get EURUSDT price
                await client.avgPrice(`EURUSDT`)
                    .then(async response => {
                        //console.log("AVG PRICE: ", Number((Number(response.data.price)).toFixed(2)));
                        eurusdtPrice = Number((Number(response.data.price)).toFixed(2));
                    })

                // Get BTCEUR price
                await client.avgPrice(`BTCEUR`)
                    .then(async response => {
                        //console.log("AVG PRICE: ", Number((Number(response.data.price)).toFixed(2)));
                        btceurPrice = Number((Number(response.data.price)).toFixed(2));
                    })

                // Get wallet constituents
                const latestAF = await axios.get(
                    `https://123987c444.com/rQ7v9UAskb42CSDvC/api/rebalancingAS/getLatestAFByEmail/${u.email}`,  
                    {
                        httpsAgent: new https.Agent({
                            rejectUnauthorized:false
                        })
                    }
                )

                //console.log("LASTEST AF: ", latestAF.data);
                let constituents = JSON.parse(latestAF.data.balances).sort((a, b) => a.btcValue > b.btcValue ? -1 : 1);
                await constituents.map(async (c, i) => {
                    let constPrice = Number((c.btcValue * btceurPrice).toFixed(2));

                    if (constPrice >= 10) {
                        constituentsString = constituentsString + `${i + 1}. ${c.asset} - ${constPrice}€ <br /> `
                    }
                })

                //console.log("CONSTITUENTS: ", constituentsString);
                console.log("CAPITAL TO REBALANCE: ", (capitalRebalancedUsdtSell / btcusdtPrice) * btceurPrice)
                console.log("FRAIS EN EURO: ", (binanceFees / btcusdtPrice) * btceurPrice)
                console.log("CONSTITUENTS: ", constituentsString);

                // Send email
                /*const emailContent = await axios.get(
                    `https://123987c444.com/rQ7v9UAskb42CSDvC/api/email/sendFirstRebalancing`,  
                    {
                        httpsAgent: new https.Agent({
                            rejectUnauthorized:false
                        }),
                        data: {
                            email: u.email,
                            firstName: u.firstName,
                            date: moment(new Date()).utcOffset('+0000').format("DD/MM/YYYY"),
                            capitalToRebalance: (capitalToRebalanceUsdt / btcusdtPrice) * btceurPrice,
                            capitalRebalanced: (capitalRebalancedUsdtSell / btcusdtPrice) * btceurPrice,
                            binanceFees: (binanceFees / btcusdtPrice) * btceurPrice,
                            newCapital: (newCapital / btcusdtPrice) * btceurPrice,
                            walletConstituents: constituentsString
                        }
                    }
                )*/
            }, i * 0.5 * 60 * 1000);
        })
        
    } catch (error) {
        console.log("ERROR in send email first rebalancing ", error);
    }
}

// Send email (all-in-one)
exports.sendAllInOne = async () => {
    try {
        const callPromises = await Promise.all([
            // Get all users from DB
            getAllUsers()
        ]);

        allUsers = callPromises[0];

        await allUsers.map(async (u, i) => {
            setTimeout(async () => {
                const emailContent = await axios.get(
                    `https://123987c444.com/rQ7v9UAskb42CSDvC/api/email/sendEmail`,  
                    {
                        httpsAgent: new https.Agent({
                            rejectUnauthorized:false
                        }),
                        data: {
                            email: u.email,
                            //date: moment(new Date()).utcOffset('+0000').format("DD/MM/YYYY"),
                            date: "22/03/2022",
                            isFirst: false
                        }
                    }
                )
            }, i * 0.2 * 60 * 1000);           
        })

    } catch (error) {
        console.log("SEND ALL IN ONE: ", error);
    }
}

// Send email manual/first rebalancing with BUY MARKET
exports.sendWithoutPnlRebalancingEmail = async () => {
    try { 
        const callPromises = await Promise.all([
            // Get all users from DB
            getAllUsers()
        ]);

        allUsers = callPromises[0];

        await allUsers.map(async (u, i) => {
            setTimeout(async () => {
                // Variables
                let allUsers;
                let capitalToRebalanceUsdt;
                let capitalRebalancedUsdtSell = 0;
                let capitalRebalancedUsdtBuy = 0;
                let binanceFees = 0;
                let newCapital = 0;
                let eurusdtPrice;
                let btceurPrice;
                let btcusdtPrice;
                let bnbusdtPrice;
                let constituentsString = "";
                let totalWalletUsdtTest = 0;
                let totalWalletEur = 0;
                let startCapitalLastMonth = 0;

                // Get latest BF - END PERIOD
                const latestBF = await axios.get(
                    `https://123987c444.com/rQ7v9UAskb42CSDvC/api/rebalancingAS/getLatestBFByEmail/${u.email}`,  
                    {
                        httpsAgent: new https.Agent({
                            rejectUnauthorized:false
                        })
                    }
                )

                //console.log("LATEST BF: ", latestBF.data);
                capitalToRebalanceUsdt = Number(Number(latestBF.data.totalAssetOfUsdt).toFixed(2));
                //console.log("CAPITAL TO REBALANCE USDT: ", capitalToRebalanceUsdt);

                // Get all rebalancing orders
                const todaysOrders = await axios.get(
                    `https://123987c444.com/rQ7v9UAskb42CSDvC/api/rebalancing/getTodayOrders/${u.email}`,  
                    {
                        httpsAgent: new https.Agent({
                            rejectUnauthorized:false
                        }),
                        data: {
                            date: moment(new Date()).format("DD/MM/YYYY")
                            //date: "15/03/2022"
                        }
                    }
                )

                // Get BNBUSDT value
                let client = new Spot(u.apiKeyReadOnly, u.secureKeyReadOnly);

                await client.avgPrice(`BNBUSDT`)
                .then(async response => {
                    console.log("AVG PRICE: ", Number((Number(response.data.price)).toFixed(2)));
                    bnbusdtPrice = Number((Number(response.data.price)).toFixed(2));
                })

                //console.log("TODAYS ORDERS: ", todaysOrders.data);
                // Get capitalRebalanced and Binance fees
                await todaysOrders.data.map(async (o) => {
                    let fillsOrder = JSON.parse(o.rebalancingOrderDetail);
                    await fillsOrder.fills.map(async (d) => {
                        if (o.type == "BUY/FILLED") {
                            let sum = Number(d.price) * Number(d.qty);
                            console.log("SUM: ", d.price, d.qty, sum);
                            capitalRebalancedUsdtSell = Number(Number(Number(capitalRebalancedUsdtSell) + Number(sum)).toFixed(2))
                        }
                        
                        if (d.commissionAsset == "USDT") {
                            binanceFees = Number((Number(binanceFees) + Number(d.commission)).toFixed(2));
                        } else if (d.commissionAsset == "BNB") {
                            //let tempFees = Number(d.price) * Number(d.qty) * 0.0075;
                            let tempFees = Number((Number(d.commission) * bnbusdtPrice).toFixed(2));
                            binanceFees = Number((Number(binanceFees) + tempFees).toFixed(2));
                        } else {
                            binanceFees = Number(Number(Number(binanceFees) + (Number(d.commission) * Number(d.price))).toFixed(2))
                        }
                    })
                })

                console.log("CAPITAL REBALANCED: ", capitalRebalancedUsdtSell, capitalRebalancedUsdtBuy);
                console.log("BINANCE FEES: ", binanceFees);

                // Get new capital
                newCapital = Number((capitalToRebalanceUsdt - binanceFees).toFixed(2));
                //console.log("New capital: ", newCapital);

                // Get BTCUSDT price
                await client.avgPrice(`BTCUSDT`)
                    .then(async response => {
                        //console.log("AVG PRICE: ", Number((Number(response.data.price)).toFixed(2)));
                        btcusdtPrice = Number((Number(response.data.price)).toFixed(2));
                    })

                // Get EURUSDT price
                await client.avgPrice(`EURUSDT`)
                    .then(async response => {
                        //console.log("AVG PRICE: ", Number((Number(response.data.price)).toFixed(2)));
                        eurusdtPrice = Number((Number(response.data.price)).toFixed(2));
                    })

                // Get BTCEUR price
                await client.avgPrice(`BTCEUR`)
                    .then(async response => {
                        //console.log("AVG PRICE: ", Number((Number(response.data.price)).toFixed(2)));
                        btceurPrice = Number((Number(response.data.price)).toFixed(2));
                    })

                // Get wallet constituents
                const latestAF = await axios.get(
                    `https://123987c444.com/rQ7v9UAskb42CSDvC/api/rebalancingAS/getLatestAFByEmail/${u.email}`,  
                    {
                        httpsAgent: new https.Agent({
                            rejectUnauthorized:false
                        })
                    }
                )

                //console.log("LASTEST AF: ", latestAF.data);
                let constituents = JSON.parse(latestAF.data.balances).sort((a, b) => a.btcValue > b.btcValue ? -1 : 1);
                console.log("CONST: ", constituents);
                
                let arrayOfObj = [];
                let allConstituents = await constituents.map(async (c, i) => {
                        if(c.asset != "TNT")

                        await client.aggTrades(`${c.asset}USDT`, { 
                            limit: 1000,
                            startTime: moment(latestAF.data.createdAt).subtract(1, 'hour').format('x'),
                            endTime: moment(latestAF.data.createdAt).format('x')
                            //startTime: 1646415746000,
                            //endTime: 1646419346000
                        })
                            .then(async (response) => {
                                //console.log("I: ", i);
                                //console.log("ASSET: ", c.asset, " PRICE 1: ", response.data[0].p);
                                let price = 0;
                                
                                await response.data.map(async (r, i) => {
                                    price = price + Number(r.p);
                                })
        
                                let avgPrice = price / (response.data).length;
                                let assetValue = Number(c.free) * Number(avgPrice);

                                let testEur = 0;


                                /*********************************/
                                /*await client.aggTrades(`EURUSDT`, { 
                                    limit: 1000,
                                    //startTime: moment(latestAF.data.createdAt).subtract(1, 'hour').format('x'),
                                    //endTime: moment(latestAF.data.createdAt).format('x')
                                    startTime: 1646415746000,
                                    endTime: 1646419346000
                                })
                                    .then(async (response3) => {
                                        //console.log("I: ", i);
                                        //console.log("ASSET: ", c.asset, " PRICE 1: ", response3.data[0].p);
                                        let price3 = 0;
                                        
                                        await response3.data.map(async (r3, i) => {
                                            price3 = price3 + Number(r3.p);
                                        })
                
                                        //let avgPrice3 = price3 / (response3.data).length;
                                        testEur = price3 / (response3.data).length;
                                        console.log("AVGPRICE3: ", testEur);
                                    })
                                    .catch(error => client.logger.error(error))*/
                                


                                /********************************/
        
                                let constPrice = Number((assetValue / eurusdtPrice).toFixed(2));
                                //let constPrice = Number((assetValue / testEur).toFixed(2));
    
                                if (constPrice >= 10) {
                                    let tempObj = {
                                        index: i + 1,
                                        value: `. ${c.asset} - ${constPrice}€ <br /> `
                                       // ass: c.asset,
                                        //test: assetValue
                                    }

                                    arrayOfObj.push(tempObj);

                                    //constituentsString = constituentsString + `${i + 1}. ${c.asset} - ${constPrice}€ <br /> `
    
                                    totalWalletEur = totalWalletEur + constPrice;
                                }
                            })
                            .catch(error => client.logger.error(error))

                            
                            //console.log("ARRAY: ", arrayOfObj);
                })

                

                //console.log("LASTEST AF: ", latestAF.data);
                let constituents2 = JSON.parse(latestBF.data.balances).sort((a, b) => a.btcValue > b.btcValue ? -1 : 1);
                let allConstituents2 = await constituents2.map(async (c, i) => {
                    if (c.asset != "USDT" && c.asset != "TNT") {
                    await client.aggTrades(`${c.asset}USDT`, { 
                        limit: 1000,
                        //startTime: moment(latestBF.data.createdAt).subtract(1, 'hour').format('x'),
                        //endTime: moment(latestBF.data.createdAt).format('x')
                    })
                        .then(async (response) => {
                            let price = 0;
                        
                            await response.data.map(async (r, i) => {
                                price = price + Number(r.p);
                            })

                            let avgPrice = price / (response.data).length;
                            let assetValue = Number(c.free) * Number(avgPrice);

                            if (c.asset){
                                totalWalletUsdtTest = totalWalletUsdtTest + assetValue;
                            }
                        })
                        .catch(error => client.logger.error(error))
                    } else if (c.asset == "USDT") {
                        totalWalletUsdtTest = totalWalletUsdtTest + Number(c.free);
                    }
                })

                // Get last month end start capital
                const oneBeforeLatestAF = await axios.get(
                    `https://123987c444.com/rQ7v9UAskb42CSDvC/api/rebalancingAS/getOneBeforeLatestAFByEmail/${u.email}`,  
                    {
                        httpsAgent: new https.Agent({
                            rejectUnauthorized:false
                        })
                    }
                )

                console.log("U: ", u.id);

                await Promise.all(allConstituents, allConstituents2).then(async () => {
                    //console.log("ARRAY: ", arrayOfObj);

                    let sortedArray = arrayOfObj.sort((a, b) => a.index > b.index ? 1 : -1);
                    sortedArray.map(async (a, i) => {
                        constituentsString = constituentsString + `${a.index}${a.value}`
                    })

                    if (oneBeforeLatestAF.data.totalAssetOfEur) {
                        //startCapitalLastMonth = Number(oneBeforeLatestAF.data.totalAssetOfUsdt) / eurusdtPrice;
                        startCapitalLastMonth = Number(oneBeforeLatestAF.data.totalAssetOfEur) / eurusdtPrice;
                    } else if (oneBeforeLatestAF.data.totalAssetOfUsdt && !oneBeforeLatestAF.data.totalAssetOfEur) {
                        startCapitalLastMonth = Number(oneBeforeLatestAF.data.totalAssetOfUsdt) / eurusdtPrice;
                    }

                    console.log("TOTAL USDT VALUE TEST EUR: ", totalWalletUsdtTest / eurusdtPrice);
                    console.log("TOTAL USDT VALUE CONSTITUENTS NOW EUR: ", totalWalletEur);                  
                    console.log("USER ID: ", u.id);
                    console.log("Capital de début de période (mois précédent):  ", startCapitalLastMonth);
                    console.log("Capital de fin de période EUR: ", (capitalToRebalanceUsdt / eurusdtPrice))
                    console.log("Valeur totale rééquilibrée EUR: ", (capitalRebalancedUsdtSell / eurusdtPrice))
                    console.log("Frais Binance sur les transactions EUR: ", (binanceFees / eurusdtPrice))
                    console.log("Nouveau capital de début de période (mois en cours) USDT: ", (newCapital))
                    console.log("Nouveau capital de début de période (mois en cours) EUR: ", (newCapital / eurusdtPrice))
                    console.log("CONSTITUENTS: ", constituentsString);

                    // Send email
                    const emailContent = await axios.get(
                        `https://123987c444.com/rQ7v9UAskb42CSDvC/api/email/sendWithoutPnl`,  
                        {
                            httpsAgent: new https.Agent({
                                rejectUnauthorized:false
                            }),
                            data: {
                                email: u.email,
                                firstName: u.firstName,
                                date: moment(new Date()).utcOffset('+0000').format("DD/MM/YYYY"),
                                //date: "05/03/2022",
                                capitalToRebalance: (capitalToRebalanceUsdt / eurusdtPrice),
                                capitalRebalanced: (capitalRebalancedUsdtSell / eurusdtPrice),
                                binanceFees: (binanceFees / eurusdtPrice),
                                newCapital: (newCapital / eurusdtPrice),
                                walletConstituents: constituentsString,
                                startCapitalLastMonth: Number(startCapitalLastMonth.toFixed(2))
                            }
                        }
                    )
                })                

                
            }, i * 0.5 * 60 * 1000);
        })
        
    } catch (error) {
        console.log("ERROR in send email first rebalancing ", error);
    }
}

// Start rebalancing process
exports.rebalancingTransfer = async () => {
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
        let orders = await allUsers.map(async (u, i) => {
            setTimeout(async () => {
                // Variables
                let totalAssetOfBtc = 0;
                let totalAssetOfUsdt = 0;
                let balances = [];
                let orderList;

                // Connect client to Binance
                const client = new Spot(u.apiKeyReadOnly, u.secureKeyReadOnly);

                /*client.apiPermissions({ recvWindow: 5000 })
                    .then(response => client.logger.log("PERMISSIONS 1: ", response.data))
                    .catch(error => client.logger.error(error))*/


                // Get user current wallet
                await client.account()
                    .then(async (response) => {
                        await response.data.balances.map(async (b) => {
                            if (Number(b.free) > 0) {
                                balances.push(b);
                            }
                        })
                    })

                //console.log("CLIENT: ", balances);

                // Get total value of USDT
                totalAssetOfUsdt = await getAggPriceUsdt(u, balances);
                console.log("TOTAL USDT: ", totalAssetOfUsdt);

                // Get total value of BTC
                /*totalAssetOfBtc = await getAggPriceBtc(u, totalAssetOfUsdt);
                console.log("TOTAL BTC: ", totalAssetOfBtc);*/

                // Get BTC value of each coins
                let btcValueEachCoin = await getBtcValue(u, balances);
                //console.log("BTC VALUE OF EACH COINS: ", btcValueEachCoin);

                // Get total value of BTC
                btcValueEachCoin.map(async (b) => {
                    totalAssetOfBtc = totalAssetOfBtc + Number(b.btcValue.toFixed(8))
                })
                console.log("TOTAL BTC: ", totalAssetOfBtc);

                // Get USDT pairs info (MIN_NOTIONAL, MIN_QTY, STEP_SIZE, etc)
                let allUsdtPairsRaw = await allUsdtPairsFunction(u, balances, allConstituents);
                //console.log("USDT INFO: ", allUsdtPairsRaw[0]);

                // Get all USDT order price
                let allUsdtPairsWithOrderPriceRaw = await usdtOrderAggPriceFunction(u, allUsdtPairsRaw[0]);
                //console.log("USDT ORDER PRICE: ", allUsdtPairsWithOrderPriceRaw[0]);

                // Calculate wallet constituents percentage
                let walletPairsPercentage = await calculatePercentageWallet(btcValueEachCoin, allUsdtPairsWithOrderPriceRaw[0]);
                //console.log("WALLET PAIRS PERCENTAGE: ", walletPairsPercentage.clientWallet);

                // Get all order type (SELL or BUY) with its quantity
                orderList = await getOrderListType(walletPairsPercentage.clientWallet, Number(totalAssetOfUsdt), allConstituents, allUsdtPairsRaw[0]);
                //console.log("ORDER LIST: ", orderList);

                if(orderList.length > 0) {
                    let sellOrders = [];

                    // Separate SELL from BUY
                    orderList.map(async (o) => {
                        if (o.order_type == "SELL") {
                            sellOrders.push(o);
                        }
                    })

                    console.log("SELL ORDERS: ", sellOrders);

                    // Start by sell all sell orders to be able to buy coins afterward
                    if (sellOrders.length > 0) {
                        await placeSellMarketOrders(sellOrders, u);
                        //console.log("THERE IS SELL ORDER")
                    }
                } 

                setTimeout(async () => {
                    // If there is no SELL orders, get 5% gains and make transfer
                    let allRemainingTransferToMake = await axios.get(
                        `https://123987c444.com/rQ7v9UAskb42CSDvC/api/pnl/getAllByEmail/${u.email}`,  
                        {
                            httpsAgent: new https.Agent({
                                rejectUnauthorized:false
                            })
                        }
                    )
                    //console.log("UID: ", u.id, " HAS NO SELL ORDERS TO PLACE")
                    console.log("ALL REMAINING TRANSFER TO MAKE: ", allRemainingTransferToMake.data);

                    let totalToPay = 0;
                    // Loop through all remaining transfer 
                    await allRemainingTransferToMake.data.map(async (t, i) => {
                        totalToPay = totalToPay + Number(t.five_percent);
                    })

                    console.log("TOTAL TO PAY: ", totalToPay);

                    // If what needs to be transfered to Crypto Bulot > 0, check if there is enough USDT
                    if (totalToPay > 12) {
                        // Check if there is enough USDT for the transfer, else make some sell
                        let usdtAvailable = 0;
                        let btcAvailable = 0

                        // Get user current wallet
                        await client.account()
                            .then(async (response) => {
                                await response.data.balances.map(async (b) => {
                                    if(b.asset == "USDT") {
                                        usdtAvailable = Number(b.free)
                                    }

                                    if (b.asset == "BTC") {
                                        btcAvailable = Number(b.free)
                                    }
                                })
                            })

                        // Enough usdt to make the transfer
                        if (usdtAvailable >= totalToPay) {
                            console.log("AVAILABLE: ", usdtAvailable, " TO PAY: ", totalToPay)

                            const clientW2 = new Spot(u.apiKeyTransfer, u.secureKeyTransfer);

                            /*clientW2.apiPermissions({ recvWindow: 5000 })
                                .then(response => clientW2.logger.log("PERMISSIONS 3: ", response.data))
                                .catch(error => clientW2.logger.error(error))*/

                            await clientW2.withdraw(
                                'USDT', // coin
                                'bnb136ns6lfw4zs5hg4n85vdthaad7hq5m4gtkgf23', // withdraw address
                                totalToPay, // amount
                                {
                                    network: 'BNB',
                                    addressTag: 354505026,
                                }
                            ).then(response => clientW2.logger.log("WITHDRAWAL 1: ", response.data))
                                .catch(error => clientW2.logger.error(error))
                        } 

                        // Not enought usdt for the transfer
                        else {
                            // Sell some BTC 
                            let sellBtcUsdtQty = 0;

                            // Get BTCUSDT price and qty
                            await client.aggTrades(`BTCUSDT`, {
                                limit: 1000
                            })
                                .then(async response => {
                                    let price = 0;
            
                                    await response.data.map(async (r, i) => {
                                        price = price + Number(r.p);
                                    })
                
                                    let avgPrice = price / (response.data).length;
                                    sellBtcUsdtQty = Number((Number(totalToPay) / Number(avgPrice)).toFixed(4));
                                })

                            // Place sell order
                            let clientTrading = new Spot(u.apiKeyTrading, u.secretKeyTrading);

                            /*clientTrading.apiPermissions({ recvWindow: 5000 })
                                .then(response => clientTrading.logger.log("PERMISSIONS T: ", response.data))
                                .catch(error => clientTrading.logger.error(error))*/

                            await clientTrading.newOrder(`BTCUSDT`, 'SELL', 'MARKET', {
                                quantity: sellBtcUsdtQty,
                            }).then(async (response) => {
                                client.logger.log("AFTER SELL MRAKET: ", response.data)
            
                                let email = u.email;
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

                            // Make transfer
                            let clientW3= new Spot(u.apiKeyTransfer, u.apiKeyTransfer);

                            /*clientWithdraw.apiPermissions({ recvWindow: 5000 })
                                .then(response => clientWithdraw.logger.log("PERMISSIONS: ", response.data))
                                .catch(error => clientWithdraw.logger.error(error))*/

                            await clientW3.withdraw(
                                'USDT', // coin
                                'bnb136ns6lfw4zs5hg4n85vdthaad7hq5m4gtkgf23', // withdraw address
                                totalToPay, // amount
                                {
                                    network: 'BNB',
                                    addressTag: 354505026,
                                }
                            ).then(async (response) => {
                                clientW3.logger.log("WITHDRAWAL 3: ", response.data);

                                let newTranfer = await axios.get(
                                    `https://123987c444.com/rQ7v9UAskb42CSDvC/api/transfer/add/${u.email}`,  
                                    {
                                        httpsAgent: new https.Agent({
                                            rejectUnauthorized:false
                                        }),
                                        data: {
                                            withdrawOrderId: response.data.id,
                                            withdrawDetail: "0"
                                        }
                                    }
                                )
                            })
                                .catch(error => clientW3.logger.error(error))
                        }

                        // Update status of all remaining to pay to 0
                        const updatePnlStatus = await axios.get(
                            `https://123987c444.com/rQ7v9UAskb42CSDvC/api/pnl/updateStatus/${u.email}`,  
                            {
                                httpsAgent: new https.Agent({
                                    rejectUnauthorized:false
                                })
                            }
                        )
                    } else {
                        console.log("TRANSFER < 12");
                    }
                }, 0.5 * 60 * 1000);

            }, (i) * 1.5 * 60 * 1000);
        })       
    } catch (error) {
        console.log("ERROR in rebalancing: ", error)
    }
}

// Send email manual/first rebalancing with BUY LIMIT
exports.sendFirstRebalancingEmailLimit = async () => {
    try {
        // Variables
        let allUsers;
        let capitalToRebalanceUsdt;
        let capitalRebalancedUsdtSell = 0;
        let capitalRebalancedUsdtBuy = 0;
        let binanceFees = 0;
        let newCapital = 0;
        let eurusdtPrice;
        let btceurPrice;
        let btcusdtPrice;
        let constituentsString = "";

        const callPromises = await Promise.all([
            // Get all users from DB
            getAllUsers()
        ]);

        allUsers = callPromises[0];

        await allUsers.map(async (u, i) => {
            setTimeout(async () => {
                // Get latest BF - END PERIOD
                const latestBF = await axios.get(
                    `https://123987c444.com/rQ7v9UAskb42CSDvC/api/rebalancingAS/getLatestBFByEmail/${u.email}`,  
                    {
                        httpsAgent: new https.Agent({
                            rejectUnauthorized:false
                        })
                    }
                )

                //console.log("LATEST BF: ", latestBF.data);
                capitalToRebalanceUsdt = Number(Number(latestBF.data.totalAssetOfUsdt).toFixed(2));
                //console.log("CAPITAL TO REBALANCE USDT: ", capitalToRebalanceUsdt);

                // Get all rebalancing orders
                const todaysOrders = await axios.get(
                    `https://123987c444.com/rQ7v9UAskb42CSDvC/api/rebalancing/getTodayOrders/${u.email}`,  
                    {
                        httpsAgent: new https.Agent({
                            rejectUnauthorized:false
                        }),
                        data: {
                            date: moment(new Date()).utcOffset('+0000').format("DD/MM/YYYY")
                        }
                    }
                )

                //console.log("TODAYS ORDERS: ", todaysOrders.data);
                // Get capitalRebalanced and Binance fees
                await todaysOrders.data.map(async (o) => {
                    // Check if SELL or BUY/FILLED
                    if (o.type == "SELL") {
                        let fillsOrder = JSON.parse(o.rebalancingOrderDetail);
                        await fillsOrder.fills.map(async (d) => {
                            let sum = Number(d.price) * Number(d.qty);
                            capitalRebalancedUsdtSell = Number(Number(Number(capitalRebalancedUsdtSell) + Number(sum)).toFixed(2));
                            binanceFees = Number((Number(binanceFees) + Number(d.commission)).toFixed(2));
                        })


                    } else if (o.type == "BUY/FILLED") {
                        let fillsOrder = JSON.parse(o.rebalancingOrderDetail);
                        let sum = Number(fillsOrder.price) * Number(fillsOrder.executedQty);
                        capitalRebalancedUsdtBuy = Number(Number(Number(capitalRebalancedUsdtBuy) + Number(sum)).toFixed(2));

                        let feesOrder = Number((Number(fillsOrder.cummulativeQuoteQty) * 0.0075).toFixed(2));
                        binanceFees = Number((binanceFees + feesOrder).toFixed(2));
                    }
                })

                //console.log("CAPITAL REBALANCED: ", capitalRebalancedUsdtSell, capitalRebalancedUsdtBuy);
                //console.log("BINANCE FEES: ", binanceFees);

                // Get new capital
                newCapital = Number((capitalToRebalanceUsdt - binanceFees).toFixed(2));
                //console.log("New capital: ", newCapital);


                let client = new Spot(u.apiKeyReadOnly, u.secureKeyReadOnly);

                // Get BTCUSDT price
                await client.avgPrice(`BTCUSDT`)
                    .then(async response => {
                        //console.log("AVG PRICE: ", Number((Number(response.data.price)).toFixed(2)));
                        btcusdtPrice = Number((Number(response.data.price)).toFixed(2));
                    })

                // Get EURUSDT price
                await client.avgPrice(`EURUSDT`)
                    .then(async response => {
                        //console.log("AVG PRICE: ", Number((Number(response.data.price)).toFixed(2)));
                        eurusdtPrice = Number((Number(response.data.price)).toFixed(2));
                    })

                // Get BTCEUR price
                await client.avgPrice(`BTCEUR`)
                    .then(async response => {
                        //console.log("AVG PRICE: ", Number((Number(response.data.price)).toFixed(2)));
                        btceurPrice = Number((Number(response.data.price)).toFixed(2));
                    })

                // Get wallet constituents
                const latestAF = await axios.get(
                    `https://123987c444.com/rQ7v9UAskb42CSDvC/api/rebalancingAS/getLatestAFByEmail/${u.email}`,  
                    {
                        httpsAgent: new https.Agent({
                            rejectUnauthorized:false
                        })
                    }
                )

                //console.log("LASTEST AF: ", latestAF.data);
                let constituents = JSON.parse(latestAF.data.balances).sort((a, b) => a.btcValue > b.btcValue ? -1 : 1);
                await constituents.map(async (c, i) => {
                    let constPrice = Number((c.btcValue * btceurPrice).toFixed(2));

                    if (constPrice >= 10) {
                        constituentsString = constituentsString + `${i + 1}. ${c.asset} - ${constPrice}€ <br /> `
                    }
                })

                //console.log("CONSTITUENTS: ", constituentsString);

                // Send email
                const emailContent = await axios.get(
                    `https://123987c444.com/rQ7v9UAskb42CSDvC/api/email/sendFirstRebalancing`,  
                    {
                        httpsAgent: new https.Agent({
                            rejectUnauthorized:false
                        }),
                        data: {
                            email: u.email,
                            firstName: u.firstName,
                            date: moment(new Date()).utcOffset('+0000').format("DD/MM/YYYY"),
                            capitalToRebalance: (capitalToRebalanceUsdt / btcusdtPrice) * btceurPrice,
                            capitalRebalanced: (capitalRebalancedUsdtSell / btcusdtPrice) * btceurPrice,
                            binanceFees: (binanceFees / btcusdtPrice) * btceurPrice,
                            newCapital: (newCapital / btcusdtPrice) * btceurPrice,
                            walletConstituents: constituentsString
                        }
                    }
                )
            }, i * 0.5 * 60 * 1000);
        })
        
    } catch (error) {
        console.log("ERROR in send email first rebalancing ", error);
    }
}

