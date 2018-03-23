const Datastore = require('nedb');
const request = require('request');
const http = require('http');
const fs = require('fs');
const _ = require('lodash');
const path = require('path');
const moment = require('moment');
const Excel = require('exceljs');
const BoxSDK = require('box-node-sdk');

const sdk = new BoxSDK({
	clientID: 'lv3xnvpyisuh1u2t7ey2csiv4bywgomg',
	clientSecret: 'c1yY51PWpxPtmODBrA7dT0HUJzpYZk4N'
});
const client = sdk.getBasicClient('P821X4qc8Dv0La8Gia5OcPoRSZW8kyx3');

const nedbPromise = require('../../utils/nedbPromise.js');

const contractdbPromise = new nedbPromise(new Datastore({ filename: path.join(__dirname, 'contract.db'), autoload: true }));

var REPORT_DIR = __dirname;
var REPORT_NAME_PREFIX = "PaymentReport";
var REPORT_NAME_SUFFIX = ".xlsx";

const PAY_PER_DAY = 388;
const DEFAULT_WORKING_HOURS = 8;
const PAY_PER_OVERTIMEHOUR = 90;
const PAY_PENALTY_OVERTIME = 100;

exports.addEntry = function(formDetails, callback) {
	let formEntry = _.cloneDeep(formDetails);
	let workingHours = moment(formEntry.exitTime).diff(moment(formEntry.entryTime), 'hours');
	formEntry.workingHours = workingHours;
	if(workingHours > DEFAULT_WORKING_HOURS) {
		var overtime = workingHours - DEFAULT_WORKING_HOURS;
	} else {
		var overtime = 0;
	}
	let pay = PAY_PER_DAY;
	if(overtime > 0) {
		pay = pay + overtime * PAY_PER_OVERTIMEHOUR;
	}
	var nonCompliance = [formDetails.nonCompliance1, formDetails.nonCompliance2, formDetails.nonCompliance3];
	for(let i = 0; i < nonCompliance.length; i++) {
		if(nonCompliance[i] == 'yes') {
			pay = pay - 100;
		}
	}
	formEntry.pay = pay;
	contractdbPromise.insert(formEntry)
	.then(function(newDoc) {
		console.log(newDoc);
	})
	.catch(function(err) {
		console.log(err.stack);
		return;
	})
	callback(null, 'OK');
}

exports.updateCompliance = function(updateDetails, callback) {
	var select = {};
	select._id = updateDetails.id;
	var set = { nonCompliance1:updateDetails.nc1, 
		nonCompliance2:updateDetails.nc2, 
		nonCompliance3:updateDetails.nc3
	};
	contractdbPromise.update(select, {$set: set})
	.then(function(numReplaced) {
		callback(null, 'OK');
	})
	.catch(function(err) {
		console.log(err.stack);
		callback(err, 'ERR');
	})
}

Array.prototype.getObjectWithKeyValue = function(key, value) {
	for(let i = 0; i < this.length; i++) {
		if(this[i][key] == value) {
			return this[i];
		}
	}
	let obj = {};
	obj[key] = value;
	return this[this.push(obj) - 1];
};

exports.getSubCGroupedData = function(date, callback) {
	let selectQuery = {};
	contractdbPromise.find(selectQuery)
	.then(function(paymentDetails) {
		let subCGroupedList = paymentDetails.reduce(function(tmp, doc) {
			if(moment(doc.entryTime).format('DDMMYYYY') != date) {
				return tmp;
			}
			doc.entryTime = moment(doc.entryTime).format('DD-MM-YYYY HH:mm');
			doc.exitTime = moment(doc.exitTime).format('DD-MM-YYYY HH:mm');
			let subCName = doc.subContractorName;
			let obj = tmp.getObjectWithKeyValue('subContractorName', subCName);
			obj['subContractorVpa'] = doc.subContractorVpa;
			(obj['payment'] = obj['payment'] || []).push(doc);
			return tmp;
		}, []);
		callback(subCGroupedList);
	});
}

exports.getMonthlyReport = function(details, callback) {
	let selectQuery = {};
	contractdbPromise.find(selectQuery)
	.then(function(paymentDetails) {
		let mnthGrpdList = paymentDetails.reduce(function(groupedPay, doc) {
			let MMMYYYY = moment(doc.entryTime).format('MMM/YYYY');
			let obj = groupedPay.getObjectWithKeyValue('month', MMMYYYY);
			(obj['mnthPayment'] = obj['mnthPayment'] || []).push(doc);
			return groupedPay;
		}, []);

		let mnthSubCGrpdList = [];
		for(let i = 0; i < mnthGrpdList.length; i++) {
			let monthlyPay = mnthGrpdList[i];
			let paymentList = monthlyPay['mnthPayment'];
			let subCGrpdList = paymentList.reduce(function(groupedPay, payment) {
				let subCName = payment.subContractorName;
				let obj = groupedPay.getObjectWithKeyValue('subContractorName', subCName);
				(obj['indPayment'] = obj['indPayment'] || []).push(payment);
				obj['subContractorVpa'] = payment.subContractorVpa;
				return groupedPay;
			}, []);

			let mnthlyPayObj = {};
			mnthlyPayObj.month = monthlyPay.month;
			mnthlyPayObj.subCPayment = subCGrpdList

			mnthSubCGrpdList.push(mnthlyPayObj);
		}

		let mSIndGrpdList = [];
		for(let i = 0; i < mnthSubCGrpdList.length; i++) {
			let monthlyPay = mnthSubCGrpdList[i];
			let scPaymentList = monthlyPay['subCPayment'];
			let indScGrpdList = [];
			for(let j = 0; j < scPaymentList.length; j++) {
				let subCGrpdList = scPaymentList[j];
				let indPaymentList = subCGrpdList['indPayment'];
				let indGrpdPay = indPaymentList.reduce(function(groupedPay, payment) {
					let name = payment.name;
					let obj = groupedPay.getObjectWithKeyValue('name', name);
					if(!obj['totalPay']) {obj['totalPay'] = 0}
						obj['totalPay'] = obj['totalPay'] + payment.pay;
					if(!obj['totalWorkingHours']) {obj['totalWorkingHours'] = 0}
						obj['totalWorkingHours'] = obj['totalWorkingHours'] + payment.workingHours;
					if(!obj['totalNonCompliance1']) {obj['totalNonCompliance1'] = 0}
						if(payment.nonCompliance1 ==  "yes"){obj['totalNonCompliance1'] = obj['totalNonCompliance1'] + 1};
					if(!obj['totalNonCompliance2']) {obj['totalNonCompliance2'] = 0}
						if(payment.nonCompliance2 ==  "yes") {obj['totalNonCompliance2'] = obj['totalNonCompliance2'] + 1};
					if(!obj['totalNonCompliance3']) {obj['totalNonCompliance3'] = 0}
						if(payment.nonCompliance3 ==  "yes") {obj['totalNonCompliance3'] = obj['totalNonCompliance3'] + 1};
					return groupedPay;	
				}, []);

				indScGrpEntry = {};
				indScGrpEntry['subContractorName'] = subCGrpdList['subContractorName'];
				indScGrpEntry['subContractorVpa'] = subCGrpdList['subContractorVpa'];
				indScGrpEntry['indPayment'] = indGrpdPay;
				indScGrpdList.push(indScGrpEntry);
			}
			mSIndGrpdList.push({month: monthlyPay.month, payment: indScGrpdList});
		}

		console.log(mSIndGrpdList);

		var filePath = REPORT_DIR + '/' + REPORT_NAME_PREFIX + REPORT_NAME_SUFFIX;
		writeFile(mSIndGrpdList, filePath)
		.then(function() {
			uploadFile(filePath)
			.then(function(fileDetails) {
				callback(null, 'OK');
				notifyFlow(fileDetails);
			})
			.catch(function(error) {
				callback('ERR', null);
			});
		})

	})
	.catch(function(err) {
		console.log(err.stack);
	});
}

const URL_FLOW = 'https://prod-17.centralindia.logic.azure.com:443/workflows/0d4f668ee65042a8965a4420a3393595/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=C_qe0rowGye1lusiXAXGJQVwitWwpN2wCePZPSKrWts';
function notifyFlow(fileDetails) {
	let flowData = {};
	flowData.fileId = fileDetails.fileId;
	flowData.fileName = fileDetails.fileName;
	request.post({
		url: URL_FLOW,
		headers: {
			'Content-Type': 'application/json'
		},
		json : flowData
	}, function(err, response, body) {
		if (err){
			console.log(err.stack); 
			return; 
		}
		if(response.statusCode == 200 || response.statusCode == 202) {
			console.log(JSON.stringify(body)); 
		}
	});
}


function writeFile(mnthSubCGrpdList, filePath) {
	return new Promise(function(resolve, reject) {
		var workbook = new Excel.Workbook();
		var sheet = workbook.addWorksheet('Pay details');
		sheet.getRow(1).font = {bold: true};
		sheet.columns = [
		{ header: 'Name', key: 'name'},
		{ header: 'Total Pay', key: 'pay'},
		{ header: 'Hours Worked', key: 'hours'},
		{ header: 'Non Compliance 1', key: 'nc1'},
		{ header: 'Non Compliance 2', key: 'nc2'},
		{ header: 'Non Compliance 3', key: 'nc3'}
		];

		for(let i = 0; i < mnthSubCGrpdList.length; i++) {
			let month = mnthSubCGrpdList[i]['month'];
			let payment = mnthSubCGrpdList[i]['payment'];
			for(let j = 0; j < payment.length; j++) {
				let subCPayment = payment[j];
				sheet.addRow([subCPayment.subContractorName, subCPayment.subContractorVpa]);
				let indPayment = subCPayment.indPayment;
				for(let k = 0; k < indPayment.length; k++) {
					let name = indPayment[k]['name'];
					let workingHours = indPayment[k]['totalWorkingHours'];
					let pay = indPayment[k]['totalPay'];
					let nonCompliance1 = indPayment[k]['totalNonCompliance1'];
					let nonCompliance2 = indPayment[k]['totalNonCompliance2'];
					let nonCompliance3 = indPayment[k]['totalNonCompliance3'];

					sheet.addRow({name:name, pay:pay, hours:workingHours, nc1:nonCompliance1, nc2:nonCompliance2, nc3:nonCompliance3});
				}
			}
			sheet.addRow(Array(6));
		}

		workbook.xlsx.writeFile(filePath)
		.then(function() {
			resolve();
		})
		.catch(function(error) {
			reject(error);
		});
	})
}


function uploadFile(filePath, callback) {
	return new Promise(function (resolve, reject) {
		// var filePath = '/home/ketan/Desktop/workbook.xlsx';
		var xlsxFile = fs.createReadStream(filePath);
		var fileName = 'test_' + Math.floor((Math.random() * 100) + 1) + '.xlsx';
		client.files.uploadFile('31941310817', fileName, xlsxFile, function (errFile, file) {
			if (errFile) {
				reject(errFile);
			} else {
				var fileDetails = {};
				fileDetails.fileId = file.entries[0].id;
				fileDetails.fileName = fileName;
				resolve(fileDetails);
			}
		});
	})
}