from datetime import datetime
from typing import Dict

from aiohttp import web
import socketio

from helpers import slow_countdown

sio = socketio.AsyncServer()
app = web.Application()
sio.attach(app)


async def index(request):
    """Serve the client-side application."""
    return web.FileResponse('../game/index.html')


@sio.on('connect')
async def connect(sid, env):
    print("connected ", sid)
    await start_game()  # Will start to play as soon as the game connects.


@sio.on('frame')
async def process_frame(sid: int, frame: Dict):
    print(frame)
    await naive_decision_function(frame)


@sio.on('state')
async def process_state(sid, state: Dict):
    if state["status"] == 'CRASHED':
        print("you are dead!")
        await start_game()  # Will restart if you died


async def naive_decision_function(frame: Dict):
    current_frame = int(frame['frame_id'])
    if current_frame % 200 == 0:
        await sio.emit('duck', current_frame + 100)  # Duck 100 frames from now
    elif current_frame % 100 == 0:
        await sio.emit('jump', current_frame + 100)  # Jump 100 frames from now


async def start_game():
    await slow_countdown()
    print(" ")
    print(" ")
    print(f"New game started at {datetime.now()}")
    await sio.emit('start')


@sio.on('disconnect')
def disconnect(sid):
    print('disconnected ', sid)


app.router.add_get('/', index)
app.router.add_static('/', '../game/')
if __name__ == '__main__':
    web.run_app(app, host='0.0.0.0', port=3000)
