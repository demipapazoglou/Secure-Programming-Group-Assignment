class MessageSigner{
    constructor(cryptoManager){
        this.cryptoManager = cryptoManager;
    }

    signEnvelope(envelope, privateKey){
        const payloadString = this.canonicaliseJSON(envelope.payload);
        const signature = this.cryptoManager.createSignature(payloadString, privateKey);

        return{
            ...envelope,
            sig: signature
        };
    }

    verifyEnvelope(envelope, publicKey){
        const payloadString = this.canonicaliseJSON(envelope.payload);
        return this.cryptoManager.verifySignature(payloadString, envelope.sig, publicKey);
    }
    
    //reference: https://gist.github.com/maentx/50ec00ae7c623ea66c93a5bdac947665
    canonicaliseJSON(obj){
        return JSON.stringify(obj, Object.keys(obj).sort());
    }

    createContentSignature(type, data, privateKey){
        let dataToSign;

        switch(type){
            case 'MSG_PRIVATE':
                dataToSign = this.cryptoManager.concatBuffersForSigning(
                    data.ciphertext,
                    data.iv,
                    data.tag,
                    data.from,
                    data.to,
                    data.ts
                );
                break;
            
            case 'MSG_GROUP':
                dataToSign = this.cryptoManager.concatBuffersForSigning(
                    data.group_id,
                    data.ciphertext,
                    data.iv,
                    data.tag,
                    data.from,
                    data.ts
                );
                break;

            case 'GROUP_KEY_SHARE':
                dataToSign = this.cryptoManager.concatBuffersForSigning(
                    data.group_id,
                    JSON.stringify(data.shares),
                    data.creator_pub
                );
                break;

            default:
                throw new Error(`Unknown message type for content signature: ${type}`);
        }
        return this.cryptoManager.createSignature(dataToSign, privateKey);
    }
}

module.exports = MessageSigner;