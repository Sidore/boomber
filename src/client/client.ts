import * as PIXI from 'pixi.js';
import io from 'socket.io-client';
import board from "./keyboard";

const root = document.getElementById("application");
let currentUser, 
    globalPlayers, 
    bombs = {},
    bonuses = [],
    explosions = [], 
    mapBlocks;
let players: any = {},
    state = null, 
    blocks = [];

let debugCollision: any = {};
const dev = location && location.hostname == "localhost" || false;
const serverUrl = dev ? "http://localhost:3333" : "";
const socket = io(serverUrl);
const application = new PIXI.Application({
  width: 680,
  height: 680,
  antialias: true,
  transparent: false,
  resolution: 1,
  backgroundColor: 0x008b00
});
const { loader, stage } = application;
const { resources } = loader;
const { Sprite } = PIXI;
const backLayot = new PIXI.Container();
const bombsLayot = new PIXI.Container();
const mapLayout = new PIXI.Container();
const playersLayout = new PIXI.Container();
const bonusLayout = new PIXI.Container();
stage.addChild(backLayot);
stage.addChild(bombsLayot);
stage.addChild(mapLayout);
stage.addChild(bonusLayout);
stage.addChild(playersLayout);

socket.on('movement', function (msg) {
  console.log(msg)
});

function getRandomColor() {
  let letters = '0123456789ABCDEF';
  let color = '';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function playerImage(type?): PIXI.Sprite {
  if (type === undefined) {
    type = Math.round(Math.random() * 7);
  }
  let T = resources["tileset"].texture.baseTexture;
  let rectangle = new PIXI.Rectangle(type * 24, 0 * 24, 24, 24);
  let sprite = new Sprite(new PIXI.Texture(T, rectangle));
  sprite.height = sprite.width = 40;
  return sprite;
}

function setBomb({ id, x, y, level, player }) {
  let bomb = new PIXI.Container() as any;
  
  let T = resources["bomb"].texture.baseTexture;
  let stage1 = new PIXI.Rectangle(0, 0, 16, 16);
  let stage2 = new PIXI.Rectangle(17, 0, 16, 16);
  let stage3 = new PIXI.Rectangle(34, 0, 16, 16);

  let sprite = new Sprite(new PIXI.Texture(T, stage1));
  sprite.height = sprite.width = 40;

  setTimeout(() => {
    sprite.texture.frame = stage2;
  }, 300)
  setTimeout(() => {
    sprite.texture.frame = stage3;
  }, 600)
  setTimeout(() => {
    sprite.texture.frame = stage1;
  }, 900)
  setTimeout(() => {
    sprite.texture.frame = stage2;
  }, 1200)
  setTimeout(() => {
    sprite.texture.frame = stage3;
  }, 1500)

  bomb.addChild(sprite);
  bomb.x = x;
  bomb.y = y;
  bomb.id = id;
  bomb.player = player;
  bomb.level = level;
  bombs[id] = bomb;
  bombsLayot.addChild(bomb);
}

function explodeBomb({ id, level }, time = 1000) {
  const bomb = bombs[id];

  if (!bomb) return;

  const size = Number(level)

  const explodeHorizontal: any = new PIXI.Graphics;
  const explodeVertical: any = new PIXI.Graphics;
    explodeHorizontal.lineStyle(1, 0xcccccc, 1);
    explodeHorizontal.beginFill(0xff0000);
    explodeHorizontal.drawRect(1, 1, 40 * 2 * size + 39, 40 * 2 * size + 39);
    explodeHorizontal.endFill();
    explodeHorizontal.width = 40 * 2 * size + 40;
    explodeHorizontal.height = 40;
    explodeHorizontal.x = bomb.x - 40 * size;
    explodeHorizontal.y = bomb.y;
    explodeVertical.lineStyle(1, 0xcccccc, 1);
    explodeVertical.beginFill(0xff0000);
    explodeVertical.drawRect(1, 1, 40 * 2 * size + 39, 40 * 2 * size + 39);
    explodeVertical.endFill();
    explodeVertical.width = 40;
    explodeVertical.height = 40 * 2 * size + 40;
    explodeVertical.x = bomb.x;
    explodeVertical.y = bomb.y - 40 * size;
    bombsLayot.addChild(explodeHorizontal);
    bombsLayot.addChild(explodeVertical);
    explosions.push(explodeVertical,explodeHorizontal);
    explodeLimit(explodeHorizontal, explodeVertical, size);

    delete bombs[id];
    blocks
      .filter(b => b.type === 1)
      .forEach((bl) => {
      
      if ((hitTestRectangle(bl, explodeHorizontal) || hitTestRectangle(bl, explodeVertical))) {
        exploadBlock(bl)
        socket.emit("block explode", { x: bl.x, y: bl.y });
      }
    });


  for (let id in bombs) { // TODO bomb chain
    let bombTouched = bombs[id];
    if ((hitTestRectangle(bombTouched, explodeHorizontal) || hitTestRectangle(bombTouched, explodeVertical))) {
      // console.log({
      //   bomb: bombTouched,
      //   horizontal: hitTestRectangle(bombTouched, explodeHorizontal),
      //   vertical: hitTestRectangle(bombTouched, explodeVertical),

      // })
      if (bombTouched)
      setTimeout(() => {
        explodeBomb({
          id: bombTouched.id,
          level: bombTouched.level
        });
      }, 300)
    }

  }

  setTimeout(() => {
    explosions = explosions.filter(item => item !== explodeHorizontal && item !== explodeVertical)
    bombsLayot.removeChild(bomb);
    bombsLayot.removeChild(explodeHorizontal);
    bombsLayot.removeChild(explodeVertical);
  }, time);

}
 
function explodeLimit(horizontal, vertical, size) {
  const centerX = horizontal.x + size * 40;
  const centerY = vertical.y + size * 40;
  let directionUp = false,
        directionDown = false,
        directionLeft = false,
        directionRight = false

  blocks.forEach((block) => { // баг когда взрываешь справа второй блок от борта
    
    if (hitTestRectangle(block, horizontal)) {
      if (block.type === 1) {
        if (block.x < centerX) {
          let differenceX = block.x - horizontal.x;
          horizontal.x = block.x;
          horizontal.width = horizontal.width - differenceX;
        } else if(block.x >  centerX) {
          horizontal.width = horizontal.width + block.width - (horizontal.x + horizontal.width - block.x);
        }
      } else {
        if (block.x < centerX) {
          let differenceX = block.x - horizontal.x;
          horizontal.x = block.x + block.width;
          horizontal.width = horizontal.width - differenceX - block.width;
        } else if(block.x >  centerX) {
          horizontal.width = horizontal.width - (horizontal.x + horizontal.width - block.x) - block.width;
        }
      }
    }

    if (hitTestRectangle(block, vertical)) {
      if (block.type === 1) {
        if (block.y < centerY) {
          let differenceY = block.y - vertical.y;
          vertical.y = block.y;
          vertical.height = vertical.height - differenceY;
        } else if(block.y >  centerY) {
          vertical.height = vertical.height + block.height - (vertical.y + vertical.height - block.y);
        }
      } else {
        if (block.y < centerY) {
          let differenceY = block.y - vertical.y;
          vertical.y = block.y + block.height;
          vertical.height = vertical.height - differenceY - block.height;
        } else if(block.y >  centerY) {
          vertical.height = vertical.height - (vertical.y + vertical.height - block.y) - block.height;
        }
      }
    }
  })
}

function exploadBlock(block) {

  const index = blocks.findIndex(b => b === block)
  blocks.splice(index, 1);
  
  console.log("block hitted", block, index)

  let T = resources["blockdestroy"].texture.baseTexture;
  let coef = 40 / 16;
  if (T.height == 16) {
    T.width *= coef;
    T.height *= coef;
  }
  
  let rectangle = new PIXI.Rectangle(0,0,40,40);
  block.children[0].texture = new PIXI.Texture(T, rectangle)

  for(let i = 1; i < 7; i++) {
    setTimeout(() => {
      block.children[0].texture.frame = new PIXI.Rectangle(i * 40 + i * coef, 0,40,40);
    }, 200 * i);
  }

  setTimeout(() => {
    mapLayout.removeChild(block);
    
  }, 1500);

}


function bombHandler(bomb) {
  switch (bomb.state) {
    case "set": setBomb(bomb); break;
    case "explode": explodeBomb(bomb); break;
  }
}

function createPlayer(title: string) {
  let player = new PIXI.Container() as any;
  // let catT = resources["tileset"].texture;
  let typePlayer = Math.round(Math.random() * 7);
  // console.log("typePlayer", typePlayer)
  let image = playerImage(typePlayer);

  // let rectangle = new PIXI.Rectangle(x * 24, y* 24, 24, 24);
  let text = new PIXI.Text(title, new PIXI.TextStyle({
    fontFamily: "Arial",
    fontSize: 10,
    fill: "black"
  }));
  text.position.x = 5;
  text.position.y = 28;
  player.height = 40;
  player.width = 40;
  var mask = new PIXI.Graphics().beginFill(+("0x" + getRandomColor())).drawRect(0, 30, 40, 10).endFill();
  player.x = 40;
  player.y = 40;
  player.vx = 0;
  player.vy = 0;
  player.addChild(image);
  player.addChild(mask);
  player.addChild(text);
  player.typePlayer = typePlayer;
  player.bombLevel = 1;
  player.bombCount = 1;
  player.name = title;
  player.speed = 2;
  // console.log(player.typePlayer)
  return player;
}

function newPlayerHandler(player) {
  console.log("new player added", player);
  const playerObj = createPlayer(player);
  players[player] = playerObj;
  // console.log(players)
  playersLayout.addChild(playerObj);
}

function moveBlockHandler({ player, move }) {
  // console.log("moveBlockHandler", player, move);

  if (players[player]) {
    players[player].vx = typeof move.x === "number" ? move.x : players[player].vx;
    players[player].vy = typeof move.y === "number" ? move.y : players[player].vy;
  }


  // console.log(players[player].vx, players[player].vy, +(new Date()))
}

function syncPositionHandler({ player, x, y }) {
  console.log("sync positon for", player)
  if (players[player]) {
    players[player].x = typeof x === "number" ? x : players[player].x;
    players[player].y = typeof y === "number" ? y : players[player].y;
  }
}

function removeUserHandler(player) {
  console.log(`${player} has been removed`)
  stage.removeChild(players[player])
  delete players[player];
}
// let base = new PIXI.BaseTexture(anyImageObject),
//     texture = new PIXI.Texture(base),
//     sprite = new PIXI.Sprite(texture);

document.body.appendChild(application.view);

function loadProgressHandler(loader, resource) {
  console.log("loading: " + resource.url);
  console.log("progress: " + loader.progress + "%");
  //console.log("loading: " + resource.name);
}

function hitTestRectangle(r1, r2) {

  if (debugCollision.type === 1 && (r1 === debugCollision || r2 === debugCollision)) {
    debugger;
  }
  //Define the variables we'll need to calculate
  let hit, combinedHalfWidths, combinedHalfHeights, vx, vy;

  //hit will determine whether there's a collision
  hit = false;

  //Find the center points of each sprite
  let r1centerX = r1.x + r1.width / 2;
  let r1centerY = r1.y + r1.height / 2;
  let r2centerX = r2.x + r2.width / 2;
  let r2centerY = r2.y + r2.height / 2;

  //Find the half-widths and half-heights of each sprite
  let r1halfWidth = r1.width / 2;
  let r1halfHeight = r1.height / 2;
  let r2halfWidth = r2.width / 2;
  let r2halfHeight = r2.height / 2;

  //Calculate the distance vector between the sprites
  vx = r1centerX - r2centerX;
  vy = r1centerY - r2centerY;

  //Figure out the combined half-widths and half-heights
  combinedHalfWidths = r1halfWidth + r2halfWidth;
  combinedHalfHeights = r1halfHeight + r2halfHeight;

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
      get() { return sprite.getGlobalPosition().x },
      enumerable: true, configurable: true
    });
  }

  //gy
  if (sprite.gy === undefined) {
    Object.defineProperty(sprite, "gy", {
      get() { return sprite.getGlobalPosition().y },
      enumerable: true, configurable: true
    });
  }

  //centerX
  if (sprite.centerX === undefined) {
    Object.defineProperty(sprite, "centerX", {
      get() { return sprite.x + sprite.width / 2 },
      enumerable: true, configurable: true
    });
  }

  //centerY
  if (sprite.centerY === undefined) {
    Object.defineProperty(sprite, "centerY", {
      get() { return sprite.y + sprite.height / 2 },
      enumerable: true, configurable: true
    });
  }

  //halfWidth
  if (sprite.halfWidth === undefined) {
    Object.defineProperty(sprite, "halfWidth", {
      get() { return sprite.width / 2 },
      enumerable: true, configurable: true
    });
  }

  //halfHeight
  if (sprite.halfHeight === undefined) {
    Object.defineProperty(sprite, "halfHeight", {
      get() { return sprite.height / 2 },
      enumerable: true, configurable: true
    });
  }

  //xAnchorOffset
  if (sprite.xAnchorOffset === undefined) {
    Object.defineProperty(sprite, "xAnchorOffset", {
      get() {
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
      get() {
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
      get() { return sprite.width / 2 },
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

function gameLoop(delta) {
  state(delta);
}

function createBlock(type, i, j, cell, color = 0xabaaac, border = 0x18181a) {
  let rectangle = new PIXI.Container() as any;
  // rectangle.lineStyle(1, border, 1);
  // rectangle.beginFill(color);
  // rectangle.drawRect(1, 1, cell - 1, cell - 1);
  // rectangle.endFill();

  

  let tileTitle = "";

  if (type === 1 || type === 2) {
    tileTitle = `block${type}`
  } else if (i === 0 && j === 0) {
    tileTitle = "topleft"
  } else if (i === 0 && j === 16) {
    tileTitle = "topright"
  } else if (i === 0) {
    tileTitle = "block3"
  } else if (i === 16) {
    tileTitle = "down";
  } else if (j === 16 ) {
    tileTitle = "right"
  } else if (j === 0 ) {
    tileTitle = "left";
  }  

  let T = resources[tileTitle].texture.baseTexture;
  T.width = 40;
  T.height = 40;
  let sprite = new Sprite(new PIXI.Texture(T));

  rectangle.addChild(sprite)
  rectangle.x = j * cell;
  rectangle.y = i * cell;
  rectangle.type = type;
  blocks.push(rectangle);

  if (type === 2) {
    const grass = resources["grassshadow"].texture.baseTexture;
    grass.width = 40;
    grass.height = 40;
    sprite = new Sprite(new PIXI.Texture(grass));
    sprite.x = rectangle.x;
    sprite.y = rectangle.y + rectangle.height;
    backLayot.addChild(sprite);
  }

  return rectangle;
}

function playerHitBonus(player, index, {id, property , increment, x, y}){
  let indexB = bonuses.findIndex(b => b.id === id)
  if (indexB !== -1) {
    let bonus = bonuses.splice(indexB, 1)[0];
    bonusLayout.removeChild(bonus);
  }
  socket.emit("playerHitBonus", {
    playerId: index,
    property,
    increment,
    bonusId: id,
    x,y
  })
}

function playerHitBonusHandler({playerId,property,increment, bonusId}) {
  let index = bonuses.findIndex(b => b.id === bonusId)
  if (index !== -1) {
    let bonus = bonuses.splice(index, 1)[0];
    bonusLayout.removeChild(bonus);
  }
  let playerObj = players[playerId];
  playerObj[property] += increment;

  console.log(playerObj ,property, increment )
}

function labirint(cell = 40) {

  let height = mapBlocks.length;
  let width = mapBlocks[0].length;

  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      switch (mapBlocks[i][j]) { // TODO remove switch
        case 1: {
          let container = createBlock(1, i, j, cell, 0xb8c1ba);
          
          container.interactive = true;
          container.buttonMode = true;
          container.hitArea = new PIXI.Rectangle(0, 0, 39, 39);
          // stage.addChild(sprite);
          container.click = function (e) {
            debugCollision = container;
            console.log({
              x: this.x,
              y: this.y
            });
        }
          mapLayout.addChild(container); 
          break;}
        case 2: mapLayout.addChild(createBlock(2, i, j, cell)); break;
        case 3: mapLayout.addChild(createBlock(3, i, j, cell)); break;
        case 4: ;
        case 5: ;
        case 6: bonusAppearHandler({
          id: Math.round(Math.random() * 10000),
          type: mapBlocks[i][j] - 3,
          x: j * cell,
          y: i * cell
        }) 
      }
    }
  }
}

function bonusAppearHandler({id, type ,x ,y }) {
  console.log('bonusAppearHandler',x,y);
  let bonus = new PIXI.Container() as any;
  let tileTitle = "bomblevel";

  switch(type) {
    case 1: {
      bonus.property = "bombLevel";
      bonus.increment = 1;
      break;
    }
    case 2: {
      bonus.property = "bombCount";
      tileTitle = "bombcount";
      bonus.increment = 1;
      break;
    }
    case 3: {
      bonus.property = "speed";
      tileTitle = "speed";
      bonus.increment = 1;
      break;
    }
  }

  let T = resources[tileTitle].texture.baseTexture;
  T.width = 40;
  T.height = 40;
  let sprite = new Sprite(new PIXI.Texture(T));
  bonus.addChild(sprite);
  bonus.id = id;
  bonus.x = x;
  bonus.y = y;
  
  bonuses.push(bonus);
  bonusLayout.addChild(bonus);
}

function setup() {

  const grass = resources["grass"].texture.baseTexture;
  grass.width = 40;
  grass.height = 40;
  let sprite = new (PIXI as any).TilingSprite(new PIXI.Texture(grass),681,681);
  backLayot.addChild(sprite);

  labirint();

  for (let a in globalPlayers) {
    newPlayerHandler(globalPlayers[a].name);
  }

  let playerObj = createPlayer(currentUser);

  players[currentUser] = playerObj;
  playersLayout.addChild(playerObj);

  socket.on("new player", (data) => {
    socket.emit('sync positon', { x: playerObj.x, y: playerObj.y })
    newPlayerHandler(data);
  });

  socket.on("required sync", (data) => {
    socket.emit('sync positon', { x: playerObj.x, y: playerObj.y })
  });

  socket.on("lab sync", ({map}) => {
    mapBlocks = map;
    labirint();
  })

  //
  setInterval(() => {
    socket.emit('sync positon', { x: playerObj.x, y: playerObj.y })
  }, 500)

  socket.on("move block", moveBlockHandler);
  socket.on("remove user", removeUserHandler);
  socket.on("sync positon", syncPositionHandler);
  socket.on("bomb", bombHandler);

  socket.on("bonus appear", bonusAppearHandler);
  socket.on("player hit bonus", playerHitBonusHandler);

  let left = board("ArrowLeft"),
    up = board("ArrowUp"),
    right = board("ArrowRight"),
    down = board("ArrowDown"),
    space = board(" "),
    enter = board("Enter")

  space.press = enter.press = () => {

    let count = 0;

    for (let bombId in bombs) {
      if (bombs[bombId].player === playerObj.name) {
        count++;
      }
    }

    // console.log(count, playerObj)

    if (count < playerObj.bombCount) {
      const shiftX = playerObj.x % 40;
      const shiftY = playerObj.y % 40;
      socket.emit('bomb', {
        x: playerObj.x - (shiftX > 20 ? -(40 - shiftX) : shiftX),
        y: playerObj.y - (shiftY > 20 ? -(40 - shiftY) : shiftY),
        level: playerObj.bombLevel,
        player: playerObj.name
      })
    } else {
      console.log("too many boombs", count, playerObj.bombCount)
    }
  }

  left.press = () => {
    socket.emit('direction', {
      x: -playerObj.speed,
      // y : 0
    });

  };

  left.release = () => {
    socket.emit('direction', {
      x: 0,
      // y : 0
    });
  };

  //Up
  up.press = () => {
    socket.emit('direction', {
      y: -playerObj.speed,
      // x : 0
    });
  };
  up.release = () => {
    socket.emit('direction', {
      // x : 0,
      y: 0
    });
  };

  //Right
  right.press = () => {
    socket.emit('direction', {
      x: playerObj.speed,
      // y : 0
    });
  };
  right.release = () => {
    socket.emit('direction', {
      x: 0,
      // y : 0
    });


  };

  //Down
  down.press = () => {
    socket.emit('direction', {
      // x : 0,
      y: playerObj.speed
    });
  };

  down.release = () => {
    socket.emit('direction', {
      // x : 0,
      y: 0
    });
  };

  console.log("All files loaded");

  state = play;

  application.ticker.add(delta => gameLoop(delta));
}

function play(delta) {
  //Use the cat's velocity to make it move
  for (let p in players) {
    // console.log(p)rs
    players[p].x += players[p].vx;
    players[p].y += players[p].vy;

    animatePlayer(players[p],p);

    let hitBorders = contain(players[p], {
      x: 40, y: 40, width: 640, height: 640
    })

    if (hitBorders === "top" || hitBorders === "bottom") {
      players[p].vy = 0;
    }

    if (hitBorders === "left" || hitBorders === "right") {
      players[p].vx = 0;
    }

    // if (players[p].vy || players[p].vx)
    blocks.forEach(block => {
      let hit = rectangleCollision(players[p], block)
      if (hit === "top" || hit === "bottom") {
        // players[p].vy = 0;
      }

      if (hit === "left" || hit === "right") {
        // players[p].vx = 0;
      }
    })

    explosions.forEach(exp => {
      if (players[p] && hitTestRectangle(players[p],exp)) {
        killPlayer(players[p],p);
      }
    })

    bonuses.forEach(bonus => {
      if (players[p] && hitTestRectangle(players[p],bonus)) {
        playerHitBonus(players[p],p,bonus);
      }
    })
  }

}

function killPlayer(player,id) {
  console.log(`player "${player.name}" killed`)

  let rectangle = new PIXI.Rectangle(player.typePlayer * 24, 12 * 24, 24, 24);
  player.children[0].texture.frame = rectangle;
  delete players[id];

  for (let i = 1; i < 8; i++) {
    setTimeout(() => {
      rectangle = new PIXI.Rectangle(player.typePlayer * 24, (12 + i) * 24, 24, 24);
      player.children[0].texture.frame = rectangle;
    }, 200 * i);
  }

  setTimeout(() => {
    playersLayout.removeChild(player);
  }, 1800);

}

function animatePlayer(player,id) {

  const time = 500;
  const phase = +new Date() % time < (time / 2) ? 1 : 0;

  if (player.vx > 0) {
    let rectangle = new PIXI.Rectangle(player.typePlayer * 24, (4 + phase) * 24, 24, 24);
    player.children[0].texture.frame = rectangle;
  } else if (player.vx < 0) {
    let rectangle = new PIXI.Rectangle(player.typePlayer * 24, (7 + phase) * 24, 24, 24);
    player.children[0].texture.frame = rectangle;
  } else if (player.vy > 0) {
    let rectangle = new PIXI.Rectangle(player.typePlayer * 24, (1 + phase) * 24, 24, 24);
    player.children[0].texture.frame = rectangle;
  } else if (player.vy < 0) {
    let rectangle = new PIXI.Rectangle(player.typePlayer * 24, (10 + phase) * 24, 24, 24);
    player.children[0].texture.frame = rectangle;
  } else if (player.vy === 0 || player.vx === 0) {
    let rectangle = new PIXI.Rectangle(player.typePlayer * 24, 0 * 24, 24, 24);
    players[id].children[0].texture.frame = rectangle;
  }
}

socket.on("welcome", ({ players, map }) => {
  console.log("welcome to ws", players, map)
  globalPlayers = players;
  mapBlocks = map;

  socket.emit('set data', {
    name: currentUser = prompt("name", "user " + Math.round(Math.random() * 100))
  });

  socket.emit("required sync");
  
  loader
    .add("tileset", `${serverUrl}/public/bomberman.png`)
    .add("bomb", `${serverUrl}/public/bomb.png`)
    .add("bomblevel", `${serverUrl}/public/bomblevel.png`)
    .add("bombcount", `${serverUrl}/public/bombcount.png`)
    .add("speed", `${serverUrl}/public/speed.png`)
    .add("grass", `${serverUrl}/public/grass.png`)
    .add("grassshadow", `${serverUrl}/public/grassshadow.png`)
    .add("block1", `${serverUrl}/public/block1.png`)
    .add("block2", `${serverUrl}/public/block2.png`)
    .add("block3", `${serverUrl}/public/block3.png`)
    .add("blockdestroy", `${serverUrl}/public/blockdestroy.png`)
    .add("down", `${serverUrl}/public/down.png`)
    .add("left", `${serverUrl}/public/left.png`)
    .add("right", `${serverUrl}/public/right.png`)
    .add("topleft", `${serverUrl}/public/topleft.png`)
    .add("topright", `${serverUrl}/public/topright.png`)
    .add("monsters", `${serverUrl}/public/12.gif`)
    // .add("hero", `${serverUrl}/public/13.gif`)
    .on("progress", loadProgressHandler)
    .load(setup);
})

window.addEventListener(
  'load',
  function () {
      var canvas = document.getElementsByTagName('canvas')[0];
      fullscreenify(canvas);
  },
  false
);

function fullscreenify(canvas) {
  var style = canvas.getAttribute('style') || '';
  
  window.addEventListener('resize', function () {resize(canvas);}, false);

  resize(canvas);

  function resize(canvas) {
      var scale:any = {x: 1, y: 1};
      scale.x = (window.innerWidth - 10) / canvas.width;
      scale.y = (window.innerHeight - 10) / canvas.height;
      
      if (scale.x < 1 || scale.y < 1) {
          scale = '1, 1';
      } else if (scale.x < scale.y) {
          scale = scale.x + ', ' + scale.x;
      } else {
          scale = scale.y + ', ' + scale.y;
      }
      
      canvas.setAttribute('style', style + ' ' + '-ms-transform-origin: center top; -webkit-transform-origin: center top; -moz-transform-origin: center top; -o-transform-origin: center top; transform-origin: center top; -ms-transform: scale(' + scale + '); -webkit-transform: scale3d(' + scale + ', 1); -moz-transform: scale(' + scale + '); -o-transform: scale(' + scale + '); transform: scale(' + scale + ');');
  }
}