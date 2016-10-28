var underscore = angular.module('underscore', []);
underscore.factory('_', function() {
  return window._; //Underscore must already be loaded on the page
});

angular.module('angular-paper', [])
.factory('paper', ['$window', function($window) {
  return $window.paper;
}]);

var loopsoup = angular.module('looper', ['angular-paper', 'ui.bootstrap', 'ngStorage', 'rzModule', 'cfp.hotkeys', , 'underscore']);

loopsoup
.run(['$rootScope', 'audioCoreService', '$localStorage', 'colorService',
 function(root, audioCore, storage, colorService){
 	root.title = 'loopsoup';
	root.pageTitle = root.title + " ~ WebRecording";
	storage = storage.$default({
	    latency: 60
	});
	root.storage = storage;

	root.visuEnabled = true;

	audioCore.init();

	root.isDevEnvironment = window.location.hostname=="localhost";

	if(!root.isDevEnvironment){  //only enable when on production/show case servers, not on dev-environment
		$(document).ready(function(){
			$('*').each(function() { //no rightclick, might cause problems on mobiles
				$(this)[0].oncontextmenu = function() {return false;};
			});
	  	});
	}
}]);
