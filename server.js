const express = require('express');
require('dotenv-extended').load()
const connectDB = require('./config/db');

// Connect Database
connectDB();

const app = express();

// Init Middleware
app.use(express.json());

//Define Routes 
app.use('/api/rebalancing', require('./routes/rebalancing'));

app.get('/', (req, res) => res.json({ msg: 'Welcome to the Trading Crypto Bulot...' }));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
