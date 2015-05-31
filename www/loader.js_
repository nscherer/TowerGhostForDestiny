var tgd = {};
window.ua = navigator.userAgent;
window.isMobile = (/ios|iphone|ipod|ipad|android|iemobile/i.test(ua));

tgd.locale = "en";

tgd.defaults = {
	www_version: "",
	itemDefs_version: "",
	icons_version: tgd.version
};

tgd.getStoredValue = function(key) {
    var saved = "";
    if (window.localStorage && window.localStorage.getItem)
        saved = window.localStorage.getItem(key);
    if (_.isEmpty(saved)) {
        return tgd.defaults[key];
    } else {
        return saved
    }
}

tgd.StoreObj = function(key, compare, writeCallback) {
    var value = ko.observable(compare ? tgd.getStoredValue(key) == compare : tgd.getStoredValue(key));
    this.read = function() {
        return value();
    }
    this.write = function(newValue) {
        window.localStorage.setItem(key, newValue);
        value(newValue);
        if (writeCallback) writeCallback(newValue);
    }
}

var loader = new(function(){
	var self = this;
	var api_url = "http://towerghostfordestiny.com";
	this.init = function(){
	
		tgd.versions = {
		    local: {
				www: ko.computed(new tgd.StoreObj("www_version")),
				itemDefs: ko.computed(new tgd.StoreObj("itemDefs_version")),
				icons: ko.computed(new tgd.StoreObj("icons_version"))
		    }
		}
		
		$.ajax({
			url: api_url + "/versions.cfm",
			success: function(versions){
				tgd.versions.remote = versions;
				self.checkVersions();
			},			
			error: function(){
				if (_.isEmpty(tgd.versions.www)){
					/* sorry the server is down the app wont load at all */
				}
				else {
					/* keep loading */
				}				
			}
		});
	}
	
	var count = 0, wwwPath = "";
	this.loadApp = function(type, path){
		console.log(type + " loaded with " + path);
		count++;
		if (type == "www"){
			wwwPath = path;
		}
		if (count == 3){
			if (wwwPath){
				document.location = wwwPath + '/index.html';
			}
			else {
				BootstrapDialog.alert("Error loading app");
			}			
		}
	}
	
	this.checkVersions = function(){
		/* on initial load built in version will be blank so syncType will be replace either way data is missing */
		var wwwSyncType = ( tgd.versions.local.www() == tgd.versions.remote.www ) ? "local" : "replace",
			itemDefsSyncType = ( tgd.versions.local.www() == tgd.versions.remote.itemDefs ) ? "local" : "replace";
			
		console.log("syncing with " + wwwSyncType);	
		
		var wwwSync = ContentSync.sync({ src: api_url + '/www.zip', id: 'www', copyCordovaAssets: false, type:  wwwSyncType });	
		wwwSync.on('complete', function(data) { 
			console.log('complete'); 
			console.log(data);
			console.log(data.localPath);
			tgd.versions.local.www(tgd.versions.remote.www);
			self.loadApp('www',data.localPath);
		});
		
		var itemDefsSync = ContentSync.sync({ src: api_url + '/itemDefs.zip', id: 'itemDefs_' + tgd.locale, copyCordovaAssets: false, type:  itemDefsSyncType });	
		itemDefsSync.on('complete', function(data) { 
			console.log('complete'); 
			console.log(data);
			console.log(data.localPath);
			tgd.versions.local.itemDefs(tgd.versions.remote.itemDefs);
			self.loadApp('itemDefs',data.localPath);
		});
		
		/* save a contentsync call here because all the icons are built in */
		if (tgd.versions.local.icons() !== tgd.versions.remote.icons){
			var iconsSync = ContentSync.sync({ src: api_url + '/' + tgd.versions.remote.icon + '/icons.zip', id: 'icons', copyCordovaAssets: false, type: 'merge' });	
			iconsSync.on('complete', function(data) { 
				console.log('complete'); 
				console.log(data);
				console.log(data.localPath);
				tgd.versions.local.icons(tgd.versions.remote.icons);
				self.loadApp('icons',data.localPath);
			});
		}
		else {
			self.loadApp('icons');
		}
	}	
});


if (isMobile) {
	document.addEventListener('deviceready', loader.init, false);
} else {
    $(document).ready(loader.init);
}