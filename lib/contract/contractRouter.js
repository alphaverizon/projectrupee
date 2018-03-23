const express = require('express');
const router = express.Router();
const path = require('path').join(__dirname, '..', '..', 'views')
const contract = require('./contract.js');
const moment = require('moment');

router.get('/login', function(req, res, next) {
	res.render(path + '/login.ejs');
});

router.get('/contractor', function(req, res, next) {
	let user = req.session.user;
	let vpa = req.session.vpa;
	if(!user || !vpa) {
		return res.redirect('/contract/login');	
	}

	let date = req.query.date;
	if(!date) {
		date = moment().format('DDMMYYYY');
	}
	contract.getSubCGroupedData(date, function(data) {
		res.render(path + '/form.ejs', {user: user, vpa: vpa, data:data});
	});
});

router.post('/addEntry', function(req, res, next) {
	promise = new Promise(function(resolve, reject) {
		contract.addEntry(req.body, function(err, data) {
			if(err) {
				reject("Unable to authenticate");
			} else {
				resolve(data);
			}
		})
	})
	res.promise(promise);
});

router.post('/updateCompliance', function(req, res, next) {
	promise = new Promise(function(resolve, reject) {
		contract.updateCompliance(req.body, function(err, data) {
			if(err) {
				reject("Unable to authenticate");
			} else {
				resolve(data);
			}
		})
	})
	res.promise(promise);
});

router.post('/login', function(req, res, next) {
	req.session.user = req.body.user;
	req.session.vpa = req.body.vpa;
	res.send('OK');
});

router.get('/logout', function(req, res, next) {
	delete req.session.user;
	delete req.session.vpa;
	res.redirect('/contract/login');
});

router.post('/getMonthlyReport', function(req, res, next) {
	promise = new Promise(function(resolve, reject) {
		contract.getMonthlyReport(req.body, function(err, data) {
			if(err) {
				reject("Unable to authenticate");
			} else {
				resolve(data);
			}
		})
	})
	res.promise(promise);
});

/* GET home page. */
router.get('/report', function(req, res, next) {
	res.render(path + '/report.ejs');;
});

module.exports = router;