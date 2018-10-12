console.log("starting...");

var app = require('http').createServer(handler);
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
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.writeHead(200);
            res.end(data);
        });
}

io.on('connection', function (socket) {
    socket.emit('start');

    // Pulls a frame from the game
    socket.on('frame', function ({frame_id, frame_data}) {
        console.log(frame_data)
        console.log('I got a frame, number: ' + frame_id + ' base64 to image it to look at it!');
    });


    // läs från "frame"
    // detektera om det kommer något nära dinosauren


    // Gör samma sak, fast genom att kika på bilden
    socket.on('state', function({frame_id, status, obstacles, score, high_score}) {
        console.log(status);
        if (status === 'CRASHED'){
            console.log('GAME OVER!');
        }
        console.log('your score is: ' +  score + ' highscore : ' + high_score);
        if (((status !== 'JUMPING')
            && (obstacles.length > 0) // Finns ett hinder
            && ((obstacles[0].xPos + obstacles[0].width) // hindrets högerkatnt
                <= 160) // "är nära"
         )){ //TODO: dont jump for high birds. Consider pace of dino to time jump!
            socket.emit('jump', frame_id+1);
        } //TODO: make logic for ducking.
    });
});


console.log("go on, I'm listening!");