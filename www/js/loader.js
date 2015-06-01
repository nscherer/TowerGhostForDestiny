window.ua = navigator.userAgent;
window.isMobile = (/ios|iphone|ipod|ipad|android|iemobile/i.test(ua));

tgd.supportLanguages = ["en", "es", "it", "de", "ja", "pt", "fr"];

tgd.device_locale = "en";
tgd.native_loader = true;
tgd.defaults = {
    www_local: tgd.version,
    itemDefs_local: tgd.version,
    icons_local: tgd.version,
	loader_local: ""
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


var loader = new(function() {
    var self = this;
    var api_url = "https://towerghostfordestiny.com";

    this.loadingDictionary = false;
    this.loadingLocal = false;
    this.init = function() {
        /* I think the best basic premise I can use for loading an app dynamically
			if remoteApp is cached load it first, checkVersions after and load remoteApp after
			else if remoteApp is not cached automatically load localApp, remoteApp after			
		 */
        tgd.versions = {
            local: {
                isAppCached: true,
                isDictionaryCached: true,
				loader: ko.computed(new tgd.StoreObj("loader_local")),
                www: ko.computed(new tgd.StoreObj("www_local")),
                itemDefs: ko.computed(new tgd.StoreObj("itemDefs_local")),
                icons: ko.computed(new tgd.StoreObj("icons_local"))
            },
            remote: {}
        }
		
		if (tgd.native_loader == true && !_.isEmpty(tgd.versions.local.loader())){
			tgd.native_loader = false;
			var scriptTag = $('<script type="text/javascript"></script>').html( tgd.versions.local.loader() ).appendTo("head");
			return;
		}

        if (navigator && navigator.globalization && navigator.globalization.getPreferredLanguage) {
            console.log("getting device locale");
            navigator.globalization.getPreferredLanguage(function(a) {
                var device_locale = a.value.split("-")[0];
                tgd.device_locale = "en";
                if (tgd.supportLanguages.indexOf(device_locale) > -1) {
                    tgd.device_locale = device_locale;
                }
                console.log("device locale is " + tgd.device_locale);
                self.syncItemDefs(tgd.device_locale);
            });
        }

        self.wwwSync = ContentSync.sync({
            src: api_url + '/content/www.zip',
            id: 'www',
            copyCordovaAssets: false,
            type: "local"
        });

        self.wwwSync.on('complete', function(data) {
            if (self.loadingLocal == false) {
                self.processAssets(data.localPath + "/");
            }
            self.syncComplete(tgd.versions.local.isAppCached ? "replace" : "local", "www");
        });

        self.wwwSync.on('progress', function(data) {
            if (data.status == 1 && self.loadingLocal == false) {
                tgd.versions.local.isAppCached = false;
                self.loadingLocal = true;
                //loading built in first time assets				
                self.processAssets("");
            }
        });
    }

    this.syncItemDefs = function(locale) {
        self.itemDefsSync = ContentSync.sync({
            src: api_url + '/content/locale/' + locale + '/itemDefs.js.zip',
            id: 'itemDefs_' + locale,
            copyCordovaAssets: false,
            type: "local"
        });

        self.itemDefsSync.on('complete', function(data) {
            console.log("attaching device locale in " + locale);
            self.insertJsFile(data.localPath + "/itemDefs.js");
            self.syncComplete(tgd.versions.local.isDictionaryCached ? "replace" : "local", "itemDefs");
        });

        self.itemDefsSync.on('progress', function(data) {
            if (data.status == 1 && self.loadingDictionary == false) {
                tgd.versions.local.isDictionaryCached = false;
                self.insertJsFile("/itemDefs.js");
                self.loadingDictionary = true;
            }
        });
    }
    var options = {};
    this.syncComplete = function(type, id) {
        options[id] = type;
        if ("www" in options && "itemDefs" in options) {
            self.checkVersions(options.www, options.itemDefs);
        }
    }

    var count = 0,
        newContent = false;
    this.loadApp = function(type, path) {
        console.log("results from checkVersion: " + type + " has new content " + path);
        count++;
        if (path) {
            newContent = true;
        }
        if (count == 3 && newContent == true) {
            if (confirm("There is a new version available would you like to restart now?")) {
                location.reload();
            }
        }
    }

    this.checkVersions = function(wwwType, itemDefsType) {
        count = 0;
        console.log("requesting server latest version");
        $.ajax({
            url: api_url + "/versions.cfm",
            success: function(versions) {
                console.log("latest versions: " + versions);
                tgd.versions.remote = JSON.parse(versions);
                if (tgd.versions.local.www() !== tgd.versions.remote.www) {
                    console.log(tgd.versions.local.www() + " going to sync www, new version available " + tgd.versions.remote.www);
                    var wwwSync = ContentSync.sync({
                        src: api_url + '/content/www.zip',
                        id: 'www',
                        copyCordovaAssets: false,
                        type: wwwType ? wwwType : "replace"
                    });
                    wwwSync.on('complete', function(data) {
                        console.log('updated www');
                        tgd.versions.local.www(tgd.versions.remote.www);
                        self.loadApp('www', data.localPath);
                    });
                } else {
                    self.loadApp('www');
                }
                if (tgd.versions.local.itemDefs() !== tgd.versions.remote.itemDefs) {
                    console.log(tgd.versions.local.itemDefs() + " going to sync itemDefs, new version available " + tgd.versions.remote.itemDefs);
                    var itemDefsSync = ContentSync.sync({
                        src: api_url + '/content/locale/' + tgd.device_locale + '/itemDefs.js.zip',
                        id: 'itemDefs_' + tgd.device_locale,
                        copyCordovaAssets: false,
                        type: itemDefsType ? itemDefsType : "replace"
                    });
                    itemDefsSync.on('complete', function(data) {
                        console.log('updated itemDefs');
                        tgd.versions.local.itemDefs(tgd.versions.remote.itemDefs);
                        self.insertJsFile(data.localPath + "/itemDefs.js");
                        self.loadApp('itemDefs', data.localPath);
                    });
                } else {
                    self.loadApp('itemDefs');
                }
                /* save a contentsync call here because all the icons are built in */
                if (tgd.versions.local.icons() !== tgd.versions.remote.icons) {
                    console.log(tgd.versions.local.icons() + " going to sync icons, new version available " + tgd.versions.remote.icons);
                    var iconsSync = ContentSync.sync({
                        src: api_url + '/content/' + tgd.versions.remote.icons + '/icons.zip',
                        id: 'icons',
                        copyCordovaAssets: false,
                        type: 'merge'
                    });
                    iconsSync.on('complete', function(data) {
                        console.log('complete');
                        tgd.versions.local.icons(tgd.versions.remote.icons);
                        self.loadApp('icons', data.localPath);
                    });
                } else {
                    self.loadApp('icons');
                }
            }
        });
    }


    this.processAssets = function(path) {
        var filename = "sync/assets_" + (path == "" ? "builtin" : "update") + ".json";
        console.log("loading manifest from: " + (path + filename));
        $.ajax({
            url: path + filename,
            success: function(assets) {
                self.assets = JSON.parse(assets);
				if (path !== "" && self.assets.js.indexOf("loader.js") > -1){
					$.ajax({
						url: path + "/www/scripts/loader.js",
						success: function(content){
							tgd.versions.local.loader(content);
						}
					});
				}
                self.addCss(path);
                self.addJs(path);
                self.addTemplates(path);
            }
        });
    }

    this.loadTGD = function() {
        //console.log("jsFiles left to load " + self.assets.loaded_js.length);
        if (self.assets.loaded_js.length == 0) {
            app.init();
        }
    }

    this.addTemplates = function(basePath) {
        $.each(self.assets.templates, function(index, file) {
            self.insertHtmlFile(basePath + file);
        });
    }

    this.addCss = function(basePath) {
        $.each(self.assets.css, function(index, file) {
            self.insertCssFile(basePath + file);
        });
    }

    this.addJs = function(basePath) {
        self.assets.loaded_js = self.assets.js;
        $.each(self.assets.js, function(index, file) {
            self.insertJsFile(basePath + file);
        });
    }

    this.insertHtmlFile = function(filename) {
        $.ajax({
            url: filename,
            success: function(template) {
                //console.log(filename + " templated added " + template.length);
                $("#templates").append(template);
            }
        });
    }

    this.insertJsFile = function(filename) {
        console.log("adding js file " + filename);
        var fileref = document.createElement('script');
        fileref.setAttribute("type", "text/javascript");
        fileref.setAttribute("src", filename);
        fileref.onload = function() {
            console.log("file loaded " + filename);
            self.assets.loaded_js.splice(self.assets.loaded_js.indexOf(filename), 1);
            self.loadTGD();
        };
        fileref.onerror = function() {
            console.log("error loading " + filename);
        }
        document.getElementsByTagName("head")[0].appendChild(fileref);
    }

    this.insertCssFile = function(filename) {
        // console.log("adding css file " + filename);
        var fileref = document.createElement("link");
        fileref.setAttribute("rel", "stylesheet");
        fileref.setAttribute("type", "text/css");
        fileref.setAttribute("href", filename);
        document.getElementsByTagName("head")[0].appendChild(fileref);
    }
});


if (isMobile) {
    document.addEventListener('deviceready', loader.init, false);
} else {
    $(document).ready(loader.init);
}