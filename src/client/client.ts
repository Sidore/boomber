import * as PIXI from 'pixi.js';
import io from 'socket.io-client';
import board from "./keyboard";
// import cat from "./cat.png"

const root = document.getElementById("app");
let currentUser, globalPlayers

  var socket = io("http://localhost:3333");

  socket.on('movement', function(msg){
     console.log(msg)
    });

    let cats : any = {}, state, blocks = []

let app = new PIXI.Application({ 
    width: 681, 
    height: 681,                       
    antialias: true, 
    transparent: false, 
    resolution: 1,
    backgroundColor: 0x008b00
  }
);

function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '';
    for (var i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }


function playerImage(type?) : PIXI.Sprite[] {
    if (type === undefined) {
        type = Math.round(Math.random() * 8);
    }

    
    let array = [];
    

    for (let i = 0; i < 7; i++) {
        let T = resources["tileset"].texture;
        let rectangle = new PIXI.Rectangle(type * 24, i* 24, 24, 24);
        T.frame = rectangle;
        
        let sprite = new Sprite(T);
        sprite.height = sprite.width = 40;
        array.push(sprite);
    }

    return array;

}

function createPlayer(title: string) {
    let animals = new PIXI.Container() as any;
    // let catT = resources["tileset"].texture;
    let typePlayer = Math.round(Math.random() * 8);
    let cat = playerImage(typePlayer);

    // let rectangle = new PIXI.Rectangle(x * 24, y* 24, 24, 24);
    let text = new PIXI.Text(title, new PIXI.TextStyle({fontFamily: "Arial",
    fontSize: 10,
    fill: "black"}));
    text.position.x = 5;
    text.position.y = 28;
    animals.height =  40;
    animals.width = 40;
    

    var mask = new PIXI.Graphics().beginFill(+("0x" + getRandomColor())).drawRect(0, 30, 40, 10).endFill();

    animals.x = 40;
    animals.y = 40
    ;

    animals.vx = 0;
    animals.vy = 0;
    animals.addChild(cat[0]);
    animals.addChild(mask);

    animals.addChild(text);
    animals.playerTypes = cat;
    animals.typePlayer = typePlayer
    console.log(animals.typePlayer)
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

  function hitTestRectangle(r1, r2) {

    //Define the variables we'll need to calculate
    let hit, combinedHalfWidths, combinedHalfHeights, vx, vy;
  
    //hit will determine whether there's a collision
    hit = false;
  
    //Find the center points of each sprite
    r1.centerX = r1.x + r1.width / 2;
    r1.centerY = r1.y + r1.height / 2;
    r2.centerX = r2.x + r2.width / 2;
    r2.centerY = r2.y + r2.height / 2;
  
    //Find the half-widths and half-heights of each sprite
    r1.halfWidth = r1.width / 2;
    r1.halfHeight = r1.height / 2;
    r2.halfWidth = r2.width / 2;
    r2.halfHeight = r2.height / 2;
  
    //Calculate the distance vector between the sprites
    vx = r1.centerX - r2.centerX;
    vy = r1.centerY - r2.centerY;
  
    //Figure out the combined half-widths and half-heights
    combinedHalfWidths = r1.halfWidth + r2.halfWidth;
    combinedHalfHeights = r1.halfHeight + r2.halfHeight;
  
    //Check for a collision on the x axis
    if (Math.abs(vx) < combinedHalfWidths) {
  
      //A collision might be occurring. Check for a collision on the y axis
      if (Math.abs(vy) < combinedHalfHeights) {
  
        //There's definitely a collision happening
        hit = true;
      } else {
  
        //There's no collision on the y axis
        hit = false;
      }
    } else {
  
      //There's no collision on the x axis
      hit = false;
    }
  
    //`hit` will be either `true` or `false`
    return hit;
  };

  function addCollisionProperties(sprite) {

    //Add properties to Pixi sprites
    // if (this.renderer === "pixi") {

      //gx
      if (sprite.gx === undefined) {
        Object.defineProperty(sprite, "gx", {
          get(){return sprite.getGlobalPosition().x},
          enumerable: true, configurable: true
        });
      }

      //gy
      if (sprite.gy === undefined) {
        Object.defineProperty(sprite, "gy", {
          get(){return sprite.getGlobalPosition().y},
          enumerable: true, configurable: true
        });
      }
      
      //centerX
      if (sprite.centerX === undefined) {
        Object.defineProperty(sprite, "centerX", {
          get(){return sprite.x + sprite.width / 2},
          enumerable: true, configurable: true
        });
      }

      //centerY
      if (sprite.centerY === undefined) {
        Object.defineProperty(sprite, "centerY", {
          get(){return sprite.y + sprite.height / 2},
          enumerable: true, configurable: true
        });
      }
      
      //halfWidth
      if (sprite.halfWidth === undefined) {
        Object.defineProperty(sprite, "halfWidth", {
          get(){return sprite.width / 2},
          enumerable: true, configurable: true
        });
      }
      
      //halfHeight
      if (sprite.halfHeight === undefined) {
        Object.defineProperty(sprite, "halfHeight", {
          get(){return sprite.height / 2},
          enumerable: true, configurable: true
        });
      }
      
      //xAnchorOffset
      if (sprite.xAnchorOffset === undefined) {
        Object.defineProperty(sprite, "xAnchorOffset", {
          get(){
            if (sprite.anchor !== undefined) {
              return sprite.width * sprite.anchor.x;
            } else {
              return 0;
            }
          },
          enumerable: true, configurable: true
        });
      }
      
      //yAnchorOffset
      if (sprite.yAnchorOffset === undefined) {
        Object.defineProperty(sprite, "yAnchorOffset", {
          get(){
            if (sprite.anchor !== undefined) {
              return sprite.height * sprite.anchor.y;
            } else {
              return 0;
            }
          },
          enumerable: true, configurable: true
        });
      }

      if (sprite.circular && sprite.radius === undefined) {
        Object.defineProperty(sprite, "radius", {
          get(){return sprite.width / 2},
          enumerable: true, configurable: true
        });
      }

      //Earlier code - not needed now.
      /*
      Object.defineProperties(sprite, {
        "gx": {
          get(){return sprite.getGlobalPosition().x},
          enumerable: true, configurable: true
        },
        "gy": {
          get(){return sprite.getGlobalPosition().y},
          enumerable: true, configurable: true
        },
        "centerX": {
          get(){return sprite.x + sprite.width / 2},
          enumerable: true, configurable: true
        },
        "centerY": {
          get(){return sprite.y + sprite.height / 2},
          enumerable: true, configurable: true
        },
        "halfWidth": {
          get(){return sprite.width / 2},
          enumerable: true, configurable: true
        },
        "halfHeight": {
          get(){return sprite.height / 2},
          enumerable: true, configurable: true
        },
        "xAnchorOffset": {
          get(){
            if (sprite.anchor !== undefined) {
              return sprite.height * sprite.anchor.x;
            } else {
              return 0;
            }
          },
          enumerable: true, configurable: true
        },
        "yAnchorOffset": {
          get(){
            if (sprite.anchor !== undefined) {
              return sprite.width * sprite.anchor.y;
            } else {
              return 0;
            }
          },
          enumerable: true, configurable: true
        }
      });
      */
    // }

    //Add a Boolean `_bumpPropertiesAdded` property to the sprite to flag it
    //as having these new properties
    sprite._bumpPropertiesAdded = true;
  }

  function rectangleCollision(
    r1, r2, bounce = false, global = true
  ) {

    //Add collision properties
    if (!r1._bumpPropertiesAdded) addCollisionProperties(r1);
    if (!r2._bumpPropertiesAdded) addCollisionProperties(r2);

    let collision, combinedHalfWidths, combinedHalfHeights,
      overlapX, overlapY, vx, vy;

    //Calculate the distance vector
    if (global) {
      vx = (r1.gx + Math.abs(r1.halfWidth) - r1.xAnchorOffset) - (r2.gx + Math.abs(r2.halfWidth) - r2.xAnchorOffset);
      vy = (r1.gy + Math.abs(r1.halfHeight) - r1.yAnchorOffset) - (r2.gy + Math.abs(r2.halfHeight) - r2.yAnchorOffset);
    } else {
      //vx = r1.centerX - r2.centerX;
      //vy = r1.centerY - r2.centerY;
      vx = (r1.x + Math.abs(r1.halfWidth) - r1.xAnchorOffset) - (r2.x + Math.abs(r2.halfWidth) - r2.xAnchorOffset);
      vy = (r1.y + Math.abs(r1.halfHeight) - r1.yAnchorOffset) - (r2.y + Math.abs(r2.halfHeight) - r2.yAnchorOffset);
    }

    //Figure out the combined half-widths and half-heights
    combinedHalfWidths = Math.abs(r1.halfWidth) + Math.abs(r2.halfWidth);
    combinedHalfHeights = Math.abs(r1.halfHeight) + Math.abs(r2.halfHeight);

    //Check whether vx is less than the combined half widths
    if (Math.abs(vx) < combinedHalfWidths) {

      //A collision might be occurring!
      //Check whether vy is less than the combined half heights
      if (Math.abs(vy) < combinedHalfHeights) {

        //A collision has occurred! This is good!
        //Find out the size of the overlap on both the X and Y axes
        overlapX = combinedHalfWidths - Math.abs(vx);
        overlapY = combinedHalfHeights - Math.abs(vy);

        //The collision has occurred on the axis with the
        //*smallest* amount of overlap. Let's figure out which
        //axis that is

        if (overlapX >= overlapY) {
          //The collision is happening on the X axis
          //But on which side? vy can tell us

          if (vy > 0) {
            collision = "top";
            //Move the rectangle out of the collision
            r1.y = r1.y + overlapY;
          } else {
            collision = "bottom";
            //Move the rectangle out of the collision
            r1.y = r1.y - overlapY;
          }

          //Bounce
          if (bounce) {
            r1.vy *= -1;

            /*Alternative
            //Find the bounce surface's vx and vy properties
            var s = {};
            s.vx = r2.x - r2.x + r2.width;
            s.vy = 0;
            //Bounce r1 off the surface
            //this.bounceOffSurface(r1, s);
            */

          }
        } else {
          //The collision is happening on the Y axis
          //But on which side? vx can tell us

          if (vx > 0) {
            collision = "left";
            //Move the rectangle out of the collision
            r1.x = r1.x + overlapX;
          } else {
            collision = "right";
            //Move the rectangle out of the collision
            r1.x = r1.x - overlapX;
          }

          //Bounce
          if (bounce) {
            r1.vx *= -1;

            /*Alternative
            //Find the bounce surface's vx and vy properties
            var s = {};
            s.vx = 0;
            s.vy = r2.y - r2.y + r2.height;
            //Bounce r1 off the surface
            this.bounceOffSurface(r1, s);
            */

          }
        }
      } else {
        //No collision
      }
    } else {
      //No collision
    }

    //Return the collision string. it will be either "top", "right",
    //"bottom", or "left" depending on which side of r1 is touching r2.
    return collision;
  }

  function contain(sprite, container) {

    let collision = undefined;
  
    //Left
    if (sprite.x < container.x) {
      sprite.x = container.x;
      collision = "left";
    }
  
    //Top
    if (sprite.y < container.y) {
      sprite.y = container.y;
      collision = "top";
    }
  
    //Right
    if (sprite.x + sprite.width > container.width) {
      sprite.x = container.width - sprite.width;
      collision = "right";
    }
  
    //Bottom
    if (sprite.y + sprite.height > container.height) {
      sprite.y = container.height - sprite.height;
      collision = "bottom";
    }
  
    //Return the `collision` value
    return collision;
  }

  function gameLoop(delta){
    state(delta);
  }

  function labirint() {
    for (let i = 0; i < 17; i++) {
        for (let j = 0; j < 17; j++ ) {
            if (i === 0 || j === 0 || i === 16 || j === 16 || (i % 2 !== 1 && j % 2 !== 1)) {
                let rectangle = new PIXI.Graphics();
                rectangle.lineStyle(1, 0x18181a, 1);
                rectangle.beginFill(0xabaaac);
                rectangle.drawRect(1, 1, 39 , 39);
                rectangle.endFill();
                rectangle.x = i * 40;
                rectangle.y = j * 40;
                if ((i % 2 !== 1 && j % 2 !== 1) && !(i === 0 || j === 0 || i === 16 || j === 16)) {
                    console.log(i,j);
                    blocks.push(rectangle);
                }       
                app.stage.addChild(rectangle);
            }
        }
    }
  }

  function setup() {

    socket.on("new player", newPlayerHandler);
    socket.on("move block", moveBlockHandler);
    socket.on("remove user", removeUserHandler)

    labirint();
    

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

      let speed = 5;

      left.press = () => {
        socket.emit('direction', {
            x : -speed,
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
            y : -speed,
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
            x : speed,
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
            y : speed
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
        cats[p].x += cats[p].vx;
        cats[p].y += cats[p].vy;

        


        if(cats[p].vx > 0) {
            let rectangle = new PIXI.Rectangle(cats[p].typePlayer * 24, 4 * 24, 24, 24);
            cats[p].children[0].texture.frame = rectangle;
        } else if(cats[p].vx < 0) {
            let rectangle = new PIXI.Rectangle(cats[p].typePlayer * 24, 8 * 24, 24, 24);
            cats[p].children[0].texture.frame = rectangle;
        } else if(cats[p].vy > 0) {
            let rectangle = new PIXI.Rectangle(cats[p].typePlayer * 24, 1 * 24, 24, 24);
            cats[p].children[0].texture.frame = rectangle;
        } else if(cats[p].vy < 0) {
            let rectangle = new PIXI.Rectangle(cats[p].typePlayer * 24, 10 * 24, 24, 24);
            cats[p].children[0].texture.frame = rectangle;
        } else if( cats[p].vy === 0 || cats[p].vx === 0) {
            let rectangle = new PIXI.Rectangle(cats[p].typePlayer * 24, 0 * 24, 24, 24);
            cats[p].children[0].texture.frame = rectangle;
        }





        if (cats[p].vx || cats[p].vy || p == "1") {
            // console.log(p,cats[p].vx,cats[p].vy, cats[p].x, cats[p].y )
        } 
        let hitBorders = contain(cats[p], {
          x: 40, y:40 , width: 640, height: 640
        })

        if ( hitBorders === "top" || hitBorders === "bottom") {
            cats[p].vy = 0;
        }

        if ( hitBorders === "left" || hitBorders === "right") {
            cats[p].vx = 0;
        }

        // if (cats[p].vy || cats[p].vx)
        blocks.forEach(block => {
            // if (hitTestRectangle(cats[p], block)) {
            //     if (cats[p].vx) {
            //         cats[p].x -= cats[p].vx;
            //     }
            //     if (cats[p].vy) {
            //         cats[p].y -= cats[p].vy;
            //     }
            // }
            let hit = rectangleCollision(cats[p], block)

            // if (hit) 
            // console.log(hit)

            if ( hit === "top" || hit === "bottom") {
                // cats[p].vy = 0;
            }
    
            if ( hit === "left" || hit === "right") {
                // cats[p].vx = 0;
            }
        })
    }

  }

  socket.on("welcome", (players) => {
      console.log("welcome to ws", players)
      globalPlayers = players;

      socket.emit('set data', {
        name : currentUser = prompt("name", "user " + Math.round(Math.random() * 100))
      });

     
    loader
    .add("tileset","http://localhost:3333/public/bomberman.png")
    .on("progress", loadProgressHandler)
    .load(setup);
  })