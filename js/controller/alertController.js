loopsoup
.controller('AlertController', ['$scope', 'alertService', function($scope, alertService){
	$scope.alerts = [];
	$scope.alertService = alertService;
	$scope.closeAlert = alertService.closeAlert;
	$scope.closeable = true;

	$scope.$on('alerts:update', function(){
		$scope.$apply(function(){
			$scope.alerts = alertService.getAlerts();
		});
	});
}]);


