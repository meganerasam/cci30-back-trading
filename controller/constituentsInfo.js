const { constituents } = require("../other/cci30");

exports.getConstituentsInfo = async () => {
    try {
        // Variables
        let constituentsInfoArray = [];

        constituents.map(async (c) => {
            let tempObj = {
                slug: c.name,
                asset: c.asset,
                weight: Number(c.percentage)
            }

            constituentsInfoArray.push(tempObj);
        })

        console.log(constituentsInfoArray);
        return constituentsInfoArray;
    } catch (error) {
        console.log("Error in get constituents info: ", error);
    }
}