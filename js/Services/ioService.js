loopsoup.factory('ioService', ['$rootScope', 'audioCoreService', 
	function($rootScope, audioCore){
	var service = {};

	function writeUTFBytes(view, offset, string){ 
	  var lng = string.length;
	  for (var i = 0; i < lng; i++){
	    view.setUint8(offset + i, string.charCodeAt(i));
	  }
	}

	function mergeBuffers(channelBuffer){
	  var result = new Float32Array(channelBuffer[0].length);
	  
	  for (var i = 0, offset = 0; i < channelBuffer.length; i++){
	    for(var n = 0; n < channelBuffer[i].length; n++){
	    	result[n]+= (channelBuffer[i][n] || 0);
	    }
	  }
	  return result;
	}

	function interleave(leftChannel, rightChannel){
	  var length = leftChannel.length + rightChannel.length;
	  var result = new Float32Array(length);
	 
	  var inputIndex = 0;
	 
	  for (var index = 0; index < length; ){
	    result[index++] = leftChannel[inputIndex];
	    result[index++] = rightChannel[inputIndex];
	    inputIndex++;
	  }
	  return result;
	}

	function downloadTrack(trackNo){
		tracks = audioCore.getTracks();
		audio_context = audioCore.getAudioCtx();
		if(tracks.length){
			var filename = $rootScope.title+'_'+getGermanDateFormat(new Date())+'_';

			if(trackNo < 0){
				//merge all not muted tracks and download
				var bufferR = new Array();
				var bufferL = new Array();
				for(var i = 0; i<tracks.length; i++){
					bufferR[i] =  tracks[i].source.buffer.getChannelData(0);
					bufferL[i] =  tracks[i].source.buffer.getChannelData(1);
				}

				var leftBuffer = mergeBuffers (bufferL);
				var rightBuffer = mergeBuffers (bufferR);

				filename += 'allTracks.wav';
			}
			else{
				// we flat the left and right channels down
				var rightBuffer = tracks[trackNo].source.buffer.getChannelData(0);
				var leftBuffer = tracks[trackNo].source.buffer.getChannelData(1);

				filename += 'TrackNo'+parseInt(trackNo+1)+'.wav';
			}

			// we interleave both channels together
			var interleaved = interleave ( rightBuffer, leftBuffer );
			 
			// create the buffer and view to create the .WAV file
			var buffer = new ArrayBuffer(44 + interleaved.length * 2);
			var view = new DataView(buffer);
			 
			// write the WAV container, check spec at: https://ccrma.stanford.edu/courses/422/projects/WaveFormat/
			// RIFF chunk descriptor
			writeUTFBytes(view, 0, 'RIFF');
			view.setUint32(4, 44 + interleaved.length * 2, true);
			writeUTFBytes(view, 8, 'WAVE');
			// FMT sub-chunk
			writeUTFBytes(view, 12, 'fmt ');
			view.setUint32(16, 16, true);
			view.setUint16(20, 1, true);
			// stereo (2 channels)
			view.setUint16(22, 2, true);
			view.setUint32(24, (audio_context.sampleRate || 48000), true);
			view.setUint32(28, (audio_context.sampleRate || 48000) * 4, true);
			view.setUint16(32, 4, true);
			view.setUint16(34, 16, true);
			// data sub-chunk
			writeUTFBytes(view, 36, 'data');
			view.setUint32(40, interleaved.length * 2, true);
			 
			// write the PCM samples
			var lng = interleaved.length;
			var index = 44;
			var volume = 1;
			for (var i = 0; i < lng; i++){
			    view.setInt16(index, interleaved[i] * (0x7FFF * volume), true);
			    index += 2;
			}
			 
			// our final binary blob that we can hand off
			var blob = new Blob ( [ view ], { type : 'audio/wav' } );
			forceDownload(blob, filename);	 //recorder.js
		}
	}

	service.getWav = function(trackNo){
		downloadTrack(trackNo);
	};

 	forceDownload = function(blob, filename){
	    var url = (window.URL || window.webkitURL).createObjectURL(blob);
	    var link = window.document.createElement('a');
	    link.href = url;
	    link.download = filename || 'output.wav';
	    var click = document.createEvent("Event");
	    click.initEvent("click", true, true);
	    link.dispatchEvent(click);
  	}

	return service;
}])