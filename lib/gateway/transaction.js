const Datastore = require('nedb');
const request = require('request');
const path = require('path');
const moment = require('moment');

const server = require('../../bin/www');
const routerModels = require('../../models/router_models.js');
const nedbPromise = require('../../utils/nedbPromise.js');
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

const cryptoUtils = require('../../utils/cryptoUtils.js');
const registration = require('../registration/registration.js');

const txDbPromise = new nedbPromise(new Datastore({ filename: path.join(__dirname, 'transactions.db'), autoload: true }));

const URL_UPI_COLLECTPAY_UAT = 'https://apigwuat.icicibank.com:8443/api/MerchantAPI/UPI/v2/CollectPay/110812';
//const URL_UPI_COLLECTPAY_PROD = 'https://api.icicibank.com:8443/api/MerchantAPI/UPI/v2/CollectPay/131122'; 
const URL_UPI_COLLECTPAY_PROD = 'https://api.icicibank.com:8443/api/MerchantAPI/UPI/v2/CollectPay/166878';
const URL_SHAREPOINT_PAYMENT = 'https://prod-09.centralindia.logic.azure.com:443/workflows/6c2afa0b589248ff8c9680621e18806c/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=LluX07g33JW0M9G7189qDRb5CbClbdr9oizczzulG0Y'

const SOCKET_CONNECTION = 'connection';
const SOCKET_DISCONNECTED = 'disconnect';
const SOCKET_UPDATE_SOCKET = 'updateSocket';
const SOCKET_EVENT_INITTX = 'initTransaction';
const SOCKET_NOTIFY_PULLREST = 'notifyPullToClient';
const SOCKET_NOTIFY_TX = 'notifyTx';
const SOCKET_NOTIFY_TXCOMPLETE = 'notifyTxComplete';

const SERVER_RESP_OK = 'OK';
const SERVER_RESP_SUCCESS = 'SUCCESS';

const TXSTAT = {
    INIT: 'INIT',
    PULLED: 'PULLED',
    PAID: 'PAID',
    ERR: 'ERR'
};

const USERSTAT = {
    CONNECTED: 'CONNECTED',
    DISCONNECTED: 'DISCONNECTED'
};

let clients = {};

exports.initIo = function(io) {
    io.on(SOCKET_CONNECTION, function(socket) {
        //session for future usecases involving express
        let session = socket.request.session;
        test = session.sessionId;
        registerInitTx(socket);
        registerSessionTracker(socket);
        registerDisconnectListener(socket);

        logger.debug('Client connected: ' + socket.id);
    });
}

function registerSessionTracker(socket) {
    socket.on(SOCKET_UPDATE_SOCKET, function(sId, callback) {
        let select = { sessionId: sId }
        let clientDetails = {};
        clientDetails.client = socket.id;
        clientDetails.userStatus = USERSTAT.CONNECTED;
        let set = { $set: clientDetails }
        txDbPromise.update(select, set)
        .then(function(numReplaced) {
            clients[sId] = socket;
            logger.debug('Session: ' + sId + ' Client updated to: ' + socket.id)
            logger.debug('Entries replaced: ' + numReplaced);
        }).catch(function(err) {
            logger.warn(err.stack);
        });
    });
}

function registerInitTx(socket) {
    socket.on(SOCKET_EVENT_INITTX, function(collectPayRequestStr) {
        let sessionId = socket.handshake.query.sessionId;
        let collectPayTx = JSON.parse(collectPayRequestStr);
        collectPayTx.status = TXSTAT.INIT;
        collectPayTx.client = socket.id;
        //These go into the session layer
        collectPayTx.sessionId = sessionId;
        collectPayTx.userStatus = USERSTAT.CONNECTED;
        //These go into the session layer
        logger.silly('Inititaing collectPay: ', JSON.stringify(collectPayTx));
        txDbPromise.insert(collectPayTx)
        .then(function(collectPayTx) {
            clients[sessionId] = socket;
            callCollectApi(collectPayTx);
        }).catch(function(err) {
            logger.warn(err.stack);
            socket.broadcast.to(socket.id).emit('initTxResponse', new routerModels.WebResponseWrapper('ERR', err, 'Error storing tx'));
        })
    })
}

function callCollectApi(payment) {
    let collectPay = new CollectPay(payment);
    logger.debug("Calling CollectPay with params: " + JSON.stringify(collectPay));
    let payload = cryptoUtils.encryptAndEncode(JSON.stringify(collectPay));
    logger.silly('CollectPay payload: ' + payload);
    let headers = {
        'Content-Type': 'text/plain;charset=UTF-8',
        'accept': '*/*',
        'accept-encoding': '*',
        'accept-language': 'en-US,en;q=0.8,hi;q=0.6',
        'cache-control': 'no-cache'
    }
    request.post({
        url: URL_UPI_COLLECTPAY_PROD,
        headers: headers,
        body: payload,
        gzip: true
    }, function(err, response, body) {
        if (err) {
            logger.warn('CollectPay error response: ' + err.stack);
            return updateTxStatus(collectPay.merchantTranId, TXSTAT.ERR)
            .catch(function(err) {
                logger.warn('Error updating tx to client: ' + collectPay.merchantTranId);
            })
        }
        if (response.statusCode == 200 || response.statusCode == 202) {
            logger.silly('CollectPay response: ' + JSON.stringify(body));
            let collectPayResponse = body;
            notifyCollectPayResponse(collectPayResponse);
        } else {
            logger.warn('CollectPay non 200 Response: ' + JSON.stringify(body));
            return updateTxStatus(collectPay.merchantTranId, TXSTAT.ERR)
            .catch(function(err) {
                logger.warn('Error updating tx to client: ' + collectPay.merchantTranId);
            });
        }
    });
}

function notifyCollectPayResponse(collectPayRespEncryStr) {
    let collectPayRespEncryBytes = Buffer.from(collectPayRespEncryStr, 'base64');
    let collectPayResponseStr = cryptoUtils.decrypt(collectPayRespEncryBytes);
    let collectPayResponse = JSON.parse(collectPayResponseStr);
    logger.debug("CollectPay response: " + JSON.stringify(collectPayResponse));

    let updatePay = {};
    updatePay.merchantTranId = collectPayResponse.merchantTranId;
    updatePay.status = TXSTAT.PULLED; 
    registration.updateFeePay(updatePay, (err, resp) => {});

    let status;
    if(collectPayResponse.success === "false") {
        logger.warn('CollectPay failed for id: ' + collectPayResponse.merchantId + ' ResponseCode: ' + collectPayResponse.response);
        status = TXSTAT.ERR;    
    } else {
        status = TXSTAT.PULLED;
    }
    updateTxStatus(collectPayResponse.merchantTranId, status)
    .catch(function(err) {
        logger.warn('Error updating tx to client: ' + collectPayResponse.merchantTranId)
    });
}

function updateTxStatus(merchantTranId, status) {
    return new Promise(function(resolve, reject) {
        select = {};
        select.merchantTranId = merchantTranId;
        select.userStatus = USERSTAT.CONNECTED;
        logger.debug('Notifying tx update for id: ', merchantTranId);
        let collectPayEntry;
        txDbPromise.findOne(select)
        .then(function(doc) {
            if (!doc) {
                logger.warn('No entry found for collectPay: ' + JSON.stringify(merchantTranId));
                return reject('No entry for collectPay');
            }
            collectPayEntry = doc;
            let txStatus = { status: status };
            logger.silly('Updating CollectPay entry: ' + JSON.stringify(doc) + ' to ' + txStatus.status);
            let set = { $set: txStatus }
            return txDbPromise.update(doc, set);
        }).then(function(numReplaced) {
            let socket = clients[collectPayEntry.sessionId];
            if(!socket) {
                logger.warn('Socket not found for session id: ' + collectPayEntry.sessionId);
                return reject('No socket for update');
            }
            let client = collectPayEntry.client;
            logger.silly('Tx status updated: ', JSON.stringify(collectPayEntry));
            collectPayEntry.status = status;
            let notifyTxStatus = new TxStatus(collectPayEntry)
            let resp = new routerModels.WebResponseWrapper(SERVER_RESP_OK, notifyTxStatus, SERVER_RESP_SUCCESS);
            logger.debug('Notifying pull status: ' + JSON.stringify(notifyTxStatus) + ' to client: ' + socket.id);
            socket.emit(SOCKET_NOTIFY_PULLREST, resp);
            resolve('Sent');
        })

    })
}

exports.collectPayCallback = function(collectPayCallbackStr) {
    let collectPayCallback = JSON.parse(collectPayCallbackStr);
    collectPayTx = {};
    collectPayTx.merchantTranId = collectPayCallback.merchantTranId;
    logger.debug('Received callback: ', JSON.stringify(collectPayCallback));
    txDbPromise.findOne(collectPayTx)
    .then(function(doc) {
        if (!doc) {
            logger.warn('No entry found for collectPayTx: ' + JSON.stringify(collectPayTx));
            return;
        }
        logger.silly('Updating CollectPay entry: ', JSON.stringify(doc) + ' to PAID');
        let txStatus = { status: TXSTAT.PAID };
        let set = { $set: txStatus }
        txDbPromise.update(doc, set)
        .then(function(numReplaced) {
            logger.silly('Updated doc: ' + JSON.stringify(doc));

            let updatePay = {};
            updatePay.merchantTranId = collectPayTx.merchantTranId;
            updatePay.status = TXSTAT.PAID; 
            registration.updateFeePay(updatePay, (err, resp) => {});

            let client = doc.client;
            let socket = clients[doc.sessionId];
            if(!socket) {
                logger.warn('Socket not found for session id: ' + doc.sessionId);
                return;
            }
            doc.status = txStatus.status;
            let notifyTxStatus = new TxStatus(updatePay);
            let resp = new routerModels.WebResponseWrapper(SERVER_RESP_OK, notifyTxStatus, SERVER_RESP_SUCCESS);
            logger.debug('Notifying tx complete: ' + JSON.stringify(notifyTxStatus) + ' to client: ' + client);
            socket.emit(SOCKET_NOTIFY_TXCOMPLETE, resp);
        }).catch(function(error) {
            logger.warn(error.stack);
        });
    }).catch(function(err) {
            //TODO
            logger.warn(err.stack);
        });
}

function registerDisconnectListener(socket) {
    socket.on(SOCKET_DISCONNECTED, function() {
        let sessionId = socket.handshake.query.sessionId;
        let select = { sessionId: sessionId };
        let userStat = { userStatus: USERSTAT.DISCONNECTED };
        let set = { $set: userStat };
        txDbPromise.update(select, set)
        .then(function(numReplaced) {
            logger.debug('No of entries updated to disconnected: ' + numReplaced);
        });
        delete clients[sessionId];
        logger.debug('Client disconnected: ' + socket.id);
    });
}

function CollectPay(payment) {
    this.merchantId = payment.merchantId;
    this.merchantName = payment.merchantName;
    this.subMerchantId = payment.subMerchantId;
    this.subMerchantName = payment.subMerchantName;
    this.terminalId = payment.terminalId;
    this.merchantTranId = payment.merchantTranId;
    this.billNumber = payment.billNumber;
    this.payerVa = payment.payerVa;
    this.amount = payment.amount;
    this.note = payment.note;
    this.collectByDate = payment.collectByDate;
}

function TxStatus(payment) {
    this.merchantTranId = payment.merchantTranId;
    this.status = payment.status;
}