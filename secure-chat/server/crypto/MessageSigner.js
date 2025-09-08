//handles signing and verification of message envelopes and content
class MessageSigner{
    constructor(cryptoManager){
        this.cryptoManager = cryptoManager;
    }

    //signs a message envelope by creating a signature of the canonicalised payload
    signEnvelope(envelope, privateKey){
        const payloadString = this.canonicaliseJSON(envelope.payload);
        const signature = this.cryptoManager.createSignature(payloadString, privateKey);

        return{
            ...envelope,
            sig: signature
        };
    }

    //verifies the signature of a message envelope 
    verifyEnvelope(envelope, publicKey){
        const payloadString = this.canonicaliseJSON(envelope.payload);
        return this.cryptoManager.verifySignature(payloadString, envelope.sig, publicKey);
    }
    
    //reference: https://gist.github.com/maentx/50ec00ae7c623ea66c93a5bdac947665
    //canonicalise a Json obj by sorting keys to ensure consistent serialisation
    //it is used to prevents signature verification failures due to different key ordering
    canonicaliseJSON(obj){
        return JSON.stringify(obj, Object.keys(obj).sort());
    }

    //create a content signature for different message types
    createContentSignature(type, data, privateKey){
        let dataToSign;

        switch(type){
            case 'MSG_PRIVATE':
                dataToSign = this.cryptoManager.concatBuffersForSigning(
                    data.ciphertext,
                    data.from,
                    data.to,
                    data.ts
                );
                break;
            
            case 'MSG_PUBLIC':
                dataToSign = this.cryptoManager.concatBuffersForSigning(
                    data.ciphertext,
                    data.from,
                    data.ts
                );
                break;

            default:
                throw new Error(`Unknown message type for content signature: ${type}`);
        }
        return this.cryptoManager.createSignature(dataToSign, privateKey);
    }
}

module.exports = MessageSigner;