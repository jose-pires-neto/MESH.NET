class P2PManager {
    constructor(myId, signalingService, onDataReceived, onPeerConnect, onPeerDisconnect) {
        this.myId = myId;
        this.signalingService = signalingService;
        this.onDataReceived = onDataReceived;
        this.onPeerConnect = onPeerConnect;
        this.onPeerDisconnect = onPeerDisconnect;
        this.peers = {}; // peerId -> SimplePeer instance
    }

    connectToPeer(peerId, initiator = false) {
        if (this.peers[peerId]) return; // Already connected or connecting

        console.log(`[P2P] Connecting to ${peerId} (Initiator: ${initiator})`);

        const p = new SimplePeer({
            initiator: initiator,
            trickle: false
        });

        p.on('signal', (data) => {
            this.signalingService.sendSignal(peerId, data);
        });

        p.on('connect', () => {
            console.log(`[P2P] Connected to ${peerId}`);
            this.onPeerConnect(peerId);
        });

        p.on('data', (data) => {
            try {
                const parsed = JSON.parse(data);
                this.onDataReceived(parsed, peerId);
            } catch (e) {
                console.error('Failed to parse data', e);
            }
        });

        p.on('close', () => {
            console.log(`[P2P] Connection closed with ${peerId}`);
            this.removePeer(peerId);
        });

        p.on('error', (err) => {
            console.error(`[P2P] Error with ${peerId}:`, err);
            this.removePeer(peerId);
        });

        this.peers[peerId] = p;
    }

    handleSignal(signalData) {
        const { sender, data } = signalData;
        const p = this.peers[sender];

        if (p) {
            p.signal(data);
        } else {
            // Received offer from someone we haven't initiated with yet
            // We should accept their offer (not initiator)
            this.connectToPeer(sender, false);
            this.peers[sender].signal(data);
        }
    }

    sendProfileUpdate(peerId, profileData) {
        const p = this.peers[peerId];
        if (p && p.connected) {
            p.send(JSON.stringify({
                type: 'profile-update',
                payload: profileData
            }));
        }
    }

    broadcast(data) {
        const json = JSON.stringify(data);
        Object.values(this.peers).forEach(p => {
            if (p.connected) {
                p.send(json);
            }
        });
    }

    removePeer(peerId) {
        if (this.peers[peerId]) {
            this.peers[peerId].destroy();
            delete this.peers[peerId];
            this.onPeerDisconnect(peerId);
        }
    }
}
