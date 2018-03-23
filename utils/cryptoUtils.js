const fs = require('fs');
const path = require('path');
const forge = require('node-forge');

exports.encryptAndEncode = function(message) {
    let upiApiCertPath = path.join(__dirname, '..', '.cert', 'upi_api_prod.pem');

    let upiApiCertPem = fs.readFileSync(upiApiCertPath, 'utf-8');
    let upiApiCert = forge.pki.certificateFromPem(upiApiCertPem);
    let upiApiPublicKey = upiApiCert.publicKey;
    let buffer = Buffer.from( message, 'utf8' );
    let encryptedMessage = upiApiPublicKey.encrypt(buffer);
    let encodedMessage = forge.util.encode64(encryptedMessage);
    return encodedMessage;
}

exports.decrypt = function(encrypted) {
        let privateKeyPath = path.join(__dirname, '..', '.cert', 'collectPay.key');

        let privateKeyPem = fs.readFileSync(privateKeyPath, 'utf-8');
        let privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
        let decryptedMessage = privateKey.decrypt(encrypted);
        console.log(decryptedMessage);
        return decryptedMessage;
}
