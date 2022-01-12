const express = require('express');
const { newClient } = require("../controller/auth");

const router = express.Router();

router.post("/add", newClient);

module.exports = router;