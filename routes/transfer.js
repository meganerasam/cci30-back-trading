const express = require('express');
const { transfer } = require("../controller/transfer");

const router = express.Router();

router.get("/transfer", transfer);

module.exports = router;