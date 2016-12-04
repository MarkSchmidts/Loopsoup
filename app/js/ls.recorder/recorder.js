(function(window){

  var WORKER_PATH = 'js/ls.recorder/recorderWorker.js';

  var Recorder = function(source, cfg){
    var config = cfg || {};
    var bufferLen = config.bufferLen || 4096;
    var numChannels = config.numChannels || 2;
    this.context = source.context;
    this.node = (this.context.createScriptProcessor ||
                 this.context.createJavaScriptNode).call(this.context,
                 bufferLen, numChannels, numChannels);
    var worker = new Worker(config.workerPath || WORKER_PATH);
    worker.postMessage({
      command: 'init',
      config: {
        sampleRate: this.context.sampleRate,
        numChannels: numChannels
      }
    });
    var getBufferCallback,
      startRecTime = -1,
      stopRecTime = -1,
      stopCallback;

      //to be refactored
    this.node.onaudioprocess = function(e){
      inputBuffer = [];
      for (var channel = 0; channel < numChannels; channel++){
        inputBuffer.push(e.inputBuffer.getChannelData(channel));
      }
      worker.postMessage({
        command: 'record',
        buffer: inputBuffer,
        sampleRate: this.context.sampleRate,
        time: {
          current: this.context.currentTime,
          start: startRecTime,
          stop: stopRecTime
        }
      });
    }

    this.configure = function(cfg){
      for (var prop in cfg){
        if (cfg.hasOwnProperty(prop)){
          config[prop] = cfg[prop];
        }
      }
    }

    this.record = function(time){
      startRecTime = time || this.context.currentTime;
    }

    this.stop = function(callback, time){
      stopRecTime = time || this.context.currentTime;
      stopCallback = callback;
    }

    this.clear = function(){
      worker.postMessage({ command: 'clear' });
      startRecTime = -1;
      stopRecTime = -1;
      stopCallback = null;
    }

    this.getBuffer = function(cb) {
      getBufferCallback = cb || config.callback;
      worker.postMessage({ command: 'getBuffer' })
    }

    worker.onmessage = function(e){
      if(e.data.command == 'gotBuffer'){
        var blob = e.data.buffer;
        getBufferCallback(blob);  
      }
      else if(e.data.command == 'bufferReady'){
        stopCallback();
      }
    }

    source.connect(this.node);
    this.node.connect(this.context.destination);    //this should not be necessary
  };

  window.Recorder = Recorder;

})(window);