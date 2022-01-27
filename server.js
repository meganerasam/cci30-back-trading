const express = require('express');
require('dotenv-extended').load();
const https = require("https");
const path = require("path");
const fs = require("fs");
const connectDB = require('./config/db');

// Connect Database
connectDB();

const app = express();

// Init Middleware
app.use(express.json());

//Define Routes 
app.use('/api/client', require('./routes/auth'));
app.use('/api/rebalancingMongo', require('./routes/rebalancingMongo'));
app.use('/api/manual', require('./routes/manualRebalanicing'));
app.use('/api/transfer', require('./routes/transfer'));
app.use('/api/users', require('./routes/usersInfo'));
app.use('/api/constituents', require('./routes/constituentsInfo'));
app.use('/api/rebalancing', require('./routes/rebalancing'));

app.get('/', (req, res) => res.json({ msg: 'Welcome to the Trading Crypto Bulot...' }));

const PORT = process.env.PORT || 5000;

/*const sslServer = https.createServer({
    key: fs.readFileSync(path.join(__dirname, 'cert', 'key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'cert', 'cert.pem'))
}, app);*/

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
