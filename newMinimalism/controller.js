exports.controller = (function() {
  var intervalTimer;
  function onError(str) {
    alert(str);
  }
  function connect(userAddress) {
    exports.webfinger.getAttributes(userAddress, onError, function(attributes) {
      exports.oauth.go(attributes.auth, location.host, userAddress);
    });
  }
  function disconnect() {
  }
  function configure(setOptions) {
    console.log(setOptions);
    exports.button.on('connect', connect);
    exports.button.on('disconnect', disconnect);
    exports.button.show();
  }
  function onLoad(setOptions) {
    configure(setOptions); 
    exports.oauth.harvestToken(function(token) {
      exports.session.setToken(token);
    });
    intervalTimer = setInterval("exports.controller.trigger('timer');", 10000);
  }
  function trigger(event) {
    console.log(event);
    if(exports.versioning.takeLocalSnapshot()) {
      console.log('changes detected');
      if(exports.session.isConnected()) {
        console.log('pushing');
      } else {
        console.log('not connected');
      }
    }
  }
  return {
    configure: configure,
    onLoad: onLoad,
    trigger: trigger
  };
})();