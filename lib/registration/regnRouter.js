const express = require('express');
const router = express.Router();
const registration = require('./registration.js')

router.post('/notifyFeePayInit', function(req, res, next) {
		promise = new Promise(function(resolve, reject) {
		registration.feePayInit(req.body, function(err, data) {
			if(err) {
				reject(err);
			} else {
				resolve(data);
			}
		})
	})
	res.promise(promise);
});

router.post('/initPayment', function(req, res, next) {
	promise = new Promise(function(resolve, reject) {
		registration.initPayment(req.body, function(err, data) {
			if(err) {
				reject(err);
			} else {
				resolve(data);
			}
		})
	})
	res.promise(promise);
});

router.post('/notifyPayReceipt', function(req, res, next) {
	promise = new Promise(function(resolve, reject) {
		registration.notifyPayReceipt(req.body, function(err, data) {
			if(err) {
				reject(err);
			} else {
				resolve(data);
			}
		})
	})
	res.promise(promise);
});

module.exports = router;