const express = require('express');
const { getAllUsers, getUsersAccountSnapshots } = require("../controller/usersInfo");

const router = express.Router();

router.get("/getUsers", getAllUsers);
router.get("/getUserAC", getUsersAccountSnapshots);

module.exports = router;