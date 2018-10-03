console.log("starting...");

var app = require('http').createServer(handler)
var io = require('socket.io')(app);
var fs = require('fs');

app.listen(3000);

function handler (req, res) {
    fs.readFile(__dirname + '../index.html',
        function (err, data) {
            if (err) {
                res.writeHead(500);
                return res.end('Error loading index.html');
            }
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.writeHead(200);
            res.end(data);
        });
}

io.on('connection', function (socket) {
    socket.emit('action', {frame_id:670, action:'jump'});
    socket.emit('action', {frame_id:830, action:'jump'});


    socket.on('frame', function ({frame_id, canvas}) {
        console.log('frame: ' + frame_id);
        if (frame_id == 500){
            socket.emit('action', {frame_id:980, action:'jump'});
        } else if (frame_id === 400){
            socket.emit('action', {frame_id:700, action:'duck'});
        }
        console.log(canvas);
    })
});


console.log("go on, I'm listening!");