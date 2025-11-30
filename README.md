# Mesh.net - P2P Decentralized Social Network

Mesh.net is a minimalist, decentralized social network built on **WebRTC** and **Firebase**. It creates a peer-to-peer (P2P) mesh network where users connect directly to each other to share posts and updates, without relying on a central server to store user data.

![Mesh Network](https://via.placeholder.com/800x400?text=Mesh+Network+Visualizer)

## 🚀 Features

*   **Decentralized Architecture:** No central database for posts. Data lives on user devices and propagates through the mesh.
*   **P2P Communication:** Uses **WebRTC** (via `simple-peer`) for direct browser-to-browser data transfer.
*   **Real-time Graph Visualization:** Visualizes the network topology and active connections in real-time.
*   **Local-First Data:** All data is persisted locally using **IndexedDB**, ensuring the app works offline and loads instantly.
*   **Minimalist UI:** A clean, monochrome interface focused on content and readability.
*   **Image Sharing:** Support for sharing images via P2P (Base64 encoded).
*   **Profile Management:** Custom avatars and bios that sync across the network.

## 🛠️ Architecture

The application follows a **hybrid P2P architecture**:

1.  **Signaling (Discovery):** Uses **Firebase Realtime Database** *only* as a signaling server to help peers find each other and exchange WebRTC connection offers (SDP). No user content (posts, messages) is stored here.
2.  **Mesh Network (Data):** Once connected, peers form a mesh.
    *   **Broadcasting:** When a user posts, the data is sent directly to all connected peers.
    *   **Gossip:** Peers can be extended to relay messages to other peers (gossip protocol).
3.  **Storage (Persistence):**
    *   **IndexedDB:** Stores your profile, your posts, and posts received from others locally in the browser.

### Directory Structure

```
OmniEngine/
├── index.html          # Main entry point (Single Page App)
├── js/
│   ├── app.js          # Core application logic (UI, State, Initialization)
│   ├── config.js       # Firebase configuration
│   ├── p2p.js          # WebRTC wrapper (SimplePeer management)
│   ├── signaling.js    # Firebase signaling service (Discovery)
│   ├── storage.js      # IndexedDB wrapper (Local persistence)
│   └── visualizer.js   # Canvas-based network graph visualization
└── README.md           # Project documentation
```

## 📦 Installation & Usage

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/mesh-net.git
    cd mesh-net
    ```

2.  **Configure Firebase:**
    *   Create a project at [firebase.google.com](https://firebase.google.com).
    *   Create a **Realtime Database**.
    *   Copy your web app configuration keys.
    *   Open `js/config.js` and replace the `firebaseConfig` object with your own keys.

3.  **Run Locally:**
    *   Since this uses WebRTC and ES6 modules, you need a local web server.
    *   Using Python: `python -m http.server`
    *   Using Node (http-server): `npx http-server .`
    *   Open `http://localhost:8000` in your browser.

4.  **Simulate Peers:**
    *   Open the app in multiple browser tabs or different browsers to simulate different users joining the mesh.

## 🔮 Future Improvements

*   **Direct Messages (DMs):** Private, encrypted 1-on-1 chat using WebRTC data channels.
*   **End-to-End Encryption:** Re-implement cryptographic signing for identity verification.
*   **File Sharing:** Drag-and-drop P2P file transfer for larger files.
*   **Relay Nodes:** Optional "super peers" to help bridge connections and store data for offline users.
*   **Dark Mode:** A toggle for a true dark theme.

## 📄 License

MIT License - feel free to use and modify for your own P2P experiments.
