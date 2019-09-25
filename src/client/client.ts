import * as PIXI from 'pixi.js';
import io from 'socket.io-client';
import board from "./keyboard";
// import cat from "./cat.png"

const root = document.getElementById("app");
let currentUser, globalPlayers

  var socket = io("http://localhost:3333");
  

//   document.addEventListener("keydown", (event : KeyboardEvent) => {
//     let e: KeyboardEvent = event || window.event as KeyboardEvent;

//     if (e.keyCode == 38) {
//       socket.emit('direction',"up");
//     }
//     else if (e.keyCode == 40) {
//       socket.emit('direction',"down");
//         // down arrow
//     }
//     else if (e.keyCode == 37) {
//       socket.emit('direction',"left");
//        // left arrow
//     }
//     else if (e.keyCode == 39) {
//       socket.emit('direction',"right");
//        // right arrow
//     }

//   });

  socket.on('movement', function(msg){
     console.log(msg)
    });

  
    let cats : any = {}, state

let app = new PIXI.Application({ 
    // width: 256, 
    // height: 256,                       
    antialias: true, 
    transparent: false, 
    resolution: 1
  }
);

function createPlayer(title) {
    let cat = new Sprite(resources["cat"].texture) as any;
    cat.x = 100;
    cat.y = 100;

    cat.vx = 0;
    cat.vy = 0;

    return cat;
  }

  function newPlayerHandler(player) {
    console.log("new player added", player);
    let playerObj = createPlayer(player);
    cats[player] = playerObj;
    app.stage.addChild(playerObj);
  }

  function moveBlockHandler({player, move}) {
    console.log("moveBlockHandler", player, move);

    cats[player].vx = typeof move.x === "number" ? move.x : cats[player].vx;
    cats[player].vy = typeof move.y === "number" ? move.y : cats[player].vy;

  }

  function removeUserHandler(player) {
      console.log(`${player} has been removed`)
    app.stage.removeChild(cats[player])
    delete cats[player];
  }
// let base = new PIXI.BaseTexture(anyImageObject),
//     texture = new PIXI.Texture(base),
//     sprite = new PIXI.Sprite(texture);
const { loader } = app;
const { resources } = loader;
const { Sprite } = PIXI;
document.body.appendChild(app.view);

function loadProgressHandler(loader, resource) {
    console.log("loading: " + resource.url); 
    console.log("progress: " + loader.progress + "%"); 
    //console.log("loading: " + resource.name);
  }



  function gameLoop(delta){
    state(delta);
  }

  function setup() {

    for (let a in globalPlayers) {
        newPlayerHandler(globalPlayers[a].name);
      }

    let playerObj = createPlayer(currentUser);
    cats[currentUser] = playerObj;
    app.stage.addChild(playerObj);

    let left = board("ArrowLeft"),
      up = board("ArrowUp"),
      right = board("ArrowRight"),
      down = board("ArrowDown");

      left.press = () => {
        socket.emit('direction', {
            x : -5,
            y : 0
        });
        
      };
      
      left.release = () => {
            socket.emit('direction', {
                x : 0,
                y : 0
            });
      };
    
      //Up
      up.press = () => {
        socket.emit('direction', {
            y : -5,
            x : 0
        });
      };
      up.release = () => {
        socket.emit('direction', {
            x : 0,
            y : 0
        });
      };
    
      //Right
      right.press = () => {
        socket.emit('direction', {
            x : 5,
            y : 0
        });
      };
      right.release = () => {
        socket.emit('direction', {
            x : 0,
            y : 0
        });
      };
    
      //Down
      down.press = () => {
        socket.emit('direction', {
            x : 0,
            y : 5
        });
      };

      down.release = () => {
        socket.emit('direction', {
            x : 0,
            y : 0
        });
      };

  console.log("All files loaded");
  
  state = play;

  app.ticker.add(delta => gameLoop(delta));
}

function play(delta) {
    //Use the cat's velocity to make it move
    for(let p in cats) {
        cats[p].x += cats[p].vx;
        cats[p].y += cats[p].vy;
    }

  }

  socket.on("welcome", (players) => {
      console.log("welcome to ws", players)
      globalPlayers = players;
      

      socket.emit('set data', {
        name : currentUser = prompt("name", "user " + Math.round(Math.random() * 100))
      });

    socket.on("new player", newPlayerHandler);
    socket.on("move block", moveBlockHandler);
    socket.on("remove user", removeUserHandler)

    loader
    .add("cat","http://localhost:3333/public/cat.png")
    .on("progress", loadProgressHandler)
    .load(setup);
  })