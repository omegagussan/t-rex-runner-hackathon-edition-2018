//config
const downsamplingNumber = 4;
const emit_every_nth_frame = 10;

//helper functions
function copyCanvasWithRescale(oldCanvas, downsample_factor) {
  if (typeof downsample_factor !==  "number") {
    throw "downsample_factor is not a integer";
  }
  let inverse_downsample_factor = 1/downsample_factor;

  //create a new canvas
  let newCanvas = document.createElement('canvas');
  let newContext = newCanvas.getContext('2d');

  //set dimensions
  newCanvas.width = oldCanvas.width/downsample_factor;
  newCanvas.height = oldCanvas.height/downsample_factor;

  //apply the old canvas to the new one
  newContext.scale(inverse_downsample_factor, inverse_downsample_factor);
  newContext.drawImage(oldCanvas, 0, 0);
  return newCanvas;
}

function createAction(name, frame){
  return {action:name, frame_id: frame};
}

//api outwards towards game
function runBot(){
  //only run bot if you are playing.
  if (Runner.instance_.playing) {
    //filter events in previous frames that are no longer valid.
    actions = actions.filter(function(action){
      return action.frame_id >= frame_id;
    });

    //execute actions
    let tRex = Runner.instance_.tRex;
    if(actions.length > 0 && frame_id === actions[0].frame_id){

      //picks the first action on this frame. Thus first action posted is executed for a frame. Others are ignored.
      let this_action = actions[0].action;

      if (tRex.jumping){
        console.warn('not able to jump on frame: ' +  frame_id + ' because dino is jumping');
        return;
      }

      if (this_action === 'jump') {
        if (tRex.ducking){
          tRex.setDuck(false);
        }
        tRex.startJump(Runner.instance_.currentSpeed);
      } else if (this_action === 'duck') {
          tRex.setDuck(true);
      } else if (this_action === 'run') {
        tRex.setDuck(false);
    }
      else {
        console.warn('ineligible command: ' + this_action + ' on frame: ' +  frame_id);
      }
    }

    //emit frame as base64image
    if (frame_id % emit_every_nth_frame === 0){
      let canvas = copyCanvasWithRescale(document.getElementById('canvasId'), downsamplingNumber).toDataURL();
      socket.emit('frame', {frame_id: frame_id, frame_data: canvas});
    }

    let state = 'RUNNING';
    //emit game state as custom format
    if (Runner.instance_.crashed){
      state = 'CRASHED';
    } else if (tRex.jumping){
      state = 'JUMPING';
    } else if (tRex.ducking){
      state = 'DUCKING';
    }
    socket.emit('state', {frame_id: frame_id, status: state, obstacles: Runner.instance_.horizon.obstacles, score: Runner.instance_.distanceMeter.getActualDistance(Math.ceil(Runner.instance_.distanceRan)), high_score: Runner.instance_.distanceMeter.getActualDistance(Math.ceil(Runner.instance_.highestScore))});

    //increment frame count
    frame_id++;
  } else if (Runner.instance_.crashed){
      if (!is_emitted_gameover){
        socket.emit('state', {frame_id: frame_id++, status: "CRASHED", obstacles: Runner.instance_.horizon.obstacles, score: Runner.instance_.distanceMeter.getActualDistance(Math.ceil(Runner.instance_.distanceRan)), high_score: Runner.instance_.distanceMeter.getActualDistance(Math.ceil(Runner.instance_.highestScore))});
        actions = []
        frame_id = 0
        is_emitted_gameover = true;
      }
  }
}

//instance variables
let is_emitted_gameover = false;
let socket = io.connect('http://localhost:3000'); //where your server is running
let actions = []; //cue of actions to do.
let frame_id = 0; //frame counter

//socket.io bindings
socket.on('jump', function (frame_id) {
  console.info("jump added on frame: " + frame_id);
  actions.push(createAction('jump', frame_id))
});

socket.on('duck', function (frame_id) {
  console.info("duck added on frame: " + frame_id);
  actions.push(createAction('duck', frame_id))
});

socket.on('run', function (frame_id) {
  console.info("run added on frame: " + frame_id);
  actions.push(createAction('run', frame_id))
});

socket.on('start', function (placeholder) {
  is_emitted_gameover = false;
  //placeholder is purposefully not used
  function resetSettings() {
    Runner.instance_.tRex.startJump(0);
    Runner.instance_.update();
  }
  if(!Runner.instance_.playing){
    //if restart or start first time
    if (Runner.instance_.crashed){
      Runner.instance_.restart();
    }else {
      Runner.instance_.play();
    }
    resetSettings();
  }
});



