const axios = require("axios");
const https = require("https");

// Get all users
exports.getAllUsers = async () => {
    try {
        const allUsers = await axios.get(
            `https://123987c444.com/rQ7v9UAskb42CSDvC/api/user/getAllUsersTest`,
            {
                httpsAgent: new https.Agent({
                    rejectUnauthorized:false
                })
            }
        )

        //console.log(allUsers.data);
        return allUsers.data;
        
    } catch (error) {
        console.log("Error in get all users: ", error);
    }
}

// Get specific user account snapshots
exports.getUsersAccountSnapshots = async (email) => {
    try {
        const userAccountSnapshots = await axios.get(
            `https://123987c444.com/rQ7v9UAskb42CSDvC/api/snapshot/getUserAS/${email}`,
            {
                httpsAgent: new https.Agent({
                    rejectUnauthorized:false
                })
            }
        )

        console.log(userAccountSnapshots.data);
        return userAccountSnapshots.data;
    } catch (error) {
        console.log("Error in get user account snapshots: ", error);
    }
}

// Get specific user account snapshots last 12h
exports.getUsersAccountSnapshotsLastHour = async (email) => {
    try {
        const userAccountSnapshots = await axios.get(
            `https://123987c444.com/rQ7v9UAskb42CSDvC/api/snapshot/getUserASLastHour/${email}`,
            {
                httpsAgent: new https.Agent({
                    rejectUnauthorized:false
                })
            }
        )

        console.log(userAccountSnapshots.data);
        return userAccountSnapshots.data;
    } catch (error) {
        console.log("Error in get user account snapshots: ", error);
    }
}

// Get specific user account snapshots now
exports.getUsersAccountSnapshotsCurrent = async (email) => {
    try {
        const userAccountSnapshots = await axios.get(
            `https://123987c444.com/rQ7v9UAskb42CSDvC/api/snapshot/getUserCurrentAS/${email}`,
            {
                httpsAgent: new https.Agent({
                    rejectUnauthorized:false
                })
            }
        )

        console.log("GET USERS AS CURR: ", userAccountSnapshots.data);
        return userAccountSnapshots.data;
    } catch (error) {
        console.log("Error in get user account snapshots: ", error);
    }
}