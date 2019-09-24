import * as express from "express";
import * as path from "path";
import * as socketServer from "socket.io";
import IUser from "./IUser";


const server = express();

server.get("/", (req : express.Request, res : express.Response) => {
    return res.sendFile(path.join(__dirname, "index.html"));
    
})

const httpServer = server.listen(3333, () => {
    console.log("run on port 3333")
})

interface IUserCollection {
    [key: string] : IUser;
}

const userCollection: IUserCollection  = {}

const io = socketServer(httpServer);
io.on("connection", (socket) => {

    userCollection[socket.id] = {
        name: "",
        nick: "",
        skills: [],
        exp: 0
    }

    console.log('a new user connected');

    socket.on("set data", (data) => {
        if (data && data.name) {

            for (let a in userCollection) {
                // console.log(a, userCollection[a])
                
                if (userCollection[a].name) {
                    console.log(userCollection[a].name, "should be displayed to", data.name)
                    socket.emit("new player", userCollection[a].name);
                }
            }

            userCollection[socket.id].name = data.name;

            
            io.emit("new player", userCollection[socket.id].name)
        }

        console.log(data);
    })

    socket.on("direction", (data) => {
        console.log(userCollection[socket.id].name, data);
        io.emit("move block", {
            player : userCollection[socket.id].name,
            move : data
        })
    })

    

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
})
