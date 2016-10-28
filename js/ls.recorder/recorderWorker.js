var recLength = 0,
  recBuffers = [],
  sampleRate,
  numChannels,
  prevBuffer;

this.onmessage = function(e){
  switch(e.data.command){
    case 'init':
      init(e.data.config);
      break;
    case 'record':
      record(e.data.buffer, e.data.time);
      break;
    case 'getBuffer':
      getBuffer();
      break;
    case 'clear':
      clear();
      break;
  }
};

function init(config){
  sampleRate = config.sampleRate;
  numChannels = config.numChannels;
  fadeLength = 1580; // The number of samples, that are used to fade
  initBuffers();
  bufferHasFades = false;
}

function record(inputBuffer, time){
  bufferLen = inputBuffer[0].length;
  var buffer = [];
  numChannels=inputBuffer.length;

  isLastBuffer = time.current - time.stop <= bufferLen/sampleRate && time.stop > 0 &&time.current - time.stop >= 0;
  isFirstBuffer = time.current - time.start <= bufferLen/sampleRate && time.start > 0 &&time.current - time.start >= 0;
  isBufferInbetween = !isLastBuffer && !isFirstBuffer && time.start > 0 && time.current >= time.start && (time.current < time.stop || time.stop == -1);

  if (isLastBuffer){
    var secondsToDelete = time.current - time.stop;
    var ammountOfSamplesToDelete = secondsToDelete * sampleRate; 
    var ammountOfSamplesToGrab = bufferLen - ammountOfSamplesToDelete;

    for (var channel = 0; channel < numChannels; channel++){
        var samplesToPush = inputBuffer[channel];
        if(ammountOfSamplesToGrab>0) {
          samplesToPush = samplesToPush.slice(0,ammountOfSamplesToGrab);
          buffer.push(samplesToPush);
        }
    }
    addBufferToRecording(buffer);
    this.postMessage({command: 'bufferReady'});

  }
  else if(isFirstBuffer){
    var secondsToGrab = time.current - time.start;
    for (var channel = 0; channel < numChannels; channel++){
      var samplesToPush = inputBuffer[channel];
      ammountOfSamplesToDelete = samplesToPush.length -1 - (secondsToGrab * sampleRate);
      if(ammountOfSamplesToDelete>0) {
        samplesToPush = samplesToPush.slice(ammountOfSamplesToDelete);
      }
      buffer.push(samplesToPush);
    }
    addBufferToRecording(buffer);
  } 
  else if(isBufferInbetween){
    for (var channel = 0; channel < numChannels; channel++){
      buffer.push( inputBuffer[channel]);
    }
    buffer = addBufferToRecording(buffer);
  }
  prevBuffer = inputBuffer;
}

function addBufferFades(buffer){
        if (buffer.length < fadeLength) {
          console.log("FAIL: firstbuffer lenght: " + buffer.lenght + " samples. Fadelength :" + fadeLength + " Samples!!");
        }
        for (var i = 0 ; i < fadeLength; i++) {
          buffer[i] *= i / fadeLength;
        }
        var iterationStopPoint = buffer.length - fadeLength
        for (var i = buffer.length ; i >= iterationStopPoint; i--) {
          buffer[i] *= (buffer.length - i )/ fadeLength;
        }
        bufferHasFades = true;
        return buffer;
}

function addBufferToRecording(buffer){
  for (var channel = 0; channel < numChannels; channel++){
    recBuffers[channel] = mergeBuffers([recBuffers[channel],buffer[channel]]);
  }
  recLength += buffer[0].length;
}

function getBuffer(){
  //var buffers = [];
  // for (var channel = 0; channel < numChannels; channel++){
  //   var buffer = mergeBuffers(recBuffers[channel], recLength);
  //   addBufferFades(buffer);
  //   buffers.push(buffer);
  // }
  this.postMessage({command: 'gotBuffer', buffer: recBuffers});
}

function clear(){
  recLength = 0;
  recBuffers = [];
  bufferHasFades = false;
  initBuffers();
}

function initBuffers(){
  for (var channel = 0; channel < numChannels; channel++){
    recBuffers[channel] = [];
  }
}

function mergeBuffers(buffers, recLength){
  var newBufferLength = recLength;
  if (!newBufferLength) {
    newBufferLength = 0;
    for (var i = buffers.length - 1; i >= 0; i--) {
      newBufferLength += buffers[i].length;
    }
  }
  var result = new Float32Array(newBufferLength);
  var offset = 0;
  for (var i = 0; i < buffers.length; i++){
    result.set(buffers[i], offset);
    offset += buffers[i].length;
  }
  return result;
}