loopsoup
.factory('stateService', ['$rootScope', function($root){
	var service = {};
	var eventName = 'trackUpdate';
	service.eventName = eventName;

	service.state = {};
	service.state.selected = -1;

	service.addTrack = function(callerId, trackId){
		$root.$broadcast(eventName, {action: 'add', track: trackId, caller: callerId});
	}
	service.removeTrack = function(callerId, trackId){
		$root.$broadcast(eventName, {action: 'remove', track: trackId, caller: callerId});
	}
	service.toggleMuteTrack = function(callerId, trackId){
		$root.$broadcast(eventName, {action: 'toggleMute', track: trackId, caller: callerId});
	}
	service.selectTrack = function(callerId, trackId){
		$root.$broadcast(eventName, {action: 'select', track: trackId, caller: callerId});
		service.state.selected = trackId;
	}
	service.unselectTrack = function(callerId){
		$root.$broadcast(eventName, {action: 'unselect', caller: callerId});
		service.state.selected = -1;
	}
	service.on = function(listenerId, eventActions, fn){
		$root.$on(eventName, function(event, eventArgs){
			if(angular.isArray(eventActions)){
				eventActions.forEach(function(eventAction){
					if(eventArgs.caller != listenerId && eventArgs.action==eventAction){
						fn(eventArgs.track);
					}
				});
			}
			else{
				eventAction = eventActions;
				if(eventArgs.caller != listenerId && eventArgs.action==eventAction){
					fn(eventArgs.track);
				}
			}
		});
	}
	return service;
}]);