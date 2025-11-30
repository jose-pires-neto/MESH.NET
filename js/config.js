// Firebase Configuration
// REPLACE THESE VALUES WITH YOUR OWN FIREBASE CONFIGURATION
const firebaseConfig = {
    apiKey: "AIzaSyAqHhDHYdNWYfhdVNzSyKrXSgwwAhKN-Yc",
    authDomain: "hive-bee-97ce6.firebaseapp.com",
    databaseURL: "https://hive-bee-97ce6-default-rtdb.firebaseio.com",
    projectId: "hive-bee-97ce6",
    storageBucket: "hive-bee-97ce6.appspot.com",
    messagingSenderId: "1089713090134",
    appId: "1:1089713090134:web:aa4b79a0a14b05823c55f7"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const database = firebase.database();
