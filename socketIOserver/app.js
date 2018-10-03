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

let i = 0
io.on('connection', function (socket) {
    socket.on('frame', function ({timestamp, canvas}) {
        console.log('timestamp: ' + timestamp);
        console.log(canvas);
        if (i++ % 100 === 0){
            socket.emit('action', {timestamp, action:'jump'});
        }
    })
});


console.log("go on, I'm listening!");