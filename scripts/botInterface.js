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
        let canvas = document.getElementById('canvasId').toDataURL();
        socket.emit('frame', {timestamp: current_timestamp, canvas});
        console.log(current_timestamp + " emitted canvas")
    }
}, INTERVAL);