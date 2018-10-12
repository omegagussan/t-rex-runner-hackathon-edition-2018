const tf = require('@tensorflow/tfjs');

// Load the binding:
require('@tensorflow/tfjs-node');  // Use '@tensorflow/tfjs-node-gpu' if running with GPU.

console.log("starting...");

let app = require('http').createServer(handler);
let io = require('socket.io')(app);
let fs = require('fs');
let Jimp = require('jimp');


var width = 30;
var height = 15;

let currentFrameData = Array(30 * 15).fill(0);
let currentFrameId = 0;
let weights = [];
let replay = [];
let trainer = null;

let model = null;
let targetModel = null;

let optimizer = null;
let gameOver = false;
let didAction = false;

var params = {
  minibatchSize: 1,
  replayMemorySize: 1,
  stackFrames: 1,
  targetUpdateFreq: 1,
  discount: 0.90,
  actionRepeat: 1,
  learningRate: 0.001,
  initExp: 1.0,
  finExp: 0.1,
  finExpFrame: 1,
  replayStartSize: 1,
  hiddenLayers: [32, 32],
  activation: 'elu',
  maxEpisodeFrames: 1
};

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

function fromBase64(frame_data) {
  let data = frame_data.replace(/^data:image\/\w+;base64,/, "");
  return new Buffer(data, 'base64');
}

io.on('connection', function (socket) {
    socket.emit('start');

    socket.on('frame', function ({frame_id, frame_data}) {
      let image = fromBase64(frame_data);

      function doActions() {
        var value = trainer.next();
        if (value.value) {
          switch (value.value.action) {
            case 0:
              didAction = false;
              break;
            case 1:
              didAction = true;
              console.log("jumping at frame:" + currentFrameId);
              socket.emit('jump', frame_id + 1);
              break;
          }
        }
      }

      function preprocessImage(myImage) {
        myImage.crop(25, 0, 150, 75);
        myImage.resize(30, Jimp.AUTO);
        myImage.greyscale();
        myImage.contrast(1);
        let input = [];
        for (let i = 0; i < myImage.bitmap.data.length; i++) {
          if (i % 4 === 0) {
            input.push(myImage.bitmap.data[i]);
          }
        }
        return input;
      }

      Jimp.read(image)
        .then(myImage => {
          currentFrameData = preprocessImage(myImage);
          currentFrameId = frame_id;
          doActions();
        })
    });

  socket.on('state', function({frame_id, status, obstacles, score, high_score}) {
    if (status === 'CRASHED'){
      gameOver = true;
      console.log('GAME OVER!');
      setTimeout(function() {
        if (gameOver){
          socket.emit('start');
          console.log("restarted");
        } else {
          gameOver = false;
        }
      }, 1000);
    }
  });

});

function getState(){
  if (gameOver) {
    return {frame: currentFrameData, gameOver: gameOver, rewardFrame: -1000};
  } else if (didAction) {
    return {frame: currentFrameData, gameOver: gameOver, rewardFrame: -1};
  } else {
    return {frame: currentFrameData, gameOver: gameOver, rewardFrame: 1}
  }
}



function targetUpdate() {
  console.log("updating target model");
  for (let i = 0; i < model.weights.length; i++) {
    targetModel.weights[i].val.assign(model.weights[i].val);
  }
}

function initTrain() {
  optimizer = tf.train.adam(params.learningRate);
  trainer = trainGen();

  console.log("building model...");
  targetModel = createModel();
  model = createModel();
  targetUpdate();

  for (let i = 0; i < model.weights.length; i++) {
    weights.push(model.weights[i].val);
  }
}

function createModel() {
  const model = tf.sequential();

  model.add(tf.layers.dense({
    units: params.hiddenLayers[0],
    activation: params.activation,
    inputDim: width * height * params.stackFrames
  }));

  for (let i = 0; i < params.hiddenLayers.length-1; i++) {
    model.add(tf.layers.dense({
      units: params.hiddenLayers[i+1],
      activation: params.activation,
      inputDim: params.hiddenLayers[i]
    }));
  }

  model.add(tf.layers.dense({
    units: 2,
    activation: 'linear',
    inputDim: params.hiddenLayers[params.hiddenLayers.length-1]
  }));

  return model;
}

function* trainGen(episodes = 10000000) {
  console.log("training...");
  const scores = [];
  let totalFrames = 0;

  for (let ep = 0; ep < episodes; ep++) {
    let history = [currentFrameData];
    let epDone = false;
    let epFrames = 0;

    let latestTrained = 0;
    while (!epDone) {
      let act = Math.floor(Math.random()*3);
      const observation = [currentFrameData];
      const obsTensor = tf.tensor2d(observation);
      const vals = model.predict(obsTensor);
      obsTensor.dispose();

      const a = Math.min(1, totalFrames/params.finExpFrame);

      if (replay.length >= params.replayStartSize && Math.random() > a*params.finExp+(1-a)*params.initExp) {
        const maxAct = vals.argMax(1);
        act = maxAct.dataSync();
        maxAct.dispose();
      }

      let result = null;

      latestTrained = currentFrameData;
      for (let t = 0; t < params.actionRepeat; t++) {
        result = getState()
      }

      const normVals = tf.softmax(vals);

      history.push(result.frame);
      const nextS = [currentFrameData];

      yield {
        frame: totalFrames,
        episode: ep,
        score: epFrames,
        observation: nextS,
        reward: result.reward,
        values: vals.dataSync(),
        normValues: normVals.dataSync(),
        action: act
      };

      vals.dispose();
      normVals.dispose();

      epDone = result.gameOver || epFrames > params.maxEpisodeFrames;

      replay.push({prevS: observation,
        action: act, reward: result.reward, nextS: nextS, done: epDone});

      if (replay.length > params.replayMemorySize) {
        replay = replay.slice(replay.length - params.replayMemorySize);
      }

      if (replay.length >= params.replayStartSize) {
        const loss = learn();

        if (result.gameOver) {
          const lossc = loss.dataSync()[0];
          console.log("loss: " + lossc);
        }
        loss.dispose();
      }

      epFrames++;
      totalFrames++;

      if (totalFrames % params.targetUpdateFreq === 0) {
        targetUpdate();

        console.log("frame: " + totalFrames);
        console.log("replay buffer: " + replay.length);
        console.log("numTensors: " + tf.memory().numTensors);
      }
    }

    scores.push(epFrames);
  }
}

function learn() {
  const arrayPrevS = [];
  const arrayA = [];
  const arrayR = [];
  const arrayNextS = [];
  const arrayDone = [];

  for (let i = 0; i < params.minibatchSize; i++) {
    const exp = replay[Math.floor(Math.random() * replay.length)];
    arrayPrevS.push(exp.prevS[0]);
    arrayA.push(exp.action);
    arrayNextS.push(exp.nextS[0]);
    arrayR.push(exp.reward);
    arrayDone.push(exp.done ? 0 : 1);
  }

  const batchPrevS = tf.tensor2d(arrayPrevS);
  const batchA = tf.tensor1d(arrayA, 'int32');
  const batchR = tf.tensor1d(arrayR);
  const batchNextS = tf.tensor2d(arrayNextS);
  const batchDone = tf.tensor1d(arrayDone);

  const predMask = tf.oneHot(batchA, 3);

  const targets = calcTarget(batchR, batchNextS, batchDone);

  const loss = optimizer.minimize(() => {
    const x = tf.variable(batchPrevS);
    const predictions = model.predict(x);
    const re = mse(predictions, targets, predMask);
    x.dispose();

    return re;
  }, true, weights);

  targets.dispose();

  batchPrevS.dispose();
  batchA.dispose();
  batchR.dispose();
  batchNextS.dispose();
  batchDone.dispose();

  predMask.dispose();

  return loss;
}

function calcTarget(batchR, batchNextS, batchDone) {
  return tf.tidy(() => {
    const maxQ = targetModel.predict(batchNextS).max(1);
    const targets = batchR.add(maxQ.mul(tf.scalar(params.discount)).mul(batchDone));
    return targets;
  });
}


function mse(predictions, targets, mask) {
  const e = tf.mul(predictions.sub(targets.expandDims(1)).square(), mask.asType('float32')).mean();
  return e;
}

console.log("go on, I'm listening!");
initTrain();