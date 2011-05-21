  /////////
 // DAV //
/////////

var DAV = function() {
	var dav = {}
	var keyToUrl = function(userAddress, key, wallet) {
		var userAddressParts = userAddress.split("@");
		var resource = config.dataScope;
		var url = wallet.davBaseUrl
			+"webdav/"+userAddressParts[1]
			+"/"+userAddressParts[0]
			+"/"+resource
			+"/"+key;
		return url;
	}
	dav.get = function(userAddress, key, cb) {
		var wallet = getWallet();
		$.ajax({
			url: keyToUrl(userAddress, key, wallet) + '?ts'+new Date ().getTime ()+'=0',
			cache: false,
			dataType: "text",
			success: function(text){
				cb(text);
			},
			error: function(xhr) {
				if(xhr.status == 404) {
					cb(null);
				} else {
					alert("error: got status "+xhr.status+" when doing basic auth GET on url "+keyToUrl(userAddress, key, wallet));
				}
			}
		});
	}
	
	dav.put = function(key, text, cb) {
		var wallet = getWallet();
		var xhr = new XMLHttpRequest();
		
		//xhr.open("PUT", keyToUrl(wallet.userAddress, key, wallet), true, wallet.userAddress, wallet.davToken);
		//HACK:
		xhr.open("PUT", keyToUrl(wallet.userAddress, key, wallet), true);
		xhr.setRequestHeader("Authorization", "Basic "+Base64.encode(wallet.userAddress +':'+ wallet.davToken));
		//END HACK.

		xhr.onreadystatechange = function() {
			if(xhr.readyState == 4) {
				if(xhr.status != 200 && xhr.status != 201 && xhr.status != 204 && xhr.status != 1223) { // ie9 says 1223 if 204/No Content is returned
					alert("error: got status "+xhr.status+" when doing basic auth PUT on url "+keyToUrl(wallet.userAddress, key, wallet));
				} else {
					cb();
				}
			}
		}
		xhr.withCredentials = "true";
		xhr.send(text);
	}
	return dav;
}


  //////////////
 // Unhosted //
//////////////

var Unhosted = function() {
	var unhosted = {};
	var dav = DAV();
	unhosted.connect = function() {
		if(!getWallet().davToken) {
			window.location = config.loginUrl;
		}
	}
	unhosted.getUserName = function() {
		return getWallet().userAddress;
	}
	unhosted.getMode = function() {
		if(getWallet().userAddress.split('@')[1] == config.homeDomain) {
			return 'home';
		} else if(getWallet().cryptoPwd == undefined) {
			return 'clear';
		} else {
			return 'crypto';
		}
	}
	unhosted.setCryptoPwd = function(cryptoPwd, onDoesntExist, onOtherError, onSuccess) {
		if(onDoesntExist == null) {
			allowCreation = "true";
		} else {
			allowCreation = "false";
		}
		var wallet = getWallet();
		xhr = new XMLHttpRequest();
		xhr.open ('POST', config.doUrl, true);
		xhr.onreadystatechange = function() {
			if(xhr.readyState == 4) {
				if(xhr.status == 200) {
					try {
						
						var wallet2 = JSON.parse(xhr.responseText);
						wallet.cryptoPwd = wallet2.cryptoPwd;
						setWallet(wallet);
						onSuccess(); 
					} catch(e) {
						onOtherError();
					}
				} else if(xhr.status == 404) {
					onDoesntExist();
				} else {
					onOtherError();
				}
			}
		}
		xhr.setRequestHeader ('Content-Type', 'application/x-www-form-urlencoded; charset=utf-8');
		xhr.send("action=getWallet&userAddress="
		+encodeURIComponent(wallet.userAddress)
		+"&pwd="+encodeURIComponent(cryptoPwd)
		+"&dataScope="+encodeURIComponent(config.dataScope)
		+"&allowCreation="+allowCreation);
	}
	unhosted.get = function(key, requirePwd, cb) {
		var wallet = getWallet();
		return unhosted.getOther(wallet.userAddress, key, requirePwd, cb);
	}
	unhosted.getOther = function(userAddress, key, requirePwd, cb) {
		var wallet = getWallet();
		if(wallet.cryptoPwd == undefined) {
			dav.get(userAddress, key, function(str) {
				try {
					cb(JSON.parse(str));
				} catch(e) {
					requirePwd();
				}
			});
		} else {
			dav.get(userAddress, key, function(str) {
				cb(JSON.parse(sjcl.decrypt(wallet.cryptoPwd, str)));
			});
		}
	}
	unhosted.set = function(key, value, cb) {
		var wallet = getWallet();
		if(wallet.cryptoPwd == undefined) {
			dav.put(key, JSON.stringify(value), cb);
		} else {
			dav.put(key, sjcl.encrypt(wallet.cryptoPwd, JSON.stringify(value)), cb);
		}
	}
	unhosted.close = function() {
		setWallet({});
		window.location = config.loginUrl;
	}

	return unhosted;
}
