loopsoup.factory('audioCoreService',
 ['$localStorage', 'alertService', '$rootScope', '$q', 'stateService',
 function(storage, alertService, $rootScope, $q, stateService){
 	serviceId = 'audioCoreService'+Math.random();


	var micAccess = false,
	isRecording = false,
	tracks = [],
	recordStarted = {},
	latencyCalibrateModeEnabled = false,
	micAccessPromise = $q.defer(),
	audioCtx, input, inputAnalyser, gainNodeOutput, gainNodeMonitor, recorder,
	log = function(str){
		alertService.addAlert(str, 'danger');
		console.log(str);
	},
	initAudioContext = function() {
		if(micAccess == false){
			try {
				window.AudioContext = window.AudioContext;
				getUserMediaImplements = [navigator.getUserMedia, navigator.mediaDevices.getUserMedia, navigator.webkitGetUserMedia, navigator.mozGetUserMedia];
				for (var i = 0; i < getUserMediaImplements.length; i++) {
					if(getUserMediaImplements[i])
						navigator.getUserMedia = getUserMediaImplements[i];
				};

				audioCtx = extendAudioContext(new AudioContext());
			}
			catch (e) {
				log('No web audio support in this browser!');
			}

			navigator.getUserMedia({audio: true}, startUserMedia, function(e) {
				log('No live audio input: ' + e);     //might be permision problem (denied permission for audio access or smth)
			});
		}
	},
	startUserMedia = function (stream) {
		input = audioCtx.createMediaStreamSource(stream),
		inputAnalyser = audioCtx.createAnalyser(),
		gainNodeOutput = audioCtx.createGain(),
		gainNodeMonitor = audioCtx.createGain(),
		recorder;

		gainNodeMonitor.mute();
		input.connect(inputAnalyser);
		inputAnalyser.connect(gainNodeMonitor);
		gainNodeOutput.connect(audioCtx.destination);
		gainNodeMonitor.connect(audioCtx.destination);
		recorder = new Recorder(inputAnalyser);

		micAccessPromise.resolve();
		micAccess=true;
	},	
	startRecord = function (){
		if(!isRecording){
			isRecording=true;
			recordStarted = {};
			recordStarted.date = Date.now();
			recordStarted.audioTime = audioCtx.currentTime;
			recorder && recorder.record(recordStarted.audioTime); //starting recorder.js record method
			if(tracks.length){
				var stopRecordTime = tracks[0].source.buffer.duration + recordStarted.audioTime;
				stopRecordTimed(stopRecordTime);
			}
			updateRecButton();
		}
	},
	stopRecord = function(interrupt) {
		if(isRecording){
			recorder && recorder.stop(function(){ //callback 
				if(interrupt && tracks.length)
				  recorder.getBuffer(playBufferInterrupt);
				else
				  recorder.getBuffer(playBuffer);

				recorder.clear();
			});
		}  
	},
	stopRecordTimed = function(time) {
		if(isRecording){
			recorder && recorder.stop(function(){ //callback 
				recorder.getBuffer(playBuffer);
				recorder.clear();
			}, time);
		}  
	},
	addTrack = function(buffers){
		recordStarted.audioTime = audioCtx.currentTime;
		recordStarted.date = Date.now();
		playBuffer(buffers);
	},
	playBufferInterrupt = function(buffers){
		var firstTrackLength = tracks[0].source.buffer.length,
		newBufferLength = buffers[0].length,
		toAppend = firstTrackLength - newBufferLength-1;

		buffers[0] = mergeFloat32Arrays(new Float32Array(toAppend), buffers[0]);
		buffers[1] = mergeFloat32Arrays(new Float32Array(toAppend), buffers[1]);

		recordStarted.audioTime-=(toAppend/(audioCtx.sampleRate/1000));
		recordStarted.date-=(toAppend/(audioCtx.sampleRate/1000));

		playBuffer(buffers);
	},
	playBuffer = function (buffers){
		var gainNode = audioCtx.createGain(),
		newSource = audioCtx.createBufferSource();
		newSource.loop = true;

		if(tracks.length){
			var firstTrackLength = tracks[0].source.buffer.length,
			newBufferLength = buffers[0].length;
			console.log("buffer length difference:" + (firstTrackLength - newBufferLength ));
			if(newBufferLength > firstTrackLength){
				buffers[0] = buffers[0].subarray(0, firstTrackLength);
				buffers[1] = buffers[1].subarray(0, firstTrackLength);
			}
			else if(newBufferLength < firstTrackLength){
				var toAppend = firstTrackLength - newBufferLength;
				buffers[0] = mergeFloat32Arrays(buffers[0], new Float32Array(toAppend));
				buffers[1] = mergeFloat32Arrays(buffers[1], new Float32Array(toAppend));
			}
		}

		var latencyCompFrames=audioCtx.sampleRate*(getLatency()/1000);
		buffers[0] = mergeFloat32Arrays(buffers[0].subarray(latencyCompFrames), buffers[0].subarray(buffers[0].length-latencyCompFrames));
		buffers[1] = mergeFloat32Arrays(buffers[1].subarray(latencyCompFrames), buffers[1].subarray(buffers[1].length-latencyCompFrames));

		var newBuffer = audioCtx.createBuffer( 2, buffers[0].length, audioCtx.sampleRate );
		newBuffer.getChannelData(0).set(buffers[0]);
		newBuffer.getChannelData(1).set(buffers[1]);

		newSource.buffer=newBuffer;

		newSource.connect( gainNode );
		gainNode.connect( gainNodeOutput );

		currentTime = audioCtx.currentTime;
		var offsetInNewTrack = (currentTime - recordStarted.audioTime)%(buffers[0].length/audioCtx.sampleRate);
		newSource.start(0, offsetInNewTrack);

		tracks[tracks.length] = {source: newSource, gainNode: gainNode};
		tracks[tracks.length-1].source.buffer.amountOfFrames = buffers[0].length;
		tracks[tracks.length-1].source.date = recordStarted.date;
		tracks[tracks.length-1].source.startTime = currentTime + offsetInNewTrack;
		tracks[tracks.length-1].source.offset = (tracks[tracks.length-1].source.startTime - tracks[0].source.startTime)%(buffers[0].length/audioCtx.sampleRate);

		isRecording=false;

		updateView();
	},
	setLatency = function(val){
	  storage.latency = parseInt(val);
	},
	getLatency = function(){
	  return parseInt(storage.latency);
	},
	deleteTrack = function (trackNo){
		if(trackNo < 0){
			if(tracks.length){
				for (var i = tracks.length-1; i >= 0 ; i--){
					deleteTrack(i);
				}
			}
		}
		else{
			tracks[trackNo].source.stop();
			tracks.remove(trackNo);

			updateView();
		}  
	},
	undoLastRecord = function(){
		deleteTrack(tracks.length-1);
	},
	updateView = function(){
		$rootScope.$broadcast('tracks:update');
	},
	updateRecButton = function(){
		$rootScope.$broadcast('tracks:startRec');
	},
	setOffsetTrack = function(trackNo, offsetPercentage){
		oldTrack = tracks[trackNo];
		buffer = oldTrack.source.buffer;

		trackLengthSeconds = buffer.length / audioCtx.sampleRate;

		if(latencyCalibrateModeEnabled && trackNo==tracks.length-1)
			storage.latency = storage.latency+(trackLengthSeconds * offsetPercentage * -1000);

		offsetPercentage += 1;
		offsetPercentage %= 1;
		offsetSeconds = trackLengthSeconds * offsetPercentage;
		
		playedSecondsOfCurrentLoop = (audioCtx.currentTime - oldTrack.source.startTime)%trackLengthSeconds;
		console.log(playedSecondsOfCurrentLoop);
		offsetInNewTrack = (playedSecondsOfCurrentLoop + offsetSeconds + trackLengthSeconds)%trackLengthSeconds;

		newSource = audioCtx.createBufferSource();
		newSource.loop = true;
		newSource.buffer = buffer;	
		newSource.connect( tracks[trackNo].gainNode );

		newSource.start(0, offsetInNewTrack);
		oldTrack.source.stop();

		console.log("played already "+playedSecondsOfCurrentLoop+" s offsetting "+Math.round(offsetPercentage*100)+"% to "+offsetInNewTrack, "total length: "+trackLengthSeconds);

		offsetPercentage += oldTrack.source.offset;
		offsetPercentage %= 1; 

		newSource.date = oldTrack.source.date + offsetSeconds;
		newSource.startTime = oldTrack.source.startTime + offsetSeconds;
		newSource.offset = offsetPercentage;
		tracks[trackNo].source = newSource;
	}

	var service = {
		toggleLatencyCalibrateModeEnabled: function(){
			latencyCalibrateModeEnabled = !latencyCalibrateModeEnabled;
			return latencyCalibrateModeEnabled;
		},
		isLatencyCaibrateModeEnabled: function(){
			return latencyCalibrateModeEnabled;
		},
		offsetTrack: function(trackNo, offsetPercentage){
			if(offsetPercentage==undefined || trackNo<0){
				if(offsetPercentage==undefined)
					offsetPercentage = trackNo;
				for (var i = tracks.length-1; i >= 0 ; i--){
					setOffsetTrack(i, offsetPercentage);
				}
			}
			else{
				setOffsetTrack(trackNo, offsetPercentage);
			}
		},
		getInputAmplitude: function(){ 
			var freqByte  = new Uint8Array(inputAnalyser.frequencyBinCount);
			inputAnalyser.getByteFrequencyData(freqByte),
			width = 5;

			var sum = 0;
			for(var i = 0; i < width; i++){
				sum += freqByte[i];
			}

			return (sum / (width*256-1));
		},
		isRecording: function(){
			return isRecording;
		},
		addTrack: function(channelData){
			addTrack(channelData);
		},
		getTracks: function(){	
			return tracks;
		},
		init: function(){
			initAudioContext();
		},
		reinit: function(){
			for (var i = tracks.length-1; i >= 0 ; i--){
				tracks[tracks.length-1].source.stop();
				tracks.remove(tracks.length-1);
			}
			gainNodeMonitor.mute();
			gainNodeOutput.setVal(1);
		},
		readyForRecord: function(){
			return micAccess;
		},
		getMicAccessPromise: function(){
			return micAccessPromise.promise;
		},
		toggleRec: function(){
			if(isRecording)
				stopRecord();
			else
				startRecord();
		},
		delRec: function(trackNo){
			deleteTrack(trackNo);
		},
		undoRec: function(){
			undoLastRecord();
		},
		toggleMute: function(trackNo){
			if(trackNo < 0)
				gainNodeOutput.toggleMute();
			else{
				tracks[trackNo].gainNode.toggleMute();
			}
		},
		isMuted: function(trackNo){
			if(!micAccess)
				return false;
			if(trackNo < 0)
				return gainNodeOutput.gain.muted;
			else
				return tracks[trackNo].gainNode.gain.muted;
		},
		getAudioCtx: function(){
			return audioCtx;
		},
		getVolume: function(trackNo){
			if(micAccess){
				if(trackNo < 0)
					return gainNodeOutput.getVal()*100;
				else if(tracks.length)
					return tracks[trackNo].gainNode.getVal()*100;
			}			
		},
		setVolume: function(val, trackNo){
			val = val/100;
			if(micAccess){
				if(trackNo < 0)
					gainNodeOutput.setVal(val);
				else if(tracks.length)
					tracks[trackNo].gainNode.setVal(val);
			}
		},
		getRecordStartTime: function (trackNo){
			if(!trackNo)
				trackNo = 0;

			if(tracks[trackNo])
				return tracks[trackNo].source.date;
			else if(recordStarted.date)
				return recordStarted.date;
			else
				return -1;
		},
		getTrackDuration: function(){
			if(tracks.length)
				return tracks[0].source.buffer.duration*1000;
			else
				return -1;
		},
		getBuffer: function(i, channel){
			if(tracks[i] != undefined){
				if(channel == undefined)
					channel = 0;
				return tracks[i].source.buffer.getChannelData(channel);
			} 
		},
		getOutputGain: function(){
			return gainNodeOutput;
		}
    };
    
    stateService.on(serviceId, 'toggleMute', function(trackNo){
    	service.toggleMute(trackNo);
    });

    return service;
}]);