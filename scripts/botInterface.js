//helper functions
function copyCanvas(oldCanvas, downsample_factor) {
    inverse_downsample_factor = 1/downsample_factor;

    //create a new canvas
    var newCanvas = document.createElement('canvas');
    var newContext = newCanvas.getContext('2d');

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
//conf
let INTERVAL = 16; // since 1000ms=1s and 60fps=16.67ms to render a frame no point in sampling faster

//make action que
socket.on('action', function (action) {
    actions.push(action)

});

//loop to get frame every frame & do actions
window.tRexBot = setInterval(function() {
    if (Runner.instance_.playing){
        let current_timestamp = window.performance && window.performance.now && window.performance.timing && window.performance.timing.navigationStart ? window.performance.now() + window.performance.timing.navigationStart : Date.now();

        //execute actions
        if (actions.length > 0){
            for (let i= actions.length -1; i >= 0; i--){
                let this_timestamp = actions[i].timestamp;
                if (Math.abs(this_timestamp - current_timestamp) >= INTERVAL){
                    let tRex = Runner.instance_.tRex;
                    if (actions[i].action === 'jump' && !tRex.jumping){
                        tRex.startJump(Runner.instance_.currentSpeed);
                    }
                }
            }
        }
        //emit
        let canvas = copyCanvas(document.getElementById('canvasId'), 4).toDataURL();
        socket.emit('frame', {timestamp: current_timestamp, canvas});
        console.log(current_timestamp + " emitted canvas")
    }
}, INTERVAL);