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

//instance variables
let socket = io.connect('http://localhost:3000');
let actions = [];
let frame_id = 0;

//config
const downsamplingNumber = 4;

//make action que
socket.on('action', function (action) {
    console.log("addeds action: " + action.action + " on frame: " + action.frame_id);
    actions.push(action)
});


//api outwards
function runBot(){
    if (Runner.instance_.playing) {
        //execute actions
        console.log('frame: ' + frame_id);

        //filter old events
        actions = actions.filter(function(action){
            return action.frame_id >= frame_id;
        });
        console.log(actions);


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
                tRex.startJump(Runner.instance_.currentSpeed);
            } else if (this_action === 'duck') {
                tRex.setDuck(true);
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
