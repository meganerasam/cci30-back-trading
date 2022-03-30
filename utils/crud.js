const axios = require("axios");
const moment = require("moment");
const https = require("https");

exports.find = async (table, condition_param, condition_value) => {

    const response = await axios.get(
        `https://123987c444.com/rQ7v9UAskb42CSDvC/api/crud/find`,  
        {
            httpsAgent: new https.Agent({
                rejectUnauthorized:false
            }),
            data: {
                table,
                condition_param,
                condition_value
            }
        }
    )

    return response.data;
   
}

exports.update = async (variable_array, table, columns, condition_param, condition_value) => {

    const response = await axios.get(
        `https://123987c444.com/rQ7v9UAskb42CSDvC/api/crud/update`,  
        {
            httpsAgent: new https.Agent({
                rejectUnauthorized:false
            }),
            data: {
                variable_array,
                table,
                columns,
                condition_param,
                condition_value
            }
        }
    )

    //return response[0];

   
}

exports.insert = async (variable_array, table, columns) => {

    const response = await axios.get(
        `https://123987c444.com/rQ7v9UAskb42CSDvC/api/crud/insert`,  
        {
            httpsAgent: new https.Agent({
                rejectUnauthorized:false
            }),
            data: {
                variable_array,
                table,
                columns,
              
            }
        }
    )

    //return response[0];

   
}