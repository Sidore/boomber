import * as express from "express";
import * as path from "path";
import * as socketServer from "socket.io";


const server = express();

server.get("/", (req : express.Request, res : express.Response) => {
    return res.sendFile(path.join(__dirname, "index.html"));
    
})

const httpServer = server.listen(3333, () => {
    console.log("run on port 3333")
})

const userCollection = {}

const io = socketServer(httpServer);
io.on("connection", (socket) => {

    userCollection[socket.id] = {}

    console.log('a user connected');

    socket.on("chat message", (data) => {
        userCollection[socket.id].name = data;
        console.log(data);
    })

    socket.on("direction", (data) => {
        console.log(userCollection[socket.id].name,data);
    })

    

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
})
