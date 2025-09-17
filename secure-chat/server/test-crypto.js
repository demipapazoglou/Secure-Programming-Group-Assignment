const CryptoManager = require('./crypto/CryptoManager');

async function testCrypto() {    
    const cryptoManager = new CryptoManager();

    // Generate RSA key pair 
    console.log("1. Generating RSA key pair")
    const { publicKey, privateKey } = await cryptoManager.generateRSAKeyPair();
    console.log("Key pair generated");
    console.log("   Public Key Length:", publicKey.length, "chars");
    console.log("   Private Key Length:", privateKey.length, "chars");
    console.log("   Public Key starts with:", publicKey.substring(0, 30) + "...");
    console.log("   Private Key starts with:", privateKey.substring(0, 30) + "...");
    console.log();

    // Test encryption & decryption
    console.log("2. Testing encryption & decryption...");
    const plaintext = "This is a secret message!";
    const ciphertext = cryptoManager.encryptRSA(plaintext, publicKey);
    const decrypted = cryptoManager.decryptRSA(ciphertext, privateKey);
    console.log("   Plaintext:", plaintext);
    console.log("   Ciphertext (first 50 chars):", ciphertext.substring(0, 50) + "...");
    console.log("   Decrypted:", decrypted);
    console.log("   Encryption & decryption match:", plaintext === decrypted);
    console.log();

    // Test digital signatures
    console.log("3. Testing digital signatures...");
    const testData = "Important data that needs to be signed";
    const signature = cryptoManager.createSignature(testData, privateKey);
    const isValid = cryptoManager.verifySignature(testData, signature, publicKey);
    console.log("   Data to sign:", testData);
    console.log("   Signature (first 50 chars):", signature.substring(0, 50) + "...");
    console.log("   Signature verification:", isValid);
    
    // Test signature tampering detection
    const tamperedData = "Tampered data that needs to be signed";
    const isTamperedValid = cryptoManager.verifySignature(tamperedData, signature, publicKey);
    console.log("   Tampered data detection:", !isTamperedValid);
    console.log();

    // Test private message encryption/decryption with content signature
    console.log("4. Testing private message encryption with content signature...");
    const from = "user1@example.com";
    const to = "user2@example.com";
    const privateMessage = "This is a private message between two users";
    
    const encryptedMessage = await cryptoManager.encryptPrivateMessage(
        privateMessage, publicKey, privateKey, from, to
    );
    
    console.log("   From:", from);
    console.log("   To:", to);
    console.log("   Original message:", privateMessage);
    console.log("   Encrypted ciphertext (first 50 chars):", encryptedMessage.ciphertext.substring(0, 50) + "...");
    console.log("   Content signature (first 50 chars):", encryptedMessage.content_sig.substring(0, 50) + "...");
    console.log("   Timestamp:", new Date(encryptedMessage.ts).toISOString());
    
    // Test decryption and signature verification
    const decryptedMessage = await cryptoManager.decryptPrivateMessage(
        { 
            ciphertext: encryptedMessage.ciphertext, 
            content_sig: encryptedMessage.content_sig,
            from: from,
            to: to,
            ts: encryptedMessage.ts
        },
        privateKey,
        publicKey
    );
    
    console.log("   Decrypted message:", decryptedMessage);
    console.log("   Private message encryption/decryption successful:", privateMessage === decryptedMessage);
    console.log();

    // Test envelope signing
    console.log("5. Testing envelope signing...");
    const envelope = {
        type: "MSG_PRIVATE",
        from: "user1",
        to: "user2",
        ts: Date.now(),
        payload: {
            ciphertext: ciphertext,
            content_sig: signature
        }
    };

    const envelopeSignature = cryptoManager.signEnvelope(envelope, privateKey);
    const envelopeValid = cryptoManager.verifyEnvelope(envelope, envelopeSignature, publicKey);

    console.log("   Envelope type:", envelope.type);
    console.log("   Envelope signature (first 50 chars):", envelopeSignature.substring(0, 50) + "...");
    console.log("   Envelope signing verification:", envelopeValid);
    console.log();

    // Test canonical JSON
    console.log("6. Testing canonical JSON...");
    const testObj1 = { z: 1, a: 2, m: 3 };
    const testObj2 = { a: 2, m: 3, z: 1 };
    
    const canonical1 = cryptoManager.canonicaliseJSON(testObj1);
    const canonical2 = cryptoManager.canonicaliseJSON(testObj2);
    
    console.log("   Original object 1:", JSON.stringify(testObj1));
    console.log("   Original object 2:", JSON.stringify(testObj2));
    console.log("   Canonical version 1:", canonical1);
    console.log("   Canonical version 2:", canonical2);
    console.log("   Canonical JSON consistency:", canonical1 === canonical2);
    console.log();

    // Test content signatures for different message types
    console.log("7. Testing content signatures for public channels...");
    const publicMessage = "Public channel message";
    const publicCiphertext = cryptoManager.encryptRSA(publicMessage, publicKey);
    const publicTs = Date.now();
    
    const publicSignature = cryptoManager.createPublicCHContentSig(
        publicCiphertext, from, publicTs, privateKey
    );
    
    const publicSigValid = cryptoManager.verifyPublicCHContentSig(
        publicCiphertext, from, publicTs, publicSignature, publicKey
    );
    
    console.log("   Public message:", publicMessage);
    console.log("   Content signature (first 50 chars):", publicSignature.substring(0, 50) + "...");
    console.log("   Public channel content signature verification:", publicSigValid);
    console.log();

    // Test key share content signatures
    console.log("8. Testing key share content signatures...");
    const shares = { 
        share1: "key_part_1", 
        share2: "key_part_2",
        share3: "key_part_3"
    };
    
    const keyShareSignature = cryptoManager.createKeyShareContentSig(
        shares, publicKey, privateKey
    );
    
    const keyShareValid = cryptoManager.verifyKeyShareContentSig(
        shares, publicKey, keyShareSignature, publicKey
    );
    
    console.log("   Key shares:", JSON.stringify(shares));
    console.log("   Key share signature (first 50 chars):", keyShareSignature.substring(0, 50) + "...");
    console.log("   Key share content signature verification:", keyShareValid);
    console.log();

    console.log("=== All Tests Completed ===");
}

// Run the tests
testCrypto().catch(error => {
    console.error("Test failed with error:", error);
    process.exit(1);
});