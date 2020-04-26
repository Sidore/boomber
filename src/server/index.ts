import * as express from "express";
import * as path from "path";
import * as socketServer from "socket.io";
import IUser from "./IUser";
import e = require("express");

const extraPass = __dirname.indexOf("distServer") === -1 ? "../" : "";

const server = express();
server.use(express.json());


server.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE")
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    next();
});
server.use("/dist", express.static(path.join(__dirname, `${extraPass}../dist`)));
server.use("/public", express.static(path.join(__dirname, `${extraPass}../public`)));


server.get("/", (req: express.Request, res: express.Response) => {
    return res.sendFile(path.join(__dirname, `${extraPass}../dist`, 'index.html'));
})

const PORT = process.env.PORT || 3333
const httpServer = server.listen(PORT, () => {
    console.log("run on port " + PORT)
})
const io = socketServer(httpServer);

server.get("/reset", (req, res) => {
    io.to("1").emit("reset");
    // userCollection = {};
    labirint({});
    res.redirect('/');
})

interface IUserCollection {
    [key: string]: IUser;
}

interface IGameSession {
    id: string;
    type: string;//"Multy" | "Single";
    userCollection: IUserCollection;
    labitint: Array<Array<number>>;
    bonusCount: number;
}

const sessionCollection: IGameSession[] = [];  

// let userCollection: IUserCollection = {};
// let lab = [];
// let bonusCount = 0;

function labirint({width = 17, height = 17, cell = 40, blocks = 0.4}) {
    let lab = [];
    let border = [];
    for (let i = 0; i < height; i++) {
        let row = [];
        for (let j = 0; j < width; j++) {
            if (i === 0 || j === 0 || i === width - 1 || j === height - 1) {
                row[j] = 3;
            }
        }
        border.push(row)
    }

    let map = [[]];
    for (let i = 1; i < height - 1; i++) {
        let row = [];
        for (let j = 1; j < width - 1; j++) {
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
        for (let j = 1; j < width - 1; j++) {
            if (!(i % 2 !== 1 && j % 2 !== 1) && Math.random() < blocks) {
                row[j] = 1;
            }
        }
        wall.push(row);
    }
    wall[1][1] = wall[1][2] = wall[2][1] = 0;
    wall.push([])

    for (let i = 0; i < height; i++) {
        lab.push([]);
        for (let j = 0; j < width; j++) {
            lab[i][j] = border[i][j] || map[i][j] || wall[i][j] || 0;
        }
    }

    return lab;

}

// labirint();

function initMultyplayer() {
    let session = {
        id: "1",
        type: "Multy",
        userCollection: {},
        labitint: labirint({}),
        bonusCount: 0
    }

    setInterval(() => {
        if (session.bonusCount > 10) return;
        let id = Math.round(Math.random() * 10000);
        let type = Math.round(Math.random() * 17) % 3 + 1;
        let x,y;
    
        while (!x && !y) {
            let tempX = Math.round(Math.random() * 16)
            let tempY = Math.round(Math.random() * 16)
    
            if (session.labitint[tempY][tempX] === 0) {
                x = tempX * 40;
                y = tempY * 40;
                session.labitint[tempY][tempX] = 3 + type;
            }
        }
    
        console.log(`bonus appear type ${type} with x: ${x}, y: ${y}`)
        session.bonusCount++;
        io.to(session.id).emit(`room ${session.id}`,"bonus appear", {
            type,
            x,
            y,
            id
        })
    }, 15000)

    sessionCollection.push(session);
    return session;
}

function initSigleplayer(id, socket) {
    let session = {
        id,
        type: "Single",
        userCollection: {},
        labitint: [],
        bonusCount: 0
    }

    setInterval(() => {
        if (session.bonusCount > 5) return;
        let id = Math.round(Math.random() * 10000);
        let type = Math.round(Math.random() * 17) % 3 + 1;
        let x,y;
    
        while (!x && !y) {
            let tempX = Math.round(Math.random() * 16)
            let tempY = Math.round(Math.random() * 16)
    
            if (session.labitint[tempY][tempX] === 0) {
                x = tempX * 40;
                y = tempY * 40;
                session.labitint[tempY][tempX] = 3 + type;
            }
        }
    
        console.log(`room ${session.id} - ${session.type}, bonus appear type ${type} with x: ${x}, y: ${y}`)
        session.bonusCount++;
        socket.emit("bonus appear", {
            type,
            x,
            y,
            id
        })
    }, 20000)
    
    sessionCollection.push(session);
    return session;
}

io.on("connection", (socket) => {
    
    socket.on("start", ({ multiplayer }) => {

        // console.log(multiplayer)
        let session: IGameSession
        // let name: string;

        if (multiplayer) {
             session = sessionCollection.find(ses => ses.type === "Multy") || initMultyplayer()
        } else {
            session = sessionCollection.find(ses => ses.id === socket.id) || initSigleplayer(socket.id, socket);
            session.labitint = labirint({});
        }

        socket.join(session.id);

        socket.emit("welcome", { players: session.userCollection, map: session.labitint });

        if (session.userCollection[socket.id])
            return;
        
        
        for (let a in session.userCollection) {
            // console.log(a, userCollection[a])
            if (session.userCollection[a].name) {
                console.log(session.userCollection[a].name, "should be displayed to", socket.id)
                // socket.emit("new player", userCollection[a].name);
            }
        }

        
        
            session.userCollection[socket.id] = {
                name: "",
                nick: "",
                skills: [],
                exp: 0
            }

            socket.on("set data", (data) => {
                if (data && data.name) {
                    session.userCollection[socket.id].name = data.name;
                    io.to(session.id).emit("new player", session.userCollection[socket.id].name)
                } else {
                    delete session.userCollection[socket.id];
                }
                console.log(data);
            })
        
        
        console.log('a new user connected', socket.id);

        socket.on("direction", (data) => {
            // console.log(session.userCollection[socket.id])
            session.userCollection[socket.id] && io.to(session.id).emit("move block", {
                player: session.userCollection[socket.id].name,
                move: data
            })
        })

        socket.on("player killed", ({ name, id }) => {

            for(let user in session.userCollection) {
                if (session.userCollection[user].name === name) {
                    delete session.userCollection[user];
                    break;
                }
            }

            io.to(session.id).emit("player killed", { name, id });
        })

        socket.on("playerHitBonus", (data) => {
            // console.log("playerHitBonus", data)
            let xBlock = (data.x - data.x % 40) / 40
            let yBlock = (data.y - data.y % 40) / 40

            console.log("bonus removed at", xBlock, yBlock);

            session.labitint[yBlock][xBlock] = 0;
            session.bonusCount--;
            io.to(session.id).emit("player hit bonus", data)
        })

        socket.on("sync positon", ({ x, y }) => {
            session.userCollection[socket.id] && io.to(session.id).emit("sync positon", {
                player: session.userCollection[socket.id].name,
                x, y
            })
        })

        socket.on("required sync", () => {
            console.log( session.userCollection[socket.id] && session.userCollection[socket.id].name, "required positon sync")
            io.to(session.id).emit("required sync")
        })

        socket.on('block explode', ({ x, y }) => {
            let xBlock = (x - x % 40) / 40
            let yBlock = (y - y % 40) / 40

            console.log("block removed at", xBlock, yBlock);

            session.labitint[yBlock][xBlock] = 0;
        })

        socket.on("bomb", (data) => {

            if (data.action) {
                if (data.action === "explode") {
                    io.to(session.id).emit("bomb", {
                        id: data.id,
                        state: "explode",
                        level: data.level
                    });
                }
            } else {
                let id = Math.round(Math.random() * 10000);
                console.log("bomb", data);

                io.to(session.id).emit("bomb", {
                    id,
                    state: "set",
                    level: data.level,
                    x: data.x,
                    y: data.y,
                    player: data.player
                });

                if (!data.action) {
                    setTimeout(() => {
                        io.to(session.id).emit("bomb", {
                            id,
                            state: "explode",
                            level: data.level
                        });
                    }, 2000)
                }
            }
            
        });

        socket.on('disconnect', (data) => {
            console.log('user disconnected', data, socket.id, session.userCollection);
            if (session.userCollection[socket.id])
                io.to(session.id).emit("remove user", session.userCollection[socket.id] && session.userCollection[socket.id].name || null)
                // delete session.userCollection[socket.id];
        });

    });
})
