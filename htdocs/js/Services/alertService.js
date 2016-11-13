loopsoup.factory('alertService', ['$rootScope', function($rootScope){
	var alertService = {},
	alerts = [],
	updateView = function(){
		$rootScope.$broadcast('alerts:update');
	};

	alertService.addAlert = function(msg, type) {
		alerts.push({type: type, msg: msg});
		updateView();
	};

	alertService.closeAlert = function(index) {
		alerts.splice(index, 1);
	};

	alertService.getAlerts = function(){
		return alerts;
	};

	return alertService;
}]);