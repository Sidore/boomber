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
server.use("/dist", express.static(path.join(__dirname, `${extraPass}../dist`)));
server.use("/public", express.static(path.join(__dirname, `${extraPass}../public`)));


server.get("/", (req: express.Request, res: express.Response) => {
    return res.sendFile(path.join(__dirname, `${extraPass}../dist`, 'index.html'));
})

server.get("/reset", (req, res) => {
    userCollection = {};
    labirint();
    res.redirect('/');
})

const httpServer = server.listen(process.env.PORT || 3333, () => {
    console.log("run on port " + process.env.PORT)
})

interface IUserCollection {
    [key: string]: IUser;
}

let userCollection: IUserCollection = {};
let lab = [];
let bonusCount = 0;

function labirint(width = 17, height = 17, cell = 40) {
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
            if (!(i % 2 !== 1 && j % 2 !== 1) && Math.random() < 0.4) {
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

}

labirint();
const io = socketServer(httpServer);


setInterval(() => {
    if (bonusCount > 5) return;
    let id = Math.round(Math.random() * 10000);
    let type = Math.round(Math.random() * 17) % 3 + 1;
    let x,y;

    while (!x && !y) {
        let tempX = Math.round(Math.random() * 16)
        let tempY = Math.round(Math.random() * 16)

        if (lab[tempY][tempX] === 0) {
            x = tempX * 40;
            y = tempY * 40;
            lab[tempY][tempX] = 3 + type;
        }
    }

    console.log(`bonus appear type ${type} with x: ${x}, y: ${y}`)
    bonusCount++;
    io.emit("bonus appear", {
        type,
        x,
        y,
        id
    })
}, 25000)

// setInterval(() => {
//     io.emit("lab sync", {map: lab})
// }, 2000)

io.on("connection", (socket) => {

    socket.emit("welcome", { players: userCollection, map: lab });
    for (let a in userCollection) {
        // console.log(a, userCollection[a])
        if (userCollection[a].name) {
            console.log(userCollection[a].name, "should be displayed to", socket.id)
            // socket.emit("new player", userCollection[a].name);
        }
    }

    userCollection[socket.id] = {
        name: "",
        nick: "",
        skills: [],
        exp: 0
    }
    console.log('a new user connected', socket.id);

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
        userCollection[socket.id] && io.emit("move block", {
            player: userCollection[socket.id].name,
            move: data
        })
    })

    socket.on("playerHitBonus", (data) => {
        // console.log("playerHitBonus", data)
        let xBlock = (data.x - data.x % 40) / 40
        let yBlock = (data.y - data.y % 40) / 40

        console.log("bonus removed at", xBlock, yBlock);

        lab[yBlock][xBlock] = 0;
        bonusCount--;
        io.emit("player hit bonus", data)
    })

    socket.on("sync positon", ({ x, y }) => {
        userCollection[socket.id] && io.emit("sync positon", {
            player: userCollection[socket.id].name,
            x, y
        })
    })

    socket.on("required sync", () => {
        console.log( userCollection[socket.id] && userCollection[socket.id].name, "required positon sync")
        io.emit("required sync")
    })

    socket.on('block explode', ({ x, y }) => {
        let xBlock = (x - x % 40) / 40
        let yBlock = (y - y % 40) / 40

        console.log("block removed at", xBlock, yBlock);

        lab[yBlock][xBlock] = 0;
    })

    socket.on("bomb", (data) => {

        if (data.action) {
            if (data.action === "explode") {
                io.emit("bomb", {
                    id: data.id,
                    state: "explode",
                    level: data.level
                });
            }
        } else {
            let id = Math.round(Math.random() * 10000);
            console.log("bomb", data);

            io.emit("bomb", {
                id,
                state: "set",
                level: data.level,
                x: data.x,
                y: data.y,
                player: data.player
            });

            if (!data.action) {
                setTimeout(() => {
                    io.emit("bomb", {
                        id,
                        state: "explode",
                        level: data.level
                    });
                }, 2000)
            }
        }
        
    });

    socket.on('disconnect', (data) => {
        console.log('user disconnected', data, socket.id, userCollection);
        if (userCollection[socket.id])
            io.emit("remove user", userCollection[socket.id] && userCollection[socket.id].name || null)
    });
})
