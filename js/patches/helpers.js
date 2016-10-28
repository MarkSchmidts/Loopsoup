//helpers

function mergeFloat32Arrays(arrA, arrB){
	var newArr = new Float32Array(arrA.length + arrB.length);
	newArr.set(arrA);
	newArr.set(arrB, arrA.length);
	return newArr;
}

function isFunction(fn){
  if(typeof fn == 'function')
    return true;
  else
    return false;
}

function isInt(value) {
    var er = /^-?[0-9]+$/;
    return er.test(value);
}

Array.prototype.remove = function(index, deleteCount) {
  if(deleteCount)
    this.splice(index, deleteCount);
  else
    this.splice(index, 1);
};

function zeroTimeout(fn){
  if(typeof fn === 'function')
    setTimeout(fn, 0);
  else
    setTimeout(function(){}, 0);
}

var updateWatchers = function(watchers){
  watchers.forEach(function(callback){
    callback();
  });
} 

function getGermanDateFormat(d){
  return d.getFullYear()+'.'+parseInt(prependZero(d.getMonth()+1))+'.'+prependZero(d.getDate())+'_'+prependZero(d.getHours())+'.'+prependZero(d.getDay());
}

function prependZero(str){
  str = str.toString();
  if(str.length == 1)
    return "0"+str;
  return str;
}