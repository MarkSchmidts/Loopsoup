window.AudioContext = window.AudioContext || window.webkitAudioContext;
navigator.getUserMedia = ( navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);

function extendAudioContext(audioContext){
  audioContext.createGainOrig = audioContext.createGain;
  
  audioContext.createGain = function(){
    var gainNode = this.createGainOrig();

    gainNode.gain.muted = false;
    gainNode.gain.valueSaved = null;
    gainNode.isMuted = function(){
      return this.gain.muted;
    }
    gainNode.mute = function(){
      if(!this.isMuted()){
        this.gain.muted = true;
        this.gain.valueSaved = this.gain.value;
        this.gain.value = 0;
      }
    }
    gainNode.unmute = function(){
      if(this.isMuted()){
        this.gain.muted = false;
        this.gain.value = this.gain.valueSaved || 1;
        this.gain.valueSaved = null;
      }
    }
    gainNode.toggleMute = function(){
      if(this.isMuted())
        this.unmute();
      else
        this.mute();
    }
    gainNode.setVal = function(value){
      if(value == 0){
        this.mute();
        this.gain.value = value;
      }
      else if(this.isMuted() && value > 0){
          this.gain.value = value;
          this.unmute();
      }
      else
        this.gain.value = value;
    }
    gainNode.getVal = function(){
      return this.gain.value;
    }

    return gainNode;
  }
  return audioContext;
}