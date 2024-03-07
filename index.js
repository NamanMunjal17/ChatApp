const { Server } = require("socket.io");
const dotenv = require("dotenv");
const { Redis } = require("ioredis");
const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc } = require("firebase/firestore");

//TODO Store all this in dotenv file
const firebaseConfig = {
    apiKey: "AIzaSyAfkrihGesm4G6LlzAcxYrTUJmlB7dsWlI",
    authDomain: "chat-app-4a7f6.firebaseapp.com",
    projectId: "chat-app-4a7f6",
    storageBucket: "chat-app-4a7f6.appspot.com",
    messagingSenderId: "784317897889",
    appId: "1:784317897889:web:0f24b5d2ced04d472524e0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


dotenv.config()

const io = new Server(3000, { /* options */ });

const pub = new Redis({ host: process.env.HOST, port: process.env.PORT, username: process.env.USER, password: process.env.PASSWORD })
const sub = new Redis({ host: process.env.HOST, port: process.env.PORT, username: process.env.USER, password: process.env.PASSWORD })

const sockToId={};

io.on("connection", (socket) => {

    socket.on('online', async (id) => {
        sockToId[socket.id]=id;
        await setDoc(doc(db,"users",id),{
            isOnline: true
        })
    })

    socket.on('disconnect', async (id)=>{
        await setDoc(doc(db,"users",sockToId[socket.id]),{
            isOnline: false
        })
        delete sockToId[socket.id];
    })

    socket.on('message', async (message) => {
        await pub.publish("messages", message)
    })

});