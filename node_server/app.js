console.log("starting...");

var app = require('http').createServer(handler);
var io = require('socket.io')(app);
var fs = require('fs');
var imageDataURI = require('image-data-uri');
var Jimp = require('jimp');

const tf = require('@tensorflow/tfjs');
require('@tensorflow/tfjs-node');

// tf.js official
/*
const model = tf.sequential();
model.add(tf.layers.dense({units: 100, activation: 'relu', inputShape: [10]}));
model.add(tf.layers.dense({units: 1, activation: 'linear'}));
model.compile({optimizer: 'sgd', loss: 'meanSquaredError'});

const xs = tf.randomNormal([100, 10]);
const ys = tf.randomNormal([100, 1]);

model.fit(xs, ys, {
  epochs: 100,
  callbacks: {
    onEpochEnd: async (epoch, log) => {
      console.log(`Epoch ${epoch}: loss = ${log.loss}`);
    }
  }
});
*/

// setup

var scaleFactor = 16;
var width = Math.floor(300 / scaleFactor);
var height = Math.floor(75 / scaleFactor);
var speed = 1;
var samplingSkip = 4;
var latestFrame = Array(width * height).fill(0);
var latestSaved = 0;
var currentScore = 0;
var isGameOver = false;

// dodge_tfjs

var params = {
  minibatchSize: 16,
  replayMemorySize: 10000,
  stackFrames: 1,
  targetUpdateFreq: 100,
  discount: 0.99,
  actionRepeat: 1,
  learningRate: 0.001,
  initExp: 1.0,
  finExp: 0.1,
  finExpFrame: 10000,
  replayStartSize: 100,
  hiddenLayers: [32, 32],
  activation: 'elu',
  maxEpisodeFrames: 2000
};

var trainer = null;
var info = null;

var training = false;
var started = false;
var reset = false;

var model = null;
var targetModel = null;

var modelVars = null;
var replay = null;
var optimizer = null;

function initTrain() {
  modelVars = [];
  replay = [];
  optimizer = tf.train.adam(params.learningRate);

  trainer = trainGen();

  console.log("building model...");
  targetModel = createModel();
  model = createModel();
  targetUpdate();

  for (let i = 0; i < model.weights.length; i++) {
    modelVars.push(model.weights[i].val);
  }
}

function startTraining() {
  initTrain();
  started = true;
  training = true;
}

function createModel(stack) {
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
    units: 3,
    activation: 'linear',
    inputDim: params.hiddenLayers[params.hiddenLayers.length-1]
  }));

  return model;
}

function targetUpdate() {
  console.log("updating target model");

  for (let i = 0; i < model.weights.length; i++) {
    targetModel.weights[i].val.assign(model.weights[i].val);
  }
}

function mse(predictions, targets, mask) {
  const e = tf.mul(predictions.sub(targets.expandDims(1)).square(), mask.asType('float32')).mean();
  return e;
}

function calcTarget(batchR, batchNextS, batchDone) {
  return tf.tidy(() => {
    const maxQ = targetModel.predict(batchNextS).max(1);
    const targets = batchR.add(maxQ.mul(tf.scalar(params.discount)).mul(batchDone));
    return targets;
  });
}

function* trainGen(episodes = 10000000) {
  console.log("training...");
  const scores = [];
  var totalFrames = 0;

  for (let ep = 0; ep < episodes; ep++) {
    var history = [latestFrame];
    var epDone = false;
    var epFrames = 0;
    const startTime = new Date().getTime();

    function stackObs() {
      const arrays = [];

      for (let i = 0; i < params.stackFrames; i++) {
        arrays.push(history[Math.max(0, history.length-1-i)]);
      }

      return [].concat.apply([], arrays);
    }

    var latestTrained = 0;
    while (!epDone) {
      var act = Math.floor(Math.random()*3);
      const observation = [latestFrame];
      const obsTensor = tf.tensor2d(observation);
      const vals = model.predict(obsTensor);
      obsTensor.dispose();

      const a = Math.min(1, totalFrames/params.finExpFrame);

      if (replay.length >= params.replayStartSize && Math.random() > a*params.finExp+(1-a)*params.initExp) {
        const maxAct = vals.argMax(1);
        act = maxAct.dataSync();
        maxAct.dispose();
      }

      var result = null;

      latestTrained = latestSaved;
      for (let t = 0; t < params.actionRepeat; t++) {
        result = step(act);
      }

      const normVals = tf.softmax(vals);

      history.push(result.frame);
      const nextS = [latestFrame];

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
          //data2.addRows([[ep, lossc]]);
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
  }, true, modelVars);

  targets.dispose();

  batchPrevS.dispose();
  batchA.dispose();
  batchR.dispose();
  batchNextS.dispose();
  batchDone.dispose();

  predMask.dispose();

  return loss;
}

// eget


// gurra
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

function step(act) {
  return { frame: latestFrame, gameOver: isGameOver, reward: currentScore,};
}

io.on('connection', function (socket) {
    socket.emit('start');

    socket.on('frame', function ({frame_id, frame_data}) {
        if ((frame_id % samplingSkip) != 0)
          return;
        var decoded = imageDataURI.decode(frame_data);
        //if (frame_id > latestSaved + samplingSkip)
        //  console.log((frame_id - latestSaved) + " behind");
        Jimp.read(decoded.dataBuffer).then(image => {
          image.greyscale();
          image.contrast(1);
          image.resize(width, height);
          var input = [];
          for (var i = 0; i < image.bitmap.data.length; i++) {
            if (i % 4 == 0)
              input.push(image.bitmap.data[i]);
          }
          latestFrame = input;
          latestSaved = frame_id;
          var value = trainer.next();
          if (value.value) {
            switch (value.value.action) {
              case 0:
                break;
              case 1:
                socket.emit('jump', frame_id+1);
                break;
              case 2:
                socket.emit('duck', frame_id+1);
                break;
            }
          }
        });
    });
    socket.on('state', function({frame_id, status, obstacles, score, high_score}) {
        //console.log(status);
        currentScore = score;
        isGameOver = status === 'CRASHED';
        if (status === 'CRASHED'){
            console.log('GAME OVER!');
            socket.emit('start');
        }
    });
});

console.log("go on, I'm listening!");
startTraining();
