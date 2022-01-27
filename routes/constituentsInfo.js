const express = require('express');
const { getConstituentsInfo } = require("../controller/constituentsInfo");

const router = express.Router();

router.get("/getAll", getConstituentsInfo);

module.exports = router;