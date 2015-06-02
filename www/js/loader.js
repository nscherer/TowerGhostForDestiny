window.ua = navigator.userAgent;
window.isMobile = (/ios|iphone|ipod|ipad|android|iemobile/i.test(ua));

tgd.supportLanguages = ["en", "es", "it", "de", "ja", "pt", "fr"];

tgd.native_loader = true;
tgd.defaults = {
    www_local: tgd.version,
    itemDefs_local: tgd.version,
    icons_local: tgd.version,
    device_locale: "en",
    loaderContent: "",
    wwwPath: "",
    itemDefsPath: "data",
    iconsPath: ""
};
//TODO: This needs to be broken down into ios/android/wp/chrome sub-URLs
var contentPath = "/content/";

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

tgd.versions = {
    local: {
        www: ko.computed(new tgd.StoreObj("www_local")),
        itemDefs: ko.computed(new tgd.StoreObj("itemDefs_local")),
        icons: ko.computed(new tgd.StoreObj("icons_local"))
    },
    remote: {}
}
tgd.components = {
    device_locale: ko.computed(new tgd.StoreObj("device_locale")),
    wwwPath: ko.computed(new tgd.StoreObj("wwwPath")),
    itemDefsPath: ko.computed(new tgd.StoreObj("itemDefsPath")),
    iconsPath: ko.computed(new tgd.StoreObj("iconsPath")),
    loaderContent: ko.computed(new tgd.StoreObj("loaderContent")),
}

var loader = new(function() {
    var self = this;
    var api_url = "https://towerghostfordestiny.com";

    this.loadingDictionary = false;
    this.loadingLocal = false;
    this.init = function() {
        /* new concept: if there is a new loader use that and abort this from executing early */
        if (tgd.native_loader == true && !_.isEmpty(tgd.components.loaderContent())) {
            tgd.native_loader = false;
            delete window.loader;
            var scriptTag = $('<script type="text/javascript"></script>').html(tgd.components.loaderContent()).appendTo("head");
            setTimeout(function() {
                loader.init(), 1000
            });
            return;
        }
        /* asking to load assets immediately whether built in or update assets*/
        self.loadAssets();
        /* don't make this dependent upon the loading process, async task that might update the assets for next load*/
        self.checkVersions();
    }

    this.syncIcons = function(callback) {
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
                tgd.components.iconsPath(data.localPath);
                callback();
            });
        } else {
            callback();
        }
    }

    this.syncWWW = function(callback) {
        if (tgd.versions.local.www() !== tgd.versions.remote.www) {
            console.log(tgd.versions.local.www() + " is local version of www, new version available: " + tgd.versions.remote.www);
            var wwwSync = ContentSync.sync({
                src: api_url + contentPath + 'www.zip',
                id: 'www',
                copyCordovaAssets: false,
                type: "replace"
            });
            wwwSync.on('complete', function(data) {
                console.log('updated www to ' + tgd.versions.remote.www);
                tgd.versions.local.www(tgd.versions.remote.www);
                tgd.components.wwwPath(data.localPath);
                callback(true);
            });
        } else {
            callback(false);
        }
    }

    this.getDeviceLocale = function(callback) {
        if (navigator && navigator.globalization && navigator.globalization.getPreferredLanguage) {
            console.log("getting device locale");
            navigator.globalization.getPreferredLanguage(function(a) {
                var device_locale = a.value.split("-")[0];
                if (tgd.supportLanguages.indexOf(device_locale) > -1) {
                    tgd.components.device_locale(device_locale);
                }
                console.log("device locale is " + tgd.components.device_locale());
                callback();
            });
        } else {
            callback();
        }
    }

    this.syncLocale = function(locale, callback) {
        self.getDeviceLocale(function() {
            var hasNewVersion = (tgd.versions.local.itemDefs() !== tgd.versions.remote.itemDefs && tgd.versions.remote.itemDefs);
            var hasNewLocale = (tgd.components.device_locale() !== locale);
            if (hasNewVersion || hasNewLocale) {
                if (hasNewVersion) {
                    console.log(tgd.versions.local.itemDefs() + " is the current itemDefs, new version available " + tgd.versions.remote.itemDefs);
                }
                if (hasNewLocale) {
                    console.log(tgd.components.device_locale() + " updating itemDefs even though same version because of a new locale detected " + locale);
                }
                var itemDefsSync = ContentSync.sync({
                    src: api_url + '/content/locale/' + locale + '/itemDefs.js.zip',
                    id: 'itemDefs_' + locale,
                    copyCordovaAssets: false,
                    type: "replace"
                });
                itemDefsSync.on('complete', function(data) {
                    console.log(locale + ' updated itemDefs to ' + tgd.versions.remote.itemDefs);
                    tgd.versions.local.itemDefs(tgd.versions.remote.itemDefs);
                    tgd.components.itemDefsPath(data.localPath);
                    tgd.components.device_locale(locale);
                    if (callback) callback();
                });
            } else {
                if (callback) callback();
            }
        });
    }

    this.checkVersions = function() {
        console.log("requesting server latest version");
        $.ajax({
            url: api_url + "/versions.cfm",
            success: function(versions) {
                console.log("latest versions: " + versions);
                tgd.versions.remote = JSON.parse(versions);
                self.syncWWW(function(isNew) {
                    console.log("www is new? " + isNew);
                    console.log("calling syncLocale with " + tgd.components.device_locale());
                    self.syncLocale(tgd.components.device_locale(), function() {
                        console.log("locale synced");
                        self.syncIcons(function() {
                            console.log("icons synced");
                            if (isNew && confirm("There is new content would you like to reload now?")) {
                                location.reload();
                            }
                        });
                    });
                });
            }
        });
    }

    this.loadAssets = function() {
        var wwwPath = tgd.components.wwwPath();
        var itemDefsPath = tgd.components.itemDefsPath();
        var isBuiltInApp = (wwwPath === "");
        var filename = "sync/assets_" + (isBuiltInApp ? "builtin" : "update") + ".json";
        console.log(isBuiltInApp + " loading manifest from: " + wwwPath);
        $.ajax({
            url: wwwPath + filename,
            success: function(assets) {
                self.assets = JSON.parse(assets);
                var loaderIndex = self.assets.js.indexOf("scripts/loader.js");
                if (loaderIndex > -1) {
                    self.assets.js.splice(loaderIndex, 1);
                    $.ajax({
                        url: wwwPath + "/www/scripts/loader.js",
                        success: function(content) {
                            tgd.components.loaderContent(content);
                        }
                    });
                }
                self.assets.loaded_js = self.assets.js.slice();
                self.addCss(wwwPath);
                self.insertJsFile(itemDefsPath + "/itemDefs.js");
                self.addJs(wwwPath);
                self.addTemplates(wwwPath);
            }
        });
    }

    this.loadTGD = function() {
        if (self.assets.loaded_js.length == 0) {
            console.log("APP INIT")
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
        $.each(self.assets.js, function(index, file) {
            self.insertJsFile(basePath + file);
        });
    }

    this.insertHtmlFile = function(filename) {
        $.ajax({
            url: filename,
            success: function(template) {
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
            var index = self.assets.loaded_js.indexOf(filename);
            if (index > -1) {
                self.assets.loaded_js.splice(index, 1);
                self.loadTGD();
            }
        };
        fileref.onerror = function() {
            console.log("error loading " + filename);
        }
        document.getElementsByTagName("head")[0].appendChild(fileref);
    }

    this.insertCssFile = function(filename) {
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