const { getAllUsers, getUsersAccountSnapshotsCurrent, getUsersAccountSnapshotsCurrentAndUpdate } = require("./usersInfo");
const axios = require("axios");
const moment = require("moment");
const https = require("https");
const { rebalancingTransfer, rebalancingFirstSingle } = require("../controller/rebalancing");
const { getConstituentsInfo } = require("./constituentsInfo");
const { Spot } = require('@binance/connector');
const { argv0 } = require("process");
const { find, update } = require("../utils/crud");
const { response } = require("express");

const calculateTotalDeposit = async (u, transactions) => {
    //console.log("TRANS: ", transactions);
    const client = new Spot(u.apiKeyReadOnly, u.secureKeyReadOnly);

    let total = 0;
    let totalArray = [];
    let test = await transactions.map(async (t, i) => {
        if (t.differencesValueUsdt == "" || Number(t.differencesValueUsdt) == 0) {
            //console.log(JSON.parse(t.differences));

            let arrayOfDeposit = JSON.parse(t.differences);
            let endTime = moment(t.createdAt).format('x');
            let startTime = moment(t.createdAt).subtract(55, 'minutes').format('x');

            let test2 = await arrayOfDeposit.map(async (a, j) => {
                if (
                    a.asset != "USDT" &&
                    a.asset != "SOLO" &&
                    a.asset != "BOBA" &&
                    a.asset != "NFT" &&
                    a.asset != "TNT" &&
                    a.asset != "GLM" &&
                    a.asset != "BETH" &&
                    a.asset != "EASY" &&
                    a.asset != "SGB" &&
                    a.asset != "LDLIT" &&
                    a.asset != "LDUSDT" &&
                    a.asset != "LDBNB" &&
                    a.asset != "LDCAKE" &&
                    a.asset != "LDCHZ" &&
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
                        startTime,
                        endTime
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
                                //totalArray.push(Number(total.toFixed(2)))
                                //totalUsdtArray.push({"name": b.asset, "value": assetValue});
                                //console.log("TEST 1: ", totalDepositUsdt);
                            }
    
                            //console.log("ASSET: ", b.asset, " PRICE: ", price / (response.data).length, " VALUE: ", assetValue, " TOTAL: ", totalWalletUsdt);
                        })
                        .catch(error => client.logger.error(error))
                } else if (a.asset == "USDT") {
                    total = total + Number(a.free);
                }
            })
            await Promise.all(test2).then(async () => {
                //console.log("TOTAL 2: ", u.id, total);
            })
        } else {
            total = Number(t.differencesValueUsdt);
        }
    })

    let ret = await Promise.all(test).then(async () => {
        //console.log("TOTAL: ", total);
        return Number(total.toFixed(2));
    })

    return ret;
}

// Calculate BF - END PERIOD
exports.addBeforeRebalancingAccountsnapshot = async () => {
    try {
        // Variables
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
                console.log("USER: ", u.id);

                // Inner varaibles
                let balances = [];
                let newCapitalUsdt;
                let totalWalletUsdt = 0;
                let totalWalletBtc = 0;
                let totalWalletEur = 0;

                // Connect to Binance 
                let client = new Spot(u.apiKeyReadOnly, u.secureKeyReadOnly);
            
                // Get user current wallet
                await client.account()
                    .then(async (response) => {
                        await response.data.balances.map(async (b) => {
                            if (
                                b.asset != "SOLO" &&
                                b.asset != "NFT" &&
                                b.asset != "EASY" &&
                                b.asset != "VRT" &&
                                b.asset != "BRD" &&
                                b.asset != "TNT" &&
                                b.asset != "BETH" &&
                                b.asset != "BOBA" &&
                                b.asset != "DON" &&
                                b.asset != "ETF" &&
                                b.asset != "BCD" &&
                                b.asset != "LDUSDT" &&
                                b.asset != "LDBNB" &&
                                b.asset != "LDCAKE" &&
                                b.asset != "LDFTM" &&
                                b.asset != "LDMANA" &&
                                b.asset != "LDSHIB2" &&
                                b.asset != "LDCHZ" &&
                                b.asset != "LDLIT" &&
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
                        b.asset != "BOBA" &&
                        b.asset != "TNT" &&
                        b.asset != "CND" &&
                        b.asset != "GLM" &&
                        b.asset != "LOOM" &&
                        b.asset != "EASY" &&
                        b.asset != "NSBT" &&
                        b.asset != "VRT" &&
                        b.asset != "SNT" &&
                        b.asset != "TNT" &&
                        b.asset != "SGB" &&
                        b.asset != "PURSE" &&
                        b.asset != "LDUSDT" &&
                        b.asset != "LDBNB" &&
                        b.asset != "LDLIT" &&
                        b.asset != "LDCAKE" &&
                        b.asset != "LDFTM" &&
                        b.asset != "LDMANA" &&
                        b.asset != "LDCHZ" &&
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

                await Promise.all(newCapitalUsdt).then(async () => {
                    console.log("TOTAK: ", totalWalletUsdt);
                    //console.log("BALANCES: ", balances);

                    await client.aggTrades(`BTCUSDT`, { 
                        limit: 1000
                    })
                        .then(async (response) => {
                            //console.log("ASSET: ", b.asset, " PRICE 1: ", response.data[0].p);
                            let price = 0;
                            
                            await response.data.map(async (r, i) => {
                                price = price + Number(r.p);
                            })

                            let avgPrice = price / (response.data).length;
                            totalWalletBtc = totalWalletUsdt / Number(avgPrice);
    
                            //console.log("ASSET: ", b.asset, " PRICE: ", price / (response.data).length, " VALUE: ", assetValue, " TOTAL: ", totalWalletUsdt);*/
                        })
                        .catch(error => client.logger.error(error))

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
                                totalWalletEur = totalWalletUsdt / Number(avgPrice);
                                console.log("TOTAL EUR: ", totalWalletEur);
        
                                //console.log("ASSET: ", b.asset, " PRICE: ", price / (response.data).length, " VALUE: ", assetValue, " TOTAL: ", totalWalletUsdt);*/
                            })
                            .catch(error => client.logger.error(error))
                })

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
                            timing: "BF - END PERIOD",
                            totalAssetOfBtc: Number((totalWalletBtc).toFixed(8)),
                            totalAssetOfUsdt: Number((totalWalletUsdt).toFixed(2)),
                            totalAssetOfEur: Number((totalWalletEur).toFixed(2)),
                            balances
                        }
                    }
                )

                console.log("END RAS: ", newRAS.data);

        }, i * 0.05 * 60 *1000);

        })    
    } catch (error) {
        console.log("ERROR in get all orders for this month: ", error);
    }
}

// Calculate PNL
exports.pnl = async () => {
    try {
        // Variables
        let allUsers;

        const callPromises = await Promise.all([
            // 1. Get all users from DB
            getAllUsers()
        ]);

        allUsers = callPromises[0];
        //console.log("ALL USERS: ", allUsers);

        // Loop through all users and rebalance their wallet
        await allUsers.map(async (u, i) => {
            setTimeout(async () => {
                // Inner variables
                let cryptoAndPrice = [];
                let balances = [];
                
                // Get latest AF - START PERIDO to get the last quantity of each crypto in user account
                const latestAF = await axios.get(
                    `https://123987c444.com/rQ7v9UAskb42CSDvC/api/rebalancingAS/getLatestAFByEmail/${u.email}`,  
                    {
                        httpsAgent: new https.Agent({
                            rejectUnauthorized:false
                        })
                    }
                )

                const latestAFDate = latestAF.data.createdAt;
                //const latestAFBalances = JSON.parse(latestAF.data.balances);
                const latestAFTotalUsdt = latestAF.data.totalAssetOfUsdt;
                console.log("LATEST AF DATE: ", latestAFDate);
                console.log("LATEST AF USDT: ", latestAFTotalUsdt);

                // Get latest BF - END PERIOD to get the last quantity of each crypto in user account
                const latestBF = await axios.get(
                    `https://123987c444.com/rQ7v9UAskb42CSDvC/api/rebalancingAS/getLatestBFByEmail/${u.email}`,  
                    {
                        httpsAgent: new https.Agent({
                            rejectUnauthorized:false
                        })
                    }
                )

                const latestBFDate = latestBF.data.createdAt;
                const latestBFTotalUsdt = latestBF.data.totalAssetOfUsdt;

                console.log("LATEST BF USDT: ", latestBFTotalUsdt);

                // Connect to Binance account
                const client = new Spot(u.apiKeyReadOnly, u.secureKeyReadOnly);

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

                let totalWalletUsdt = 0;

                    if (latestAF.data) {
                        let allTransactions = await axios.get(
                            `https://123987c444.com/rQ7v9UAskb42CSDvC/api/snapshotComparison/getDifferencesBetweenTwoDates`,  
                            {
                                httpsAgent: new https.Agent({
                                    rejectUnauthorized:false
                                }),
                                data: {
                                    id: u.id,
                                    date1: latestAFDate
                                }
                            }
                        )

                        //console.log("ALL TRANSACTIONS: ", allTransactions.data)

                        // Loop through all new asset deposited inside the user account
                        let totalDepositUsdt = 0;

                        if ((allTransactions.data).length > 0) {
                            totalDepositUsdt = await calculateTotalDeposit(u, allTransactions.data);
                            console.log("TOTAL DEPOSIT: ", totalDepositUsdt);

                            let profit = Number(latestBFTotalUsdt) - latestAFTotalUsdt - totalDepositUsdt;
                            console.log("BF TOTAL - AF TOTAL: ", Number(latestBFTotalUsdt) - latestAFTotalUsdt);
                            console.log("ALL: ", latestAFTotalUsdt, Number(latestBFTotalUsdt), profit);

                            let five_percent = 0;
                            //let status = 0;
                            if (profit > 0) {
                                five_percent = profit * 0.05;
                            }

                            // If 5% < 12 USDT, put it for next month with status active (= 1)
                            /*if (five_percent < 12  && five_percent != 0) {
                                status = 1
                            }*/

                            console.log("FULL TEST: ",  Number(totalDepositUsdt), 0, profit, five_percent)

                            /*let pnl = await axios.get(
                                `https://123987c444.com/rQ7v9UAskb42CSDvC/api/pnl/add/${u.email}`,  
                                {
                                    httpsAgent: new https.Agent({
                                        rejectUnauthorized:false
                                    }),
                                    data: {
                                        deposit: Number(totalDepositUsdt.toFixed(2)),
                                        withdrawal: 0,
                                        pnl: Number(profit.toFixed(2)),
                                        five_percent: Number(five_percent.toFixed(2)),
                                        status: 1
                                    }
                                }
                            )*/
                        } else {
                            let profit = Number(latestBFTotalUsdt) - latestAFTotalUsdt;

                            let five_percent = 0;
                            //let status = 0;

                            if (profit > 0) {
                                five_percent = profit * 0.05;
                            }

                            // If 5% < 12 USDT, put it for next month with status active (= 1)
                            /*if (five_percent < 12 && five_percent != 0) {
                                status = 1
                            }*/
                            
                            console.log("FULL TEST NO TRANSACTIONS: ", Number(totalDepositUsdt), 0, profit, five_percent)

                            /*let pnl = await axios.get(
                                `https://123987c444.com/rQ7v9UAskb42CSDvC/api/pnl/add/${u.email}`,  
                                {
                                    httpsAgent: new https.Agent({
                                        rejectUnauthorized:false
                                    }),
                                    data: {
                                        deposit: Number(totalDepositUsdt.toFixed(2)),
                                        withdrawal: 0,
                                        pnl: Number(profit.toFixed(2)),
                                        five_percent: Number(five_percent.toFixed(2)),
                                        status: 1
                                    }
                                }
                            )*/
                        }
                    }
            }, i * 0.1 * 60 * 1000);
        })

    } catch (error) {
        console.log("Error in transfer function: ", error)
    }
}

// Make SELL orders to get liquidity for transfer
// Start rebalancing process
exports.placeSellOrders = async () => {
    try {
        await rebalancingTransfer();
    } catch (error) {
        console.log("ERROR IN TRANSFERT - SELL ORDER: ", error)
    }
}

exports.updateWithdrawDetails = async(req, res)=>{

    try {
    
        //get all
        const condition_param = "withdraw_detail";
        const condition_value= "0";
        const data = await find("transfer_history" , condition_param , condition_value);

        if(data.length > 0 ){

            data.map(async(d,i)=>{
                const condition_param = "id";
                const condition_value= `${d.uid}`;
                const user_details = await find("user" , condition_param , condition_value);

                await Promise.all(user_details).then(async()=>{
                    const client = new Spot(user_details[0].apiKeyReadOnly , user_details[0].secureKeyReadOnly);

                    /*const result =  await client.withdrawHistory(
                        {
                           coin: 'USDT',
                           status: 6,
     
                       }
                        )

                        console.log(result.data)*/



                await client.withdrawHistory(
                    {
                        coin: 'USDT',
                        status: 6,

 
                    }
                    ).then(async(response)=>{
                    //response => client.logger.log(response.data)

 
                        const result_withdraw = response.data;
                        console.log("LENGHT" , result_withdraw.length)

                        if(result_withdraw.length>0){
                            result_withdraw.map(async(r,i)=>{
                                console.log("r" , r)
                                const table_update ="transfer_history";
                                const variable_array_update =`${JSON.stringify(r)}`;
                                const columns_update = "withdraw_detail";
                                const condition_param_update = "withdraw_order_id|uid";
                                const condition_value_update = `${d.withdraw_order_id}|${d.uid}`;

                                if(r.id == d.withdraw_order_id){
                                    await update(variable_array_update, table_update, columns_update, condition_param_update, condition_value_update);
                                }
                            
                              /* console.log("Withdraw details updated" , condition_value_update)
        
                                console.log(variable_array_update)*/



                            })
                        }
                       
                    }
                        
                        
                      )
                    .catch(error => client.logger.error(error))


                   
                })

               

            })
         
 
        }

  //res.status(200).json({message:""})
        
    } catch (error) {
        console.log("ERROE IN updateWithdrawDetails ")
    }
}

exports.rebalancingOK = async(req, res)=>{

    try {
      
        let user_email = req.body.email;

        const condition_param = "email";
        const condition_value =`${user_email}`
        const response_user = await find("user", condition_param, condition_value);

        const user =  response_user[0];
        const user_id = response_user[0].id

        //get user account
       const balances = await getUsersAccountSnapshotsCurrentAndUpdate(user_email);

        //console.log("TT", balances.array_balances)

      //insert into bf

     const newRAS = await axios.get(
        `https://123987c444.com/rQ7v9UAskb42CSDvC/api/rebalancingAS/add`,  
        {
            httpsAgent: new https.Agent({
                rejectUnauthorized:false
            }),
            data: {
                uid: user_id,
                updateTime: moment(new Date()).utcOffset('+0000').format("x"),
                date: moment(new Date()).utcOffset('+0000').format("DD/MM/YYYY"),
                month: moment(new Date()).utcOffset('+0000').format("MM"),
                year: moment(new Date()).utcOffset('+0000').format("YYYY"),
                timing: "BF - END PERIOD",
                totalAssetOfBtc: Number((balances.sum_btc)),
                totalAssetOfUsdt: Number((balances.sum_usdt)),
                totalAssetOfEur: Number((balances.sum_eur)),
                balances : JSON.parse(balances.array_balances)
            }
        }
    )

 //await Promise.all(balances ).then(async (req, res)=>{

        //search if br and af > 1
        const table = "rebalancing_account_snapshot";
        const condition_param_bf_af = "timing,uid";
        const condition_value_bf =`BF - END PERIOD,${user_id}`
        const result_bf = await find(table, condition_param_bf_af, condition_value_bf);
    
        const condition_value_af =`AF - START PERIOD,${user_id}`
        const result_af = await find(table, condition_param_bf_af, condition_value_af);

    
        console.log("BF" , result_bf.length , "AF" , result_af.length );



        if(result_bf.length > 1 && result_af.length > 1){
            await rebalancingFirstSingle(user ,balances)

            //console.log("BF sfdsgdsg" , balances)
        }

        //console.log("ALL " , allConstituents );


        
    //})

res.status(200);
        
    } catch (error) {
        console.log("ERROR IN REBALANCING OK" , error)
        res.status(500)
    }


}