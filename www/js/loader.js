window.ua = navigator.userAgent;
window.isMobile = (/ios|iphone|ipod|ipad|android|iemobile/i.test(ua));

tgd.locale = "en";

tgd.defaults = {
    www_local: tgd.version,
    itemDefs_local: tgd.version,
    icon_local: tgd.version
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
    var api_url = "http://towerghostfordestiny.com";

	this.loadingLocal = false;
    this.init = function() {
        /* I think the best basic premise I can use for loading an app dynamically
			if remoteApp is cached load it first
			else if remoteApp is not cached automatically load localApp, remoteApp after			
		 */
        tgd.versions = {
            local: {
                www: ko.computed(new tgd.StoreObj("www_local")),
                itemDefs: ko.computed(new tgd.StoreObj("itemDefs_local")),
                icons: ko.computed(new tgd.StoreObj("icons_local"))
            }
        }

        self.wwwSync = ContentSync.sync({
            src: api_url + '/www.zip',
            id: 'www',
            copyCordovaAssets: false,
            type: "local"
        });

        /* this works perfectly
		wwwSync.on('complete', function(data) {
            console.log('complete');
            console.log(data);
            self.processAssets(data.localPath + "/");
        });*/

        self.wwwSync.on('error', function(data) {
            console.log('error');
            console.log(data);
        });

        /*self.wwwSync.on('progress', function(data) {
            console.log('progress');
            if (data.status == 1){
				self.loadingLocal = true;
				self.processAssets("");
			}
        });*/
    }

    this.processAssets = function(path) {
		console.log("loading manifest from: " + (path + "sync/assets_resolved.json"));
        $.ajax({
            url: path + "sync/assets_resolved.json",
            success: function(assets) {
                self.assets = JSON.parse(assets);
                console.log(self.assets);
                self.addCss();
                self.addJs();
                self.addTemplates();
                setTimeout(function() {
                    app.init()
                }, 1000);
            }
        });
    }

    this.addTemplates = function() {
        $.each(self.assets.templates, function(index, file) {
            self.insertHtmlFile(file);
        });
    }

    this.addCss = function() {
        $.each(self.assets.css, function(index, file) {
            self.insertCssFile(file);
        });
    }

    this.addJs = function() {
        $.each(self.assets.js, function(index, file) {
            self.insertJsFile(file);
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
        //console.log("adding js file " + filename);
        var fileref = document.createElement('script');
        fileref.setAttribute("type", "text/javascript");
        fileref.setAttribute("src", filename);
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