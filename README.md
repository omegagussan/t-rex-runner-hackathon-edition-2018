# t-rex-runner-hackathon-edition-2018
the t-rex runner game extracted from chromium forked from wayou/t-rex-runner

#botInterface 
written by Gustav Sandström Omegapoint as a language agnostic way to communicate with the game. 

The AI implementing the jumping logic is the server and the game is the client. 
Using websockets with socket.io The API is as follows:  
from client to server:  
topic: 'jump' with string 'frame_id' as the argument. this will make the client jump.  
topic: 'duck' with string 'frame_id' as the argument. this will make the client duck.  
from server to client:  
topic: 'frame' with args {frame_id and frame_data}. this will publish data to the server.  
topic: 'start' without any arguments  
topic: 'state' with args {frame_id, obstacles, score, highscore} is a way without computer vision to be able to write a AI for the game.

#servers
there is a implementation of a server in python and javascript/NODE. As far as I'm aware there is socket.io implementations in C++, Java
also among other languages so feel free to write your own.

####nodeJS
cd node_server
npm install
npm run start

####python
you will either need to pip install (or pip3 install depending on Python version) or conda install:
aiohttp  
socketio  
then simply run: python server.py (this is intended for python3 but is easy to modify with print (no parenthesis in 2.7) statements to 2.7)

'''source deactivate
source activate''' to get in and out of anaconda3.
