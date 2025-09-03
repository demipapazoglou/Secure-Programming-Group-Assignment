var crypto = require('crypto');
var {promisify} = require('util');

class CryptoManager{
    constructor(){
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
            },
            AES: {
                GCM: {
                    //reference: https://www.reddit.com/r/cryptography/comments/11wvpdu/can_the_length_of_an_aesgcm_output_be_predicted/
                    keyLength: 32, //256 bits
                    ivLength: 12, //initialise vector 96 bits
                    tagLength:16   //128 bits
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

    //generate random AES key 
    generateAESKey(){
        return crypto.randomBytes(this.ALGORITHMS.AES.GCM.keyLength);
    }

    //generate random IV (initialise vector) for AES-GCM
    generateIV(){
        return crypto.randomBytes(this.ALGORITHMS.AES.GCM.ivLength); 
    }

    //reference: https://gist.github.com/sohamkamani/b14a9053551dbe59c39f83e25c829ea7
    //wrap AES key with RSA public key (RSA-OAEP)
    wrapAESKey(aesKey, publicKey){
        const publicKeyObj = crypto.createPublicKey(publicKey);
        const wrappedKey = crypto.publicEncrypt(
            {
                key: publicKeyObj,
                padding: this.ALGORITHMS.RSA.OAEP.padding,
                oaepHash: this.ALGORITHMS.RSA.OAEP.hash
            },
            aesKey
        );
    return this.base64urlEncode(wrappedKey);
    }

    //unwrap AES key with RSA private key
    unwrapAESKey(wrappedKeyBase64, privateKey){
        const wrappedKey = this.base64urlDecode(wrappedKeyBase64);
        const privateKeyObj = crypto.createPrivateKey(privateKey);

        return crypto.privateDecrypt(
            {
                key: privateKeyObj,
                padding: this.ALGORITHMS.RSA.OAEP.padding,
                oaepHash: this.ALGORITHMS.RSA.OAEP.hash
            },
            wrappedKey
        );
    }

    //reference: https://medium.com/@tony.infisical/guide-to-nodes-crypto-module-for-encryption-decryption-65c077176980
    //          https://mojoauth.com/encryption-decryption/aes-256-encryption--nodejs/
    //encrypt message with AES-GCM
    encryptAESGCM(plaintext, aesKey, iv){
        const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
        const encrypted = Buffer.concat([
            cipher.update(plaintext, 'utf8'),
            cipher.final()
        ]);
        const tag = cipher.getAuthTag();

        return {
            ciphertext: this.base64urlEncode(encrypted),
            iv: this.base64urlEncode(iv),
            tag: this.base64urlEncode(tag)
        };
    }

    //decrypt message with AES-GCM
    decryptAESGCM(ciphertextBase64, aesKey, ivBase64, tagBase64){
        const ciphertext = this.base64urlDecode(ciphertextBase64);
        const iv = this.base64urlDecode(ivBase64);
        const tag = this.base64urlDecode(tagBase64);

        const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, iv);
        decipher.setAuthTag(tag);

        return Buffer.concat([
            decipher.update(ciphertext),
            decipher.final()
        ]).toString('utf8');
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
    createContentSigDM(ciphertext, iv, tag, wrappedKey, privateKey){
        const dataToSign = this.concatBuffersForSigning(
            ciphertext, iv, tag, wrappedKey
        );
        return this.createSignature(dataToSign, privateKey);  
    }

    //verify content signature for messages 
    verifyContentSigDM(ciphertext, iv, tag, wrappedKey, signature, publicKey){
        const dataToVerify = this.concatBuffersForSigning(
            ciphertext, iv, tag, wrappedKey
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
    //encryption for private messages 
    async encryptPrivateMessage(plaintext, recipientPublicKey, senderPrivateKey, from, to){
        //generate AES key and IV
        const aesKey = this.generateAESKey();
        const iv = this.generateIV();

        //encrypt message 
        const { ciphertext, iv: ivBase64, tag } = this.encryptAESGCM(plaintext, aesKey, iv);

        //wrap AES key 
        const wrappedKey = this.wrapAESKey(aesKey, recipientPublicKey);

        //create content signature 
        const dataToSign = this.concatBuffersForSigning(
            this.base64urlDecode(ciphertext),
            this.base64urlDecode(ivBase64),
            this.base64urlDecode(tag),
            from, 
            to, 
            Date.now()
        );

        const contentSig = this.createSignature(dataToSign, senderPrivateKey);
        
        return{
            ciphertext,
            iv: ivBase64,
            tag,
            wrapped_key: wrappedKey,
            content_sig: contentSig
        };
    }

    //decryption for private messages
    async decryptPrivateMessage(encryptedData, recipientPrivateKey, senderPublicKey){
        const{ ciphertext, iv, tag, wrapped_key, content_sig } = encryptedData;

        try{
            //unwrap AES key
            const aesKey = this.unwrapAESKey(wrapped_key, recipientPrivateKey);

            //verify content signature
            const signatureValid = this.concatBuffersForSigning(
                this.base64urlDecode(ciphertext),
                this.base64urlDecode(iv),
                this.base64urlDecode(tag),
                this.base64urlDecode(wrapped_key),
                content_sig,
                senderPublicKey
            );

            if(!signatureValid){
                throw new Error('Invalid content signature');
            }

            //decrypt message 
            const plaintext = this.decryptAESGCM(ciphertext, aesKey, iv, tag);

            return plaintext;
        } catch(error){
            throw new Error(`Decryption failed: ${error.message}`);
        }
    }
}

module.exports = CryptoManager;
