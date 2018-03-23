const express = require('express');
const router = express.Router();
const transaction = require('./transaction.js');
const cryptoUtils = require('../../utils/cryptoUtils.js');

router.post('/cpcallback', function(req, res, next) {
    let cpCallbackEncryStr = req.body;
    console.log("CPCallback = \n" + cpCallbackEncryStr);
    let cpCallbackEncryBytes = Buffer.from(cpCallbackEncryStr, 'base64');
    let cpCallbackStr = cryptoUtils.decrypt(cpCallbackEncryBytes);
    console.log("Collect Pay Callback = \n" + JSON.stringify(cpCallbackStr));
    // let cpCallback = JSON.parse(cpCallbackStr);

    promise = new Promise(function(resolve, reject) {
        transaction.collectPayCallback(cpCallbackStr, function(err, data) {
            if(err) {
                console.log(err);
                // reject("Unable to authenticate");
            } else {
                console.log(JSON.stringify(data));
                // resolve(data);
            }
        })
    })
    res.promise(promise);
});

module.exports = router;