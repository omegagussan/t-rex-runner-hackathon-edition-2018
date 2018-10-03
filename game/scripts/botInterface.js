//helper functions
function copyCanvas(oldCanvas, downsample_factor) {
    let inverse_downsample_factor = 1/downsample_factor;

    //create a new canvas
    let newCanvas = document.createElement('canvas');
    let newContext = newCanvas.getContext('2d');

    //set dimensions
    newCanvas.width = oldCanvas.width/downsample_factor;
    newCanvas.height = oldCanvas.height/downsample_factor;

    //apply the old canvas to the new one

    newContext.scale(inverse_downsample_factor,inverse_downsample_factor);
    newContext.drawImage(oldCanvas, 0, 0);
    return newCanvas;
}
//api outwards
function runBot(){
    if (Runner.instance_.playing) {
        //filter old events
        actions = actions.filter(function(action){
            return action.frame_id >= frame_id;
        });

        //execute actions
        if(actions.length > 0 && frame_id === actions[0].frame_id){
            let tRex = Runner.instance_.tRex;

            //eligable for action
            if (tRex.jumping || tRex.ducking){
                console.log('not able to preform any action on frame: ' +  frame_id + ' because dino is jumping: ' + tRex.jumping + ' or ducking: ' +  tRex.ducking);
                return;
            }

            let this_action = actions[0].action;
            if (this_action === 'jump') {
                Runner.instance_.tRex.startJump(Runner.instance_.currentSpeed);

                //tRex.startJump(Runner.instance_.currentSpeed);
            } else if (this_action === 'duck') {
                Runner.instance_.tRex.setDuck(false);
                tRex.setDuck(false);
            } else {
                console.log('ineligable command: ' + this_action + ' on frame: ' +  frame_id);
            }
        }

        //emit
        let canvas = copyCanvas(document.getElementById('canvasId'), downsamplingNumber).toDataURL();
        socket.emit('frame', {frame_id: frame_id, canvas});

        frame_id++;
    }
}

//instance variables
let socket = io.connect('http://localhost:3000');
let actions = [];
let frame_id = 0;

//config
const downsamplingNumber = 4

let e_up = {keyCode:38};
let e_down = {keyCode: 40};
let e_restart = {keyCode: 13};


//make action que
socket.on('action', function (action) {
    console.log("addeds action: " + action.action + " on frame: " + action.frame_id);
    actions.push(action)
});

//start/restart game
socket.on('start', function (action) {
    if (Runner.instance_.crashed){
        Runner.instance_.restart();
        console.log(Runner.instance_.playing);
        Runner.instance_.tRex.startJump(Runner.instance_.currentSpeed);
        Runner.instance_.update();
    }else {
        Runner.instance_.play();
        Runner.instance_.tRex.startJump(Runner.instance_.currentSpeed);
        Runner.instance_.update();
    }
});



