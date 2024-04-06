const { Server } = require("socket.io");
const dotenv = require("dotenv");
const { Redis } = require("ioredis");
const { initializeApp } = require("firebase/app");
const { PrismaClient, Prisma } = require("@prisma/client");
const { getFirestore, doc, setDoc, addDoc, updateDoc, arrayUnion, getDoc } = require("firebase/firestore");

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.apiKey,
  authDomain: process.env.authDomain,
  projectId: process.env.projectId,
  storageBucket: process.env.storageBucket,
  messagingSenderId: process.env.messagingSenderId,
  appId: process.env.appId,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);



const io = new Server(3000, {
  cors: { origin: "*" },
});

const pub = new Redis({
  host: process.env.HOST,
  port: process.env.PORT,
  username: process.env.USER,
  password: process.env.PASSWORD,
});
const sub = new Redis({
  host: process.env.HOST,
  port: process.env.PORT,
  username: process.env.USER,
  password: process.env.PASSWORD,
});

const prisma = new PrismaClient({ log: ["query"] });

const sockToId = {};
const idToSock = {};

io.on("connection", (socket) => {
  console.log("Connection Recvd", socket.id)
  socket.on("online", async ({ profile }) => {
    if (profile["email"]) {
      sockToId[socket.id] = profile["email"];
      await setDoc(doc(db, "users", profile["email"].split("@")[0]), {
        isOnline: true,
      });
      sockToId[socket.id] = profile["email"].split("@")[0]
      idToSock[profile["email"].split("@")[0]] = socket.id
      docSnap = await getDoc(doc(db, "contactlist", profile["email"].split("@")[0]));
      if (docSnap.exists()) {
        io.to(socket.id).emit("contactListSent", docSnap.data());
      }
    }
  });

  socket.on("retrieveMessages", async (data) => {
    data=JSON.parse(data);
    let f=data["from"]
    let t=data["to"]
    let query=`SELECT * from mydb.messages where (\`from\`=\"${f}\" AND \`to\`=\"${t}\") OR (\`to\`=\"${f}\" AND \`from\`=\"${t}\") order by created_at asc;`;
    console.log(query)
    const result = await prisma.$queryRaw(Prisma.raw(query));
    io.to(socket.id).emit("receiveMsgs",result)
  });

  socket.on("disconnect", async (id) => {
    if (sockToId[socket.id]) {
      await setDoc(doc(db, "users", sockToId[socket.id]), {
        isOnline: false,
      });
      delete sockToId[socket.id];
    }

  });

  socket.on("addInContacts", async (id) => {
    console.log(id)
    try {
      await updateDoc(doc(db, "contactlist", id["ids"][0]), {
        contacts: arrayUnion(id["ids"][1]),
      });
    }
    catch {
      await setDoc(doc(db, "contactlist", id["ids"][0]), {
        contacts: [id["ids"][1]],
      });
    }
  })

  socket.on("message", async (message) => {
    await pub.publish("messages", message);
  });


});


sub.subscribe('messages')
sub.on('message', async (channel, message) => {
  message = JSON.parse(message);
  console.log(message)
  console.log(idToSock)
  await prisma.message.create({
    data: {
      text: message['msg'],
      from: message['from'],
      to: message['to'],
    }
  })
  if (message["to"] in idToSock) {
    io.to(idToSock[message["to"]]).emit("message", JSON.stringify({ from: message["from"], msg: message["msg"] }))
  }
})