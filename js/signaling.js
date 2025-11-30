class SignalingService {
    constructor(myId, onPeerFound, onSignal) {
        this.myId = myId;
        this.onPeerFound = onPeerFound;
        this.onSignal = onSignal;
        this.db = firebase.database();
        this.peersRef = this.db.ref('peers');
        this.signalsRef = this.db.ref('signals');

        this.init();
    }

    init() {
        // Register myself
        this.peersRef.child(this.myId).set({
            online: true,
            lastSeen: firebase.database.ServerValue.TIMESTAMP
        });

        // Remove myself on disconnect
        this.peersRef.child(this.myId).onDisconnect().remove();

        // Listen for other peers
        this.peersRef.on('child_added', (snapshot) => {
            const peerId = snapshot.key;
            if (peerId !== this.myId) {
                this.onPeerFound(peerId, true); // true = initiator (if I'm newer, or simple rule)
            }
        });

        // Listen for signals directed to me
        this.signalsRef.child(this.myId).on('child_added', (snapshot) => {
            const signalData = snapshot.val();
            this.onSignal(signalData);
            // Remove signal after processing
            snapshot.ref.remove();
        });
    }

    sendSignal(targetPeerId, data) {
        this.signalsRef.child(targetPeerId).push({
            sender: this.myId,
            data: data
        });
    }
}
