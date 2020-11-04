import time
from datetime import datetime
from typing import Dict
import argparse

from aiohttp import web
import socketio
import numpy as np

from q_learning import Qlearning

# environment
delay = 1
d_width = 600
actions = ['jump', 'run']

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

    game_state = None
    if len(state["obstacles"]) > 0:
        # Obstacles are stored in order!
        closes_obstacles = state["obstacles"][0]
        game_state = closes_obstacles["xPos"] + closes_obstacles["width"]  # get rightmost point of obstacle
        game_state = game_state if game_state < d_width else None

    if not args.demo:
        learning.update(game_state, state["score"], state["status"] == 'CRASHED')

    if state["status"] == 'CRASHED':
        print(f'score: {state["score"]}')
        time.sleep(1)
        await start_game()  # Will restart if you died
        return

    if state["status"] == 'RUNNING':
        if args.demo:
            selected_action = learning.select_action_evaluation(game_state)
        else:
            selected_action = learning.select_action_training(game_state)

        if selected_action != "run":
            await sio.emit(selected_action, current_frame + delay)
        # print(f"emitted {selected_action} at {current_frame + delay} from {current_frame}")


async def start_game():
    global learning
    global number_of_epochs

    if args.demo:
        print("Running in demo mode! No training is being done")
        learning.load_Q("../data/manual_q.npy")
        await _start_game()
    else:
        if not learning.is_done():
            await _start_game()
            print(f"played {learning.num_played}")
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
            await _start_game()


async def _start_game():
    print(" ")
    print(f"New game started at {datetime.now()}")
    await sio.emit('start')


@sio.on('disconnect')
def disconnect(sid):
    print('disconnected ', sid)


app.router.add_get('/', index)
app.router.add_static('/', '../game/')
if __name__ == '__main__':
    argparser = argparse.ArgumentParser()
    argparser.add_argument(
        "--demo",
        dest="demo",
        action="store_true",
        default=False,
        help="If not to update weights and load best model",
    )
    args = argparser.parse_args()
    web.run_app(app, host='0.0.0.0', port=3000)
