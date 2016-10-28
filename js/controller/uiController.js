loopsoup
.controller('uiController', ['stateService', 'ioService', '$rootScope', '$scope', 'audioCoreService', '$timeout', 'colorService', 'hotkeys', '$modal', '$localStorage',
 function(stateService, io, $root, $scope, audioCore, $timeout, colorService, hotkeys, $modal, storage){
 	var ctrlId = 'uiController'+Math.random();

 	$scope.latencyComp=500;
 	$scope.setOffset = function(){
 		if($scope.selectedTrack)
			audioCore.offsetTrack($scope.selectedTrack, $scope.latencyComp);		
 	};

	getCtrlBackgroundStyle = function(i){
		return ".controls.bottom rzslider span, .controls.bottom rzslider span:after, .controls.bottom select {box-shadow: "+colorService.getColor(i)+" 0px 0px 19px;}.controls.bottom span {text-shadow: "+colorService.getColor(i)+" 0px 0px 19px;}";
	}

	$scope.ctrlBackgroundStyle = getCtrlBackgroundStyle(-1);
	$scope.mainColor = colorService.getColor();
	$scope.getColor = colorService.getColor;

	$scope.audioCore = audioCore;

	$scope.selectedTrack = '-1';

	$scope.setMuteIcon = function(toggle){
		if(audioCore.readyForRecord){
			if(audioCore.isMuted($scope.selectedTrack) || toggle)
				$scope.volumeSymbolClass = muteClass;
			else
				$scope.volumeSymbolClass = loudClass;
		}
	}

	var volumeMin = 0, volumeMax = 100, volumeStep=4;
	$scope.volume = 100;
	$scope.volumeSliderChange = function(val){
		if(audioCore.readyForRecord){
			audioCore.setVolume(parseInt(val), $scope.selectedTrack);
			$scope.setMuteIcon();
		}
		return '';
	}

	var muteClass = 'icon-volume-mute2',
		loudClass = 'icon-volume-high';
	$scope.volumeSymbolClass = loudClass;


	micPromise = audioCore.getMicAccessPromise();
	var micAccessModal = $modal.open({
		animation: true,
		templateUrl: 'templates/micAccess.html',
		size: ''
	});
	$scope.disclaimerModal;

	micPromise.then(function(){		
		micAccessModal.opened.then(function(){
			$timeout(function(){
				initUI();
				setHotKeys();
				micAccessModal.close();
				$scope.disclaimerModal = $modal.open({
					animation: true,
					templateUrl: 'templates/disclaimer.html',
					size: ''
				});
			},700);			
		});	
	});

	var initUI = function(){
		$scope.tracks = audioCore.getTracks();
		
		$scope.$on('tracks:update', function(){
			$timeout(function(){
				$scope.tracks = audioCore.getTracks();
				if($scope.selectedTrack > $scope.tracks.length-1){ //jump back to the latest existing track when the current latest was deleted
					$scope.selectedTrack=(parseInt($scope.selectedTrack)-1).toString();
					$scope.notifySelect();
				}				
			});		
		});

		resetUi = function(){
			$scope.selectedTrack = '-1';
			$scope.setMuteIcon();
			$scope.setVolumeSlider();
			$scope.mainColor = colorService.getColor($scope.selectedTrack);
			$scope.ctrlBackgroundStyle = getCtrlBackgroundStyle($scope.selectedTrack);
		}


		$scope.mute = function(dontNotify){
			if(!dontNotify)
				$scope.notifyMute();
			$timeout(function(){
				$scope.setMuteIcon();
				$scope.setVolumeSlider();
			});
		}
		$scope.notifyMute = function(){
			stateService.toggleMuteTrack(ctrlId, $scope.selectedTrack);
		}
		stateService.on(ctrlId, 'toggleMute', function(){
			dontNotify = true;
			$scope.mute(dontNotify);
		});

		$scope.delete = function(){
			if($scope.selectedTrack<0){
				if(window.confirm('Currently all tracks are selected. Do you want to delete them all?')){
					audioCore.delRec($scope.selectedTrack);
					resetUi();
				}
			}
			else{
				audioCore.delRec($scope.selectedTrack);
				resetUi();
			}			
		}

		$scope.download = function(){
			io.getWav($scope.selectedTrack);
		}
		
		$scope.setVolumeSlider = function(){
			$scope.volume = audioCore.getVolume($scope.selectedTrack);
		}
		
		$(".trackSelector").click(function(){
			$(this).blur();
		});
		$scope.selectTrack = function(){
			$timeout(function(){
				$scope.mainColor = colorService.getColor($scope.selectedTrack);	
				$scope.ctrlBackgroundStyle = getCtrlBackgroundStyle($scope.selectedTrack);
				$scope.setMuteIcon();
				$scope.setVolumeSlider();
			});
		}
		$scope.notifySelect = function(){
			$timeout(function(){
				if($scope.selectedTrack.toString()=="-1")
					stateService.unselectTrack(ctrlId);
				else
					stateService.selectTrack(ctrlId, $scope.selectedTrack);
				$scope.selectTrack();
			});
		}		
		stateService.on(ctrlId, ['select', 'unselect'], function(trackNo){
			$scope.selectedTrack = trackNo!=undefined ? trackNo.toString() : "-1";
			$scope.selectTrack();
		});
	}

	//hotkeys
	var setHotKeys = function(){
		hotkeys.add({
			combo: 'right',
			description: 'Increase Volume',
			callback: function() {
				if(($scope.volume+volumeStep)>volumeMax)
					$scope.volume = volumeMax;
				else
					$scope.volume += volumeStep;
			}
		});
		hotkeys.add({
			combo: 'left',
			description: 'Decrease Volume',
			callback: function() {
				if(($scope.volume-volumeStep)<volumeMin)
					$scope.volume = volumeMin;
				else
					$scope.volume -= volumeStep;
			}
		});
		hotkeys.add({
			combo: 'up',
			description: 'Select Previous Track',
			callback: function() {
				if($scope.selectedTrack != -1)
					$scope.selectedTrack=(parseInt($scope.selectedTrack)-1).toString();
				$scope.notifySelect();
			}
		});
		hotkeys.add({
			combo: 'down',
			description: 'Select Next Track',
			callback: function() {
				if($scope.selectedTrack != audioCore.getTracks().length-1)
					$scope.selectedTrack=(parseInt($scope.selectedTrack)+1).toString();
				$scope.notifySelect();
			}
		});
		hotkeys.add({
			combo: 'ctrl',
			description: 'Mute Current Track',
			callback: function() {
				$scope.mute();
			}
		});

		spaceHoldTime = 2000;
		spaceHoldStart = null;
		spaceHoldEvent = null;
		hotkeys.add({
			combo: 'space',
			action: 'keyup',
			description: 'Start/Stop Recording',
			callback: function() {
				if(Date.now()-spaceHoldStart<spaceHoldTime)
					audioCore.toggleRec();
				else
					clearInterval(spaceHoldEvent);
				spaceHoldStart = null;
				spaceHoldEvent = null;
			}
		});
		hotkeys.add({
			combo: 'space',
			action: 'keydown',
			description: 'Start/Stop Recording pressing the button shortly. Hold for '+spaceHoldTime/1000+"s to delete last record. Hold for 10s to delete all tracks.",
			callback: function() {
				if(spaceHoldStart==null)
					spaceHoldStart=Date.now();
				holdingSince = (Date.now()-spaceHoldStart);
				if(spaceHoldEvent==null && holdingSince > spaceHoldTime){
					audioCore.undoRec();
					spaceHoldEvent = setInterval(function(){
						audioCore.undoRec();
					}, spaceHoldTime);
				}
				if(holdingSince>spaceHoldTime*5){
					audioCore.delRec(-1);
					clearInterval(spaceHoldEvent);
					spaceHoldStart = null;
					spaceHoldEvent = null;
				}
			}
		});
		hotkeys.add({
			combo: 'enter',
			description: 'Delete Last Record',
			callback: function() {
				audioCore.undoRec();
			}
		});
		hotkeys.add({
			combo: 'del',
			description: 'Delete Current Track',
			callback: function() {
				$scope.delete();
			}
		});

		hotkeys.add({
			combo: "shift+c",
			description: 'enter secret calibration mode',
			callback: function(){
				$scope.calibMode = audioCore.toggleLatencyCalibrateModeEnabled();
			}
		});
	}
}]);
