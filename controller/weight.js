require('dotenv-extended').load()
const {
    getAuthToken,
    getSpreadSheet,
    getSpreadSheetValues
} = require('./googleSheetsService.js');

const spreadsheetId = process.env.WEIGHT_SHEET_ID;
const sheetName = process.env.WEIGHT_SHEET_NAME;

exports.getSpreadSheet = async (req, res, next) => {
    try {
        const auth = await getAuthToken();
        const response = await getSpreadSheet({
            spreadsheetId,
            auth
        })
        console.log('output for getSpreadSheet', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.log(error.message, error.stack);
    }
}

exports.getSpreadSheetValues = async (req, res, next) => {
    try {
        const auth = await getAuthToken();
        const response = await getSpreadSheetValues({
            spreadsheetId,
            sheetName,
            auth
        })
        console.log('output for getSpreadSheetValues', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.log(error.message, error.stack);
    }
}