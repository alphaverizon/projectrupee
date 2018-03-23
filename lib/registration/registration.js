const Datastore = require('nedb');
const request = require('request');
const http = require('http');
const fs = require('fs');
const querystring = require('querystring');
const transaction = require('../gateway/transaction.js')
const _ = require('lodash');
const path = require('path');

const winston = require('winston');
const tsFormat = () => (new Date()).toLocaleTimeString();
const logger = new(winston.Logger)({
    transports: [
    new(winston.transports.Console)({
        timestamp: tsFormat,
        colorize: true
    })
    ]
});
logger.level = 'silly';

const router_models = require('../../models/router_models.js');
const nedbPromise = require('../../utils/nedbPromise.js');

const regndbPromise = new nedbPromise(new Datastore({ filename: path.join(__dirname, 'registration.db'), autoload: true }));

const URL_SHAREPOINT_INITFEEPAY = 'https://prod-09.centralindia.logic.azure.com:443/workflows/6c2afa0b589248ff8c9680621e18806c/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=LluX07g33JW0M9G7189qDRb5CbClbdr9oizczzulG0Y';
const URL_SHAREPOINT_UPDATEFEEPAY = 'https://prod-21.centralindia.logic.azure.com:443/workflows/0095b84aa5c64f3ca54e21a8539519e4/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=lUEi73MIidre3PRfywVucQRmL5fgm1lxpTXH83c593U';

exports.feePayInit = function(feePaymentDetails, cb) {
	initFeePaymentSharepoint(feePaymentDetails)
	.then(function(response) {
		return cb(null, "Success");
	}).catch(function(err) {
		return cb("Error initiating");
	});
}

exports.updateFeePay = function(feePaymentDetails, cb) {
	updateFeePaySharepoint(feePaymentDetails)
	.then(function(response) {
		cb(null, 'Success');
	}).catch(function(err) {
		cb("Error Updating");
	})
}

function initFeePaymentSharepoint(feePaymentDetails) {
	return new Promise((resolve, reject) => {
		let initFeePaymentPayload = new InitFeePaymentSharepoint(feePaymentDetails);
		request.post({
			url: URL_SHAREPOINT_INITFEEPAY,
			headers: {
				'Content-Type': 'application/json'
			},
			json : initFeePaymentPayload
		}, function(err, response, body) {
			if (err){
				logger.warn('Sharepoint payment init error for id: '+ feePaymentDetails.merchantTranId + ' : ' + err.stack); 
				return reject(err); 
			}
			if(response.statusCode == 200 || response.statusCode == 202) {
				logger.debug('Sharepoint payment initiated for Txid: ' + feePaymentDetails.merchantTranId);
				return resolve(body); 
			}
		});
	})
}

function updateFeePaySharepoint(feePayUpdateDetails) {
	return new Promise((resolve, reject) => {
		let updateFeePaymentPayload = new UpdateFeePaymentSharepoint(feePayUpdateDetails);
		request.post({
			url: URL_SHAREPOINT_UPDATEFEEPAY,
			headers: {
				'Content-Type': 'application/json'
			},
			json : updateFeePaymentPayload
		}, function(err, response, body) {
			if (err){
				logger.warn('Sharepoint payment update error for id: '+ feePayUpdateDetails.merchantTranId + ' : ' + err.stack); 
				return reject(err); 
			}
			if(response.statusCode == 200 || response.statusCode == 202) {
				logger.debug('Sharepoint payment updated for Txid: ' + feePayUpdateDetails.merchantTranId);
				return resolve(body)
			}
		});
	})
}

function InitFeePaymentSharepoint(payment) {
	this.merchantTranId = payment.merchantTranId;
	this.messcardNo = payment.messcardNo;
	this.name = payment.name;
	this.amount = payment.amount;
	this.payerVa = payment.payerVa;
	this.month = payment.month;
	this.timestamp = payment.timestamp;
	this.paymentType = payment.paymentType;
	this.status = payment.status;
}

function UpdateFeePaymentSharepoint(payment) {
	this.merchantTranId = payment.merchantTranId;
	this.status = payment.status;
}