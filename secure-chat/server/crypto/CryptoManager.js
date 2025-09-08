var crypto = require('crypto');
var {promisify} = require('util');

/* CryptoManager handles crypto operations include key generation, encryption,  decryption, 
signing, and verification using RSA algorithms with OAEP padding and PSS signatures */
class CryptoManager{
    constructor(){
        //crypto algorithms configuration
        this.ALGORITHMS ={
            RSA:{
                OAEP: {
                    //reference: https://nodejs.org/api/crypto.html
                    //https://medium.com/@yuvrajkakkar1/crypto-nodejs-encryption-issue-rsa-padding-add-pkcs1-type-1-data-too-large-for-key-size-e5e8a52ce8fc
                    hash: 'sha256',
                    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
                },
                PSS: {
                    hash: 'sha256',
                    saltLength: 32
                }
            }
        };
    }

    //reference: https://stackoverflow.com/questions/8520973/how-to-create-a-pair-private-public-keys-using-node-js-crypto
    //generate RSA key pair 
    async generateRSAKeyPair(){
        const generateKeyPair = promisify(crypto.generateKeyPair);
        return generateKeyPair('rsa', {
            modulusLength: 4096,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        });
    }

    //reference: https://medium.com/@bagdasaryanaleksandr97/understanding-base64-vs-base64-url-encoding-whats-the-difference-31166755bc26
    //https://hyunbinseo.medium.com/base64-in-node-js-and-browser-c7fba48ae033
    //base64url encoding with no padding 
    base64urlEncode(buffer){
        return buffer.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    }
    
    //reference: https://stackoverflow.com/questions/5234581/base64url-decoding-via-javascript
    //base64url decoding 
    base64urlDecode(str) {
        str = str.replace(/-/g, '+').replace(/_/g, '/');
        const padding = str.length % 4;
        if(padding){
            str += '='.repeat(4 - padding);
        }
        return Buffer.from(str, 'base64');
    }

    //encrypts plaintext using RSA-OAEP with a public key 
    encryptRSA(plaintext, publicKey){
        const publicKeyObj = crypto.createPublicKey(publicKey);
        const encrypted = crypto.publicEncrypt(
            {
                key: publicKeyObj,
                padding: this.ALGORITHMS.RSA.OAEP.padding,
                oaepHash: this.ALGORITHMS.RSA.OAEP.hash
            },
            Buffer.from(plaintext, 'utf8')
        );
        return this.base64urlEncode(encrypted);
    }

    //decrypts ciphertext using RSA-OAEP with a private key
    decryptRSA(ciphertextBase64, privateKey){
        const ciphertext = this.base64urlDecode(ciphertextBase64);
        const privateKeyObj = crypto.createPrivateKey(privateKey);
        const decrypted = crypto.privateDecrypt(
            {
                key: privateKeyObj,
                padding: this.ALGORITHMS.RSA.OAEP.padding,
                oaepHash: this.ALGORITHMS.RSA.OAEP.hash
            },
            ciphertext
        );
        return decrypted.toString('utf8');
    }

    //create digital signature (RSASSA-PSS)
    createSignature(data, privateKey){
        const privateKeyObj = crypto.createPrivateKey(privateKey);
        const sign = crypto.createSign('sha256');
        sign.update(data);
        sign.end();

        const signature = sign.sign({
            key: privateKeyObj,
            padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
            saltLength: this.ALGORITHMS.RSA.PSS.saltLength
        });
        return this.base64urlEncode(signature);
    }

    //reference: https://stackoverflow.com/questions/53985272/sign-verify-with-nodejs-crypto-always-false
    //verify digital signature (RSASSA-PSS)
    verifySignature(data, signatureBase64, publicKey){
        const signature = this.base64urlDecode(signatureBase64);
        const publicKeyObj = crypto.createPublicKey(publicKey);
        const verify = crypto.createVerify('sha256');
        verify.update(data);
        verify.end();

        return verify.verify({
            key: publicKeyObj,
            padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
            saltLength: this.ALGORITHMS.RSA.PSS.saltLength
        }, signature);
    }

    //create content signature for messages 
    createContentSigDM(ciphertext, from, to, ts, privateKey){
        const dataToSign = this.concatBuffersForSigning(
            ciphertext, from, to, ts
        );
        return this.createSignature(dataToSign, privateKey);  
    }

    //verify content signature for messages 
    verifyContentSigDM(ciphertext, from, to, ts, signature, publicKey){
        const dataToVerify = this.concatBuffersForSigning(
            ciphertext, from, to, ts
        );
        return this.verifySignature(dataToVerify, signature, publicKey);
    }

    //reference: https://nodejs.org/api/buffer.html
    //helper func to concatenate data for signing 
    concatBuffersForSigning(...elements){
        const buffers = elements.map(element => {
            if(typeof element === 'string'){
                return Buffer.from(element, 'utf8');
            }else if (Buffer.isBuffer(element)){
                return element;
            }else{
                return Buffer.from(String(element), 'utf8');
            }
        });
        return Buffer.concat(buffers);
    }

    //reference: https://medium.com/@tony.infisical/guide-to-web-crypto-api-for-encryption-decryption-1a2c698ebc25
    //https://stackoverflow.com/questions/41266976/unsupported-state-or-unable-to-authenticate-data-with-aes-128-gcm-in-node
    //encrypts a private message and creates a content signature
    async encryptPrivateMessage(plaintext, recipientPublicKey, senderPrivateKey, from, to){
        
        //encrypt message with RSA
        const ciphertext = this.encryptRSA(plaintext, recipientPublicKey);

        //create content signature 
        const dataToSign = this.concatBuffersForSigning(
            ciphertext,
            from, 
            to, 
            Date.now()
        );

        const contentSig = this.createSignature(dataToSign, senderPrivateKey);
        
        return{
            ciphertext,
            content_sig: contentSig
        };
    }

    //decrypts a private message and verifies the content signature
    async decryptPrivateMessage(encryptedData, recipientPrivateKey, senderPublicKey){
        
        const{ ciphertext, content_sig } = encryptedData;

        try{
            //verify content signature
            const signatureValid = this.verifyContentSigDM(
                ciphertext,
                encryptedData.from,
                encryptedData.to,
                encryptedData.ts,
                content_sig,
                senderPublicKey
            );

            if(!signatureValid){
                throw new Error('Invalid content signature');
            }

            //decrypt message with RSA 
            const plaintext = this.decryptRSA(ciphertext, recipientPrivateKey);

            return plaintext;
        } catch(error){
            throw new Error(`Decryption failed: ${error.message}`);
        }
    }
}

module.exports = CryptoManager;
