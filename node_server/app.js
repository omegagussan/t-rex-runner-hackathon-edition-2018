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

function obstacleClose(obstacles) {
    return (obstacles.length > 0) // Finns ett hinder
        && ((obstacles[0].xPos + obstacles[0].width) // hindrets högerkatnt
            <= 160);
}

function obstacleInWindow(obst) {
    return ((0 < obst.xPos) && (obst.xPos < 160))
        &&
        (obst.yPos >= 60);
}

io.on('connection', function (socket) {
    socket.emit('start');

    // Pulls a frame from the game
    socket.on('frame', function ({frame_id, frame_data}) {
        console.log('I got a frame, number: ' + frame_id + ' base64 to image it to look at it!');
        //console.log(frame_data)
    });


    // läs från "frame"
    // detektera om det kommer något nära dinosauren


    // high bird = 50
    // mid bird = 75
    // high cactus = 90
    // low cactus = 105
    // low bird = ?

    // Gör samma sak, fast genom att kika på bilden
    socket.on('state', function({frame_id, status, obstacles, score, high_score}) {

        console.log(status);

        // check if anuything is in our "window", then X on console
        if (obstacles.length > 0)  {
            let obst = obstacles[0];
            console.log(
                obst.xPos + " " + obst.yPos);
            console.log(obst.width + " " + obst.height);
            // console.log(obst);
            if(obstacleInWindow(obst)) {
                console.log("X");

            }
        }
        // Feedback
        // status crashed ->    academy.addRewardToAgent(agent, -1.0)
        // stuats still alive ->     academy.addRewardToAgent(agent, 1.0)

        // sammanställ "input", dvs hur världen ser ut just nu
        // scrapa obstacles till "input"
        // await academy.step([               // Let the magic operate ...
        //        {teacherName: teacher, inputs: inputs}
        // ]);

        // agent.getAction?

        if (status === 'CRASHED'){
            console.log('GAME OVER!');
        }
        console.log('your score is: ' +  score + ' highscore : ' + high_score);
        if ((((status !== 'JUMPING')
                && obstacleClose(obstacles)) // "är nära"
         )){ //TODO: dont jump for high birds. Consider pace of dino to time jump!
            socket.emit('jump', frame_id+1);
        } //TODO: make logic for ducking.
    });
});


console.log("go on, I'm listening!");