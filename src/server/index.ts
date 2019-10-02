import * as express from "express";
import * as path from "path";
import * as socketServer from "socket.io";
import IUser from "./IUser";

const extraPass = __dirname.indexOf("distServer") === -1 ? "../" : "";

const server = express();
server.use(express.json());

        server.use(function (req, res, next) {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE")
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
            next();
        });
server.use("/dist", express.static(path.join(__dirname, `${extraPass}../../dist`)));
server.use("/public", express.static(path.join(__dirname, `${extraPass}../../public`)));


server.get("/", (req : express.Request, res : express.Response) => {

    return res.sendFile(path.join(__dirname, `${extraPass}../dist`, 'index.html'));

    
})

const httpServer = server.listen(process.env.PORT, () => {
    console.log("run on port " + process.env.PORT)
})

interface IUserCollection {
    [key: string] : IUser;
}

const userCollection: IUserCollection  = {};
let lab = [];

function labirint(width = 17, height = 17, cell = 40) {
    let border = [];
    for (let i = 0; i < height; i++) {
        let row = [];
        for (let j = 0; j < width; j++ ) {
            if (i === 0 || j === 0 || i === width - 1 || j === height - 1) {
                row[j] = 3;
            }
        }
        border.push(row)
    }

    let map = [[]];
    for (let i = 1; i < height - 1; i++) {
        let row = [];
        for (let j = 1; j < width - 1; j++ ) {
            if (i % 2 !== 1 && j % 2 !== 1) {
                row[j] = 2;
            }
        }
        map.push(row);
    }
    map.push([])

    let wall = [[]];
    for (let i = 1; i < height - 1; i++) {
        let row = [];
        for (let j = 1; j < width - 1; j++ ) {
            if (!(i % 2 !== 1 && j % 2 !== 1) && Math.random() < 0.3) {
                row[j] = 1;
            }
        }
        wall.push(row);
    }
    wall.push([])

    for(let i = 0; i < height; i++) {
        lab.push([]);
        for(let j = 0; j < width; j++) {
            lab[i][j] = border[i][j] || map[i][j] || wall[i][j] || 0;
        }
    }

    // let blocks = [].concat(
    //     map.reduce((acc, val) => acc.concat(val), []), 
    //     border.reduce((acc, val) => acc.concat(val), []),
    //     wall.reduce((acc, val) => acc.concat(val), []));

    // blocks.forEach(bl => {
    //     app.stage.addChild(bl);
    // });
  }

  labirint();
const io = socketServer(httpServer);
io.on("connection", (socket) => {

    socket.emit("welcome", { players: userCollection, map : lab });
    for (let a in userCollection) {
        // console.log(a, userCollection[a])
        if (userCollection[a].name) {
            console.log(userCollection[a].name, "should be displayed")
            // socket.emit("new player", userCollection[a].name);
        }
    }

    userCollection[socket.id] = {
        name: "",
        nick: "",
        skills: [],
        exp: 0
    }
    console.log('a new user connected');

    socket.on("set data", (data) => {
        if (data && data.name) {
            userCollection[socket.id].name = data.name;
            io.emit("new player", userCollection[socket.id].name)
        } else {
            delete userCollection[socket.id];
        }

        console.log(data);
    })

    socket.on("direction", (data) => {
        // console.log(55,socket.id,userCollection,   userCollection[socket.id].name, data);
        io.emit("move block", {
            player : userCollection[socket.id].name,
            move : data
        })
    })

    socket.on("bomb", (data) => {
        let id = Math.round(Math.random() * 1000);
        console.log("bomb",data);

        io.emit("bomb", {
            id,
            state: "set",
            level: data.level,
            x: data.x,
            y: data.y,
        });

        setTimeout(() => {
            io.emit("bomb", {
                id,
                state: "explode",
                level: data.level
            });
        }, 2000)
    })

    socket.on('disconnect', (data) => {
        console.log(55, 'user disconnected', data, socket.id, userCollection );
        if (userCollection[socket.id])
        io.emit("remove user", userCollection[socket.id].name)
    });
})
