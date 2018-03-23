var express = require('express');
var router = express.Router();
var path = require('path').join(__dirname, '..', 'views');
const erp = require('path').join(__dirname, '..','views', 'erp.ejs');

/* GET home page. */
router.get('/', function(req, res, next) {
	res.render('index', { title: 'Express' });
});

router.get('/erp', function(req, res, next) {
	res.render(erp);
});

router.post('/erp', function(req, res, next) {
	if(socket != null) {
		socket.emit("payment", req.body);
	}
	res.send('OK');	
});

let socket;
const SOCKET_CONNECTION = 'connection';
router.initErpIo = function(io) {
	io.on(SOCKET_CONNECTION, function(soc) {
		console.log('client connected');
		socket = soc;
	});
}

module.exports = router;
