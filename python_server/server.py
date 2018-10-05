from aiohttp import web
import socketio

sio = socketio.AsyncServer()
app = web.Application()
sio.attach(app)

async def index(request):
    """Serve the client-side application."""
    with open('../game/index.html') as f:
        headers = {ACCESS-CONTROL-ALLOW-ORIGIN: '*'}
        return web.Response(text=f.read(), content_type='text/html', headers=headers)

@sio.on('connect')
async def connect(sid, env):
    print("connected ", sid)
    await sio.emit('start')

@sio.on('frame')
async def process_frame(sid, frameDict):
    print("frame ", frameDict['frame_id'])
    print("data ", frameDict['frame_data'])
    current_frame = int(frameDict['frame_id'])
    if current_frame % 200 == 0:
        await sio.emit('duck', current_frame + 100)
    elif  current_frame % 100 == 0:
        await sio.emit('jump', current_frame + 100)

@sio.on('state')
async def process_state(sid, stateDict):
    print('internal state:');
    print(stateDict);

@sio.on('disconnect')
def disconnect(sid):
    print('disconnected ', sid)

app.router.add_static('/static', 'static')
app.router.add_get('/', index)

if __name__ == '__main__':
    web.run_app(app, host='127.0.0.1', port=3000)
