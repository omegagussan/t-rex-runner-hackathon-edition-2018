console.log("starting...");

var app = require('http').createServer(handler);
var io = require('socket.io')(app);
var fs = require('fs');
//let lwip = require('lwip');

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
//      let image = fromBase64(frame_data);
        //     writeToFile(image);


    });

    var last_xpos = undefined;
    var last_frame = undefined;
    var speed = 0;
    var ttp = undefined;
    let tti = undefined;

    socket.on('state', function ({frame_id, status, obstacles, score, high_score}) {
        //console.log(status);
        if (status === 'CRASHED') {
            console.log('GAME OVER!');
        }
        if (frame_id % 3 == 0) {
            //console.log('your score is: ' + score + ' highscore : ' + high_score);
            if (obstacles.length > 0) {
                let xPos = obstacles[0].xPos;
                if (last_xpos == undefined) {
                    console.log("obstacle: new", "xpos", xPos);
                } else {
                    const xdiff = xPos - last_xpos;
                    speed = xdiff / (frame_id - last_frame);
                    tti = -(xPos - 45) / speed;
                    ttp = -(xPos + obstacles[0].width - 45) / speed;
                    console.log(frame_id, "obstacle:", "xpos", xPos, "flyttat sig", xdiff, "speed", speed, "tti", tti, "ttp", ttp);
                }
                last_xpos = xPos;
            } else {
                last_xpos = undefined;
                ttp = undefined;
                console.log("obstacle: no");
            }
            last_frame = frame_id;


            if ((status !== 'JUMPING')
                && (obstacles.length > 0)
                && (obstacles[0].yPos > 50)
            // && ((obstacles[0].xPos + obstacles[0].width + 30 * speed) <= 0))
            ) {
                if((ttp <= 25) || (tti < 5))

                {
                    socket.emit('jump', frame_id + 2);
                    console.log("JUMP");
                }
            } //TODO: make logic for ducking.

        }
    });
})


console.log("go on, I'm listening!");