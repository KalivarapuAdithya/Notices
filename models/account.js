let mongoose = require('mongoose');

let accountSchema = mongoose.Schema({
    email:{
        type:String
    },
    isSub:{
        type:Boolean
    }
    
});

let accounts = module.exports = mongoose.model('accounts' , accountSchema);