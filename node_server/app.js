console.log("starting...");

var app = require('http').createServer(handler);
var io = require('socket.io')(app);
var fs = require('fs');
let lwip = require('lwip');

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

function writeToFile(buffer_data) {
  fs.writeFile('lastestFrame.png', buffer_data, (err) => {
    if (err) throw err;
    console.log('The file has been saved!');
  });
}

function fromBase64(frame_data) {
  let data = frame_data.replace(/^data:image\/\w+;base64,/, "");
  return new Buffer(data, 'base64');
}

io.on('connection', function (socket) {
    socket.emit('start');

    socket.on('frame', function ({frame_id, frame_data}) {
      let image = fromBase64(frame_data);
      writeToFile(image);



    });

    // socket.on('state', function({frame_id, status, obstacles, score, high_score}) {
    //     console.log(status);
    //     if (status === 'CRASHED'){
    //         console.log('GAME OVER!');
    //     }
    //     console.log('your score is: ' +  score + ' highscore : ' + high_score);
    //     if (((status !== 'JUMPING') && (obstacles.length > 0) && ((obstacles[0].xPos + obstacles[0].width) <= 160))){ //TODO: dont jump for high birds. Consider pace of dino to time jump!
    //         socket.emit('jump', frame_id+1);
    //     } //TODO: make logic for ducking.
    // });
});


console.log("go on, I'm listening!");