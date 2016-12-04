loopsoup
.factory('colorService', [function(){
	var service = {},
	trackColors = ['#6AB26D', '#4D9CB6', '#E95013', '#A600EB', '#FF002D'],
	backgroundColor = '#FFFFFF';

	function hexToRgba(hex) {
	    hex = hex.slice(1);
	    var bigint = parseInt(hex, 16),
	    r = (bigint >> 16) & 255,
	    g = (bigint >> 8) & 255,
	    b = bigint & 255,
	    a = 0.3;

	    return "rgba(" + r + "," + g + "," + b + "," + a + ")";
	}

	service.getColor = function (trackNo, rgba){
		if(trackNo>-1){
			if(rgba != undefined && rgba >-1){
				rgba = rgba % 1;
				return hexToRgba(trackColors[trackNo%trackColors.length]);	  		
			}
			else
				return trackColors[trackNo%trackColors.length];
		}
	  	else{
	  		if(rgba != undefined && rgba >-1){
				rgba = rgba % 1;
				return hexToRgba(backgroundColor);
			}
			else
				return backgroundColor;
		}
	}

	return service;
}])