require('dotenv-extended').load()
const {
    getAuthToken,
    getSpreadSheetValues
} = require('./googleSheetsService.js');
const axios = require('axios');

const spreadsheetId = process.env.WEIGHT_SHEET_ID;
const sheetName = process.env.WEIGHT_SHEET_NAME;

// 1. Get weight of each constituent from Google Sheets
// 2. Fetch market cap of the laters from CoinMarketCap
// 3. Display value

exports.getCCi30Info = async () => {
    let constituentsInfoArray = [];

    try {
        // Get all constituents name from Google Sheet
        const auth = await getAuthToken();
        const responseGS = await getSpreadSheetValues({
            spreadsheetId,
            sheetName,
            auth
        })

        for (let i = 0; i < 30; i++) {
            let tempObject = {
                slug: responseGS.data.values[i][1],
                asset: responseGS.data.values[i][4],
                weight: Number(((responseGS.data.values[i][3]).slice(0, -1)).replace(",", ".")),
            }

            constituentsInfoArray.push(tempObject);
        }

        return constituentsInfoArray;

    } catch (error) {
        console.log(error.message, error.stack);
    }
}