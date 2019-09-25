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
    width: 680, 
    height: 680,                       
    antialias: true, 
    transparent: false, 
    resolution: 1
  }
);

function createPlayer(title) {
    let animals = new PIXI.Container() as any;
    let cat = new Sprite(resources["cat"].texture) ;
    let text = new PIXI.Text(title, new PIXI.TextStyle({fontFamily: "Arial",
    fontSize: 10,
    fill: "black"}));
    text.position.x = 5;
    text.position.y = 30;

    cat.height = 30;
    animals.height =  40;
    animals.width = cat.width = 40;
    

    var mask = new PIXI.Graphics().beginFill(0x8bc5ff).drawRect(0,0, 40, 40).endFill();
    // animals.mask = mask;
    animals.addChild(mask);

    animals.x = 100;
    animals.y = 100;

    animals.vx = 0;
    animals.vy = 0;

    animals.addChild(cat);
    animals.addChild(text);

    return animals;
  }

  function newPlayerHandler(player) {
    console.log("new player added", player);
    let playerObj = createPlayer(player);
    cats[player] = playerObj;
    console.log(cats)
    app.stage.addChild(playerObj);
  }

  function moveBlockHandler({player, move}) {
    console.log("moveBlockHandler", player, move);

    cats[player].vx = typeof move.x === "number" ? move.x : cats[player].vx;
    cats[player].vy = typeof move.y === "number" ? move.y : cats[player].vy;

    // console.log(cats[player].vx, cats[player].vy, +(new Date()))
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

    socket.on("new player", newPlayerHandler);
    socket.on("move block", moveBlockHandler);
    socket.on("remove user", removeUserHandler)


    for (let i = 0; i < 17; i++) {
        for (let j = 0; j < 17; j++ ) {
            if (i === 0 || j === 0 || i === 16 || j === 16 || (i % 2 !== 1 && j % 2 !== 1)) {
                let rectangle = new PIXI.Graphics();
                rectangle.lineStyle(1, 0xFF3300, 1);
                rectangle.beginFill(0x66CCFF);
                rectangle.drawRect(1, 1, 38 , 38);
                rectangle.endFill();
                rectangle.x = i * 40;
                rectangle.y = j * 40;
                app.stage.addChild(rectangle);
            }
        }
    }

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
            // y : 0
        });
        
      };
      
      left.release = () => {
            socket.emit('direction', {
                x : 0,
                // y : 0
            });
      };
    
      //Up
      up.press = () => {
        socket.emit('direction', {
            y : -5,
            // x : 0
        });
      };
      up.release = () => {
        socket.emit('direction', {
            // x : 0,
            y : 0
        });
      };
    
      //Right
      right.press = () => {
        socket.emit('direction', {
            x : 5,
            // y : 0
        });
      };
      right.release = () => {
        socket.emit('direction', {
            x : 0,
            // y : 0
        });
      };
    
      //Down
      down.press = () => {
        socket.emit('direction', {
            // x : 0,
            y : 5
        });
      };

      down.release = () => {
        socket.emit('direction', {
            // x : 0,
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
        // console.log(p)rs
        if (cats[p].vx || cats[p].vy || p == "1") {
            // console.log(p,cats[p].vx,cats[p].vy, cats[p].x, cats[p].y )
        } 
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

    

    loader
    .add("cat","http://localhost:3333/public/cat.png")
    .on("progress", loadProgressHandler)
    .load(setup);
  })