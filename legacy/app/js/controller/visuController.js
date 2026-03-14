loopsoup.controller('visuController', ['$rootScope', 'stateService', '$scope', 'audioCoreService', '$window', 'paper', '_', '$timeout', 'colorService', '$q',
  function($root, stateService, $scope, audioCore, window, paper, _, $timeout, colorService, $q){
  var ctrlId = 'visuController'+Math.random();

  window.onload = function() {
    windowLoaded.resolve();
  }

  getRandomArr = function(){
    var arr = [];
      for (var i = 0; i < 1000; i++) {
        arr.push((Math.random()*2)-1);
      };
    return arr;
  };  

	$scope.audio = audioCore;

  var canvasNodes = [],
  radiusFactor = 1,
  windowLoaded = $q.defer();

	micPromise = audioCore.getMicAccessPromise();
	
  var tracksVisu = [];
  var inputVisu;
  var marker;  

  paper.install(window);
  paper.setup('canvas');

  $scope.$watch('visuEnabled', function(newVal){
    if(newVal === true){
      init();  
    }
    else if(newVal === false){
      removeAllElements();
    }
  });

  function removeAllElements(){
    tracksVisu.forEach(function(track){
      track.remove();
    });
    if(marker.path)
      marker.path.remove();
    inputVisu.remove();
  }

  Promise.all([micPromise, windowLoaded]).then(function(){
    adjustRadius();

    paper.view.onResize = function(event) {
      if($root.visuEnabled){
        removeAllElements();
        init();    
      }  
    }

    paper.view.onFrame = function(event) {
      if($root.visuEnabled){
        inputVisu.update();   
        marker.update();
      }
    }
	});

  function init(){  
    tracksVisu = [];

    adjustRadius();

    drawAllTracks();

    inputVisu = new recButton(paper.view.innerRadius);

    marker = new loopMarker();
  }

  $scope.$on('tracks:update', function(){
    if($root.visuEnabled)
      drawAllTracks();
  });
  drawAllTracks = function(){
    tracksVisu.forEach(function(el){
      el.remove();
    });
    tracksVisu = [];
    tracks = audioCore.getTracks();
    for(var i=0; i<tracks.length; i++){
      tracksVisu.push(new track(audioCore.getBuffer(i), paper.view.innerRadius+30+40*i, colorService.getColor(i)));
      if(tracksVisu[tracksVisu.length-1].getId().toString()==stateService.state.selected.toString())
        tracksVisu[tracksVisu.length-1].select();
      if(tracks[i].gainNode.isMuted())
        tracksVisu[tracksVisu.length-1].toggleDisableState();
      if(tracks[i].source.offset)
        tracksVisu[i].children[1].rotate(Math.round(tracks[i].source.offset*360), paper.view.center);
    }
  }

  function adjustRadius(){
    width = paper.view.size.width;
    height = paper.view.size.height;
    paper.view.innerRadius = width<height ? width/8 : height/8;

    tracks = audioCore.getTracks();
    if(tracks.length-1 > 6)
      var base = tracks.length-2;
    else
      var base = 7;
    radiusFactor = Math.floor(Math.min(width, height) / base);
  }

  function getXonCircle(centerX, radius, phi){
    phi -= (Math.PI/2);
    return centerX + radius * Math.cos(phi);
  }
  function getYonCircle(centerY, radius, phi){
    phi -= (Math.PI/2);
    return centerY + radius * Math.sin(phi);
  }
  function getPointOnCircle(centerPoint, radius, phi){
    x = getXonCircle(centerPoint.x, radius, phi);
    y = getYonCircle(centerPoint.y, radius, phi);
    return new Point(x,y);
  }

  function track(arr, radius, color){
    this.color = color;
    this.rotAngle = 0;
    this.circleWidth = 26;

    var visuPath = new Path();
    visuPath.name="visuPath Track "+(tracksVisu.length);
    
    visuPath.color = color;
    visuPath.strokeColor = color;
    visuPath.strokeWidth = 2;
    visuPath.strokeCap = 'round';
    visuPath.strokeJoin = 'round';
    visuPath.shadowColor= color;
    visuPath.shadowBlur= 3;
    visuPath.shadowOffset= new Point(1, 1);

    var highestValue=0;
    arr.forEach(function(value){
      if(value>highestValue)
        highestValue = value;
    });
    var normalizerValue = 1.9/highestValue;  
    
    angleSteps = (Math.PI*2)/arr.length;
    rotAngle = angleSteps;

    for (var i = 2; i < arr.length-2; i++) {
      if((i%Math.floor(arr.length/900))==0){
        val = (arr[i-1] * normalizerValue *13)+radius;
        angle = (angleSteps *(i-1))+rotAngle;
        visuPath.add(getPointOnCircle(paper.view.center, val, angle));
      } 
    };    

    selectPath = new CompoundPath({
      children: [
        new Path.Circle({
            center: paper.view.center,
            radius: radius-20
        }),
        new Path.Circle({
            center: paper.view.center,
            radius: radius+20
        })
      ],
      fillColor: 'white'
    });
    selectPath.name="selectPath Track "+(tracksVisu.length);

    this.group = new Group([selectPath, visuPath]);
    this.group.name = "uiElement Track "+(tracksVisu.length);
    this.group.getRadius = function(){
      return Math.round(this.children[0].bounds.height/2);
    };

    this.group.isSelected = false;
    this.group.isRot = false;
    this.group.isDisabled = false;

    this.group.select = function(dontNotify){
      tracksVisu.forEach(function(track){
        if(track!=this && track.isSelected){
          track.unselect(dontNotify);
        }
      });
      this.isSelected = true;
      this.children[0].fillColor = 'cornsilk';

      if(!dontNotify)
        stateService.selectTrack(ctrlId, this.getId());
    }
    this.group.unselect = function(dontNotify){       
      this.isSelected=false;
      this.children[0].fillColor = 'white';

      if(!dontNotify)
        stateService.unselectTrack(ctrlId);
    }
    this.group.toggleSelect = function(){
      if(this.isSelected){
        this.unselect();
      }
      else{
        this.select();
      }
    }
    this.group.reversePreviousSelectState = function(){
      if(this.selectStateBefore)
        this.unselect();
      else
        this.select();
    }
    this.group.setToPreviousSelectState = function(){
      if(this.selectStateBefore)
        this.select();
      else
        this.unselect();
    }
    this.group.toggleDisableState = function(dontNotify){
      if(!this.isDisabled)
        this.children[1].strokeColor = 'grey';
      else
        this.children[1].strokeColor = this.children[1].color;
      this.isDisabled = !this.isDisabled;
      if(!dontNotify)
        stateService.toggleMuteTrack(ctrlId, this.getId());
    }

    this.group.onMouseDrag = function(event){
      if(this.isSelected){
        this.isRot = true;

        dragStart = new Point(event.point.x-event.delta.x, event.point.y-event.delta.y);
        startVector = new Point(dragStart.x-paper.view.center.x, dragStart.y-paper.view.center.y);
        endVector = new Point(event.point.x-paper.view.center.x, event.point.y-paper.view.center.y);
        rotAngle = startVector.getDirectedAngle(endVector);

        if(audioCore.isLatencyCaibrateModeEnabled())
          rotAngle /= 16;

        visuPath.rotate(rotAngle, paper.view.center);
        this.rotAngle += rotAngle;
      }
    }
    this.group.onMouseDown = function(event){ 
      this.rotAngle = 0;
      this.selectStateBefore = this.isSelected;
      this.select();    
      this.holdingSince = Date.now();     
      window.addEventListener('mouseup',this.mouseUp,false);
    }
    this.group.mouseUp = function(event){  
      tracksVisu.forEach(function(track){
        if(track.isSelected){
          window.removeEventListener('mouseup',track.mouseUp,false);
          holdingSince = Date.now()-track.holdingSince;
          wasClick = holdingSince<300;
          wasHold = holdingSince>600;
          if(track.isRot){
            track.isRot = false;
            track.setToPreviousSelectState();
            audioCore.offsetTrack(track.getId(), track.rotAngle/360);
          }
          else if(wasClick){
            track.toggleDisableState();
            track.setToPreviousSelectState();
          }
          else if(wasHold){
            track.reversePreviousSelectState();
          }         
        }
      });
    }
    this.group.onMouseEnter = setCursorPointer;
    this.group.onMouseLeave = setCursorDefault;
    this.group.getId = function(){
      return tracksVisu.indexOf(this);
    };

    return this.group;
  }

  stateService.on(ctrlId, 'unselect', function(){
    tracksVisu.forEach(function(track){
      dontNotify = true;
      track.unselect(dontNotify);
    });
  });
  stateService.on(ctrlId, 'select', function(trackNo){
    dontNotify = true;
    trackNo = parseInt(trackNo);
    tracksVisu[trackNo].select(dontNotify);
  });

  stateService.on(ctrlId, 'toggleMute', function(trackNo){
    dontNotify = true;
    trackNo = parseInt(trackNo);
    if(trackNo>-1)
      tracksVisu[trackNo].toggleDisableState(dontNotify);
  });

  setCursorDefault = function(){
    document.body.style.cursor = "default";
  }
  setCursorPointer = function(){
    document.body.style.cursor = "pointer";
  }

  function getRecButtonTextRaster(isRec, scale){
    fontSize = Math.floor((radiusFactor/1.9)*scale);
    textPoint = new Point(paper.view.center.x-(fontSize/0.72), paper.view.center.y+(fontSize/2.5));

    var text = new PointText(textPoint);
    text.fillColor = 'white';
    text.fontFamily = 'Verdana';
    text.fontWeight = 500;
    text.shadowColor= 'black';
    text.shadowBlur= 3;
    text.shadowOffset= new Point(1, 1);
    text.fontSize = fontSize;
    if(isRec)
      text.content = 'STOP';
    else
      text.content = ' REC';

    textRaster = text.rasterize();
    text.remove();
    return textRaster;
  }

  function getRecButton(radius){
    self = new Path.Circle(paper.view.center, radius-10);
    self.name="recButton Path";
    self.fillColor = 'darkred';   
    self.shadowColor= 'black';
    self.shadowBlur= 3;
    self.shadowOffset= new Point(1, 1);
    return self;
  }


  function recButton(radius){
    var path = getRecButton(radius);

    textRaster = getRecButtonTextRaster(false, 1);

    var group = new Group([path, textRaster]);
    group.isRec = false;
    group.onMouseDown = function(){
      audioCore.toggleRec();      
    }   

    group.onMouseEnter = setCursorPointer;
    group.onMouseLeave = setCursorDefault;

    group.update = function(){
      newState = audioCore.isRecording();
      if(this.isRec!=newState){
        this.isRec=newState;
        
        if(!this.isRec){
          newButton = getRecButton(this.radius);
          oldButton = group.children[0];
          group.children[0].replaceWith(newButton);
          oldButton.remove();

          newText = getRecButtonTextRaster(this.isRec, 1);
          group.removeChildren(1);
          group.addChild(newText);
        }          
      }
      if(this.isRec){
        var scale = 0.4+audioCore.getInputAmplitude()/1.8;
        scale = Math.min(scale, 1);
        scale = Math.max(scale, 0.4);

        newButton = getRecButton(this.radius*scale);
        oldButton = group.children[0];
        group.children[0].replaceWith(newButton);
        oldButton.remove();

        newText = getRecButtonTextRaster(this.isRec, scale);
        group.removeChildren(1);
        group.addChild(newText);
      }
    }

    group.radius = radius;

    return group;
  }

  function loopMarker(){
    this.radius = 0;
    this.angle = 0;
    this.path = undefined;
    this.update = function(){
      if(tracksVisu.length){
        newRadius = tracksVisu[tracksVisu.length-1].getRadius() + 10;
        if(newRadius!=this.radius){
          if(this.path){
            this.path.remove();
            this.path = undefined;   
          }         
        }
        this.radius = newRadius;
        percentagePlayed = ((Date.now()-audioCore.getRecordStartTime())/audioCore.getTrackDuration()) % 1;
        this.angle = Math.PI*2*percentagePlayed;

        if(this.path == undefined){
          this.path = new Path.Circle(getPointOnCircle(paper.view.center, this.radius, this.angle), 5);
          this.path.name="loopMarker Path";
          this.path.strokeColor = 'black';
          this.path.strokeWidth = 3;
        }
        this.path.position = getPointOnCircle(paper.view.center, this.radius, this.angle);
      }
      else if(this.path){
        this.path.remove();
        this.path = undefined;
        this.angle = 0;
      } 
    }
  }
}]);