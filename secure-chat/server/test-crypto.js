// test-crypto.js
const CryptoManager = require('./crypto/CryptoManager');
const MessageSigner = require('./crypto/MessageSigner');

async function testCrypto() {    
    const cryptoManager = new CryptoManager();
    const messageSigner = new MessageSigner(cryptoManager);

    //generate RSA key pair 
    console.log("Generating RSA key pair")
    const { publicKey, privateKey } = await cryptoManager.generateRSAKeyPair();
    console.log("Key pair generated");

    console.log("Testing encryption & decryption");
    const plaintext = "This is a secret";
    const ciphertext = cryptoManager.encryptRSA(plaintext, publicKey);
    const decrypted = cryptoManager.decryptRSA(ciphertext, privateKey);
    console.log("plaintext:", plaintext);
    console.log("Ciphertext:", ciphertext);
    console.log("Decrypted:", decrypted);
    console.log("Encryption & decryption match:", plaintext == decrypted);

    console.log("Testing digital signatures");
    const testData = "Data to sign";
    const signature = cryptoManager.createSignature(testData, privateKey);
    const isValid = cryptoManager.verifySignature(testData, signature, publicKey);
    console.log("Signature verification:", isValid);

    console.log("Testing message signing");
    const envelope = {
        type: "MSG_PRIVATE",
        from: "user1",
        to: "user2",
        ts: Date.now(),
        payload: {
            ciphertext: ciphertext,
            content_sig: "will_be_added"    //for testing purpose 
        }
    };

    const signedEnvelope = messageSigner.signEnvelope(envelope, privateKey);
    const envelopeValid = messageSigner.verifyEnvelope(signedEnvelope, publicKey);

    console.log("Envelope Signing:", envelopeValid);

}

testCrypto().catch(console.error);
