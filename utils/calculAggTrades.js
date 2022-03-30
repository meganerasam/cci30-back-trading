const { find } = require("./crud")

exports.Other_USDT = async( m, client , req, res)=>{
    try {

        let  totalWalletUsdt ;

        if(m.asset =="USDT"){

            return m.free

        }else{

        //check ind db (table, condition_param, condition_value)
        const table = "usdt_no_pairs";
        const condition_param = "asset";
        const condition_value =`${m.asset}`
        const caoin_asset = await find(table, condition_param, condition_value);

        //get agg trade with usdt

        await client.aggTrades(`${b.asset}USDT`, { 
            limit: 1000
        })
            .then(async (response) => {
              
                let price = 0;
                
                await response.data.map(async (r, i) => {
                    price = price + Number(r.p);
                })

                let avgPrice = price / (response.data).length;
                let assetValue = Number(b.free) * Number(avgPrice);

                if (b.asset){
                    totalWalletUsdt = totalWalletUsdt + assetValue;
                }

            })
            .catch(error => client.logger.error(error))



        }
       
        
    } catch (error) {

        const table = "usdt_no_pairs";
        const columns = "asset";
        const variable_array =`${m.asset}`;
        const caoin_asset = await find(variable_array, table, columns);

        //inser in usdt_no_pairs
        
    }
}