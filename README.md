# t-rex-runner
The purpose of this project is to play t-rex-running with reinforcement learning.

What I've done before (2018):
+  forked [the t-rex runner game extracted from chromium](https://github.com/wayou/t-rex-runner) into /game
+  augmented the game with a websocker api. See [socket.io botInterface](#socket.io-botInterface)

## Architecture of the setup
Is very counter-intuitive with the game in the browser being the client and
the server being the "AI" decision maker both talking back to the game but also hosting the web page.
You need to start the python server first (to load the web page) and your browser will execute the 
javascript and play it.  This is also to ensure that the socket.io server is running before game starts. 

You could as well press the keys manually "up" and "down" to make the dino jump. But that's
what we have implemented the socket.io protocol to do programmatically. 

The bot interface will write back on "info" and "warn" in the console log in the browser to confirm you actions. 

## Your mission if you choose to accept it.
Get the highest highscore possible (its being sent in the state topic) by sending "jump"
and "duck" commands to the game. A naive approach is implemented for you. 

```
async def naive_decision_function(frame: Dict):
    current_frame = int(frame['frame_id'])
    if current_frame % 200 == 0:
        await sio.emit('duck', current_frame + 100)  # Duck 100 frames from now
    elif current_frame % 100 == 0:
        await sio.emit('jump', current_frame + 100)  # Jump 100 frames from now
```

However this will probably not get you very far. You need to look at the images
to make decisions when to jump and duck.

A small got'cha of the game is that it plays faster and faster...
soon there will be night and also there will be Pterodactylus. 

### Layout of repo. 
the javascript webpage with the game in is in /game
the server code is in "/src"
there is a makefile that is an abstraction for the Dockerfile in the root.

### To get started
`make build run` then take a browser and visit localhost:3000
you shall see logs in the console where docker is running

### socket.io botInterface
Using websockets with socket.io The API is as follows:  
from client to server:  
+ topic: 'jump' with string 'frame_id' as the argument. this will make the client jump.  
+ topic: 'duck' with string 'frame_id' as the argument. this will make the client duck.  
from server to client:  
+ topic: 'start' without any arguments. To start the game first time or if you die. 
+ topic: 'frame' with {frame_id and frame_data}. this topic contains screenshots from the game. 
+ topic: 'state' with {frame_id, obstacles, score, highscore} as a way to (without computer vision)
be able to program again the game. 

[Code is here](game/scripts/botInterface.js)

### format of state and frame replies. 
State:
```
{'frame_id': 172, 'status': 'DUCKING', 'obstacles': [], 'score': 20, 'high_score': 51}
```

```
{'frame_id': 233, 'status': 'JUMPING', 'obstacles': [{'canvasCtx': {}, 'spritePos': {'x': 332, 'y': 2}, 'typeConfig': {'type': 'CACTUS_LARGE', 'width': 25, 'height': 50, 'yPos': 90, 'multipleSpeed': 7, 'minGap': 120, 'minSpeed': 0, 'collisionBoxes': [{'x': 0, 'y': 12, 'width': 7, 'height': 38}, {'x': 8, 'y': 0, 'width': 7, 'height': 49}, {'x': 13, 'y': 10, 'width': 10, 'height': 38}]}, 'gapCoefficient': 0.6, 'size': 1, 'dimensions': {'WIDTH': 600, 'HEIGHT': 150}, 'remove': False, 'xPos': 551, 'yPos': 90, 'width': 25, 'collisionBoxes': [{'x': 0, 'y': 12, 'width': 7, 'height': 38}, {'x': 8, 'y': 0, 'width': 7, 'height': 49}, {'x': 13, 'y': 10, 'width': 10, 'height': 38}], 'gap': 293, 'speedOffset': 0, 'currentFrame': 0, 'timer': 0}], 'score': 30, 'high_score': 51}

```

Frame:

```
{'frame_id': 301, 'frame_data': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJYAAAAlCAYAAACgXxA5AAACr0lEQVR4Xu2cUW6jMBCGba6Tx/Z90xtEgHKE7TEIx9jeIJFBuUH3ANtHrmOvfoQrQpKOOw1KVf5IEeCZMfjjw/AC1vBHAjMQsDP0yS5JwFCsby5Bnue7tm13OMy4XpblGtvOub9owzpyxuupw9psNg/H4/Etz/Pf3vu3LMsesERb7AOxtm1fhmM4W0d8OIY+Bz+KlXoG7pAXRSqKImD3TdNYtFlrqxBCHWXCNmJFUbxaa2sIl3q4UQpjDIR5zPP8H5bj+iEH8rxAMOQMIiEf7VGs9zqKlXoG7pCHmcl7v7bW/hrEekJbCOE1igXponAQLW6nHm6cjaJQV8TqRfLeP2NGM8bgj1nyGTNelmV/onScsVLJM09FgDOWChuLJAIUSyLEuIoAxVJhY5FEgGJJhBhXEaBYKmwskghQLIkQ4yoCFEuFjUUSAYolEWJcRYBiqbCxSCJAsSRCjKsIUCwVNhZJBCiWRIhxFQGKpcLGIokAxZIIMa4iQLFU2FgkEaBYEiHGVQQolgobiyQCFEsixLiKAMVSYWORRIBiSYQYVxGgWCpsLJIIvIsVQsBLkHjVqH8Bkj8S+AqBsVi7qqqq7XZrVqtV3XVd1XXdSd+IlWV50uacM9ZaznxfOQs/sPZMrKlMKWPGC5MpecxZDoETIfCGbVVV68/KRbGWI0zqSM9mmo/kwq3wcDj0fWM9LnkrTMW9nLyLt7AQQoBAUSI8R+HZCktjTD3G8xMf9vFxjaZpnjDOS197mbYvRZfIZfy1m2tjF8VyztWQB7KhE8xOY9j3gHrv/c855luP7db9Tcc+vfAQx8dJTsSCieNP4Oz3+4BbnvZWN+1PM0hNzUcnfny1TY/vUl1KzrX9fbZ2mj/ens4SUt/XZpVLdbdm3E9Ac1597Hu5BCjWcs/9rCP/D2S8XDU4ZezoAAAAAElFTkSuQmCC'}
```

This is a good place to look at the images. https://codebeautify.org/base64-to-image-converter
You can modify the resolution in the "botInterface" code. 
Also how often you want pictures to be posted. Every n-th frame.