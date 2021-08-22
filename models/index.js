const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGOURL , { useNewUrlParser: true  , useUnifiedTopology: true});
mongoose.Promise = Promise;

module.exports.account = require('./account');