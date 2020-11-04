from datetime import datetime
from typing import Dict
import math

from aiohttp import web
import socketio
import numpy as np

from helpers import slow_countdown
from q_learning import Qlearning

# environment
d_width_downsample = 60
d_width = 10
actions = ['duck', 'jump', 'run']

number_of_epochs = 10
learning = Qlearning(d_width, actions, number_of_epochs)

# start server
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


@sio.on('state')
async def process_state(sid, state: Dict):
    current_frame = int(state['frame_id'])

    from_indexes = []
    for o in state["obstacles"]:
        from_index_ = math.floor(o["xPos"] / d_width_downsample) - 1
        from_indexes.append(from_index_)
    from_indexes = list(filter(lambda x: x > 0, from_indexes))
    from_index = min(from_indexes) if len(from_indexes) > 0 else None
    learning.update(from_index, state["score"])

    selected_action = learning.select_action(from_index)
    if selected_action != "run":
        await sio.emit(selected_action, current_frame + 1)

    if state["status"] == 'CRASHED':
        print("you are dead!")
        print(f'score: {state["score"]}')
        await start_game()  # Will restart if you died


async def start_game():
    global learning
    global number_of_epochs
    if not learning.is_done():
        await slow_countdown()
        print(" ")
        print(" ")
        print(f"New game started at {datetime.now()}")
        await sio.emit('start')
        learning.increment_played()
    else:
        print(learning.get_score_over_time())
        print("Final Q-Table Values")
        print(learning.get_Q())
        ts = datetime.now()
        with open(f"../data/q-{ts}.npy", "wb") as f:
            np.save(f, learning.get_Q())
        with open(f"../data/r-{ts}.npy", "wb") as f:
            np.save(f, learning.get_rewards())

        learning = Qlearning(d_width, actions, number_of_epochs)
        number_of_epochs = number_of_epochs * 10
        print(learning.num_episodes)
        await sio.emit('start')


@sio.on('disconnect')
def disconnect(sid):
    print('disconnected ', sid)


app.router.add_get('/', index)
app.router.add_static('/', '../game/')
if __name__ == '__main__':
    web.run_app(app, host='0.0.0.0', port=3000)
