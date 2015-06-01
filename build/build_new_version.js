var builderInfo = require("./package.json"),
	fs = require("fs"),
	_ = require("lodash");

var projectPath = "../www/";	

//show the whatsnew in the next version number
var whatsNew = {
	doShow: "false",
	content: fs.readFileSync(projectPath + "whatsnew.html").toString("utf8")
}

if ( process.argv[2] ){
	whatsNew.doShow = "true";
}

updateLoader = false
if ( process.argv[3] ){
	updateLoader = true;
}

var versionInfo = builderInfo.version;

var resolvePaths = function(uri){
	if (uri.indexOf("http://") > -1 || uri.indexOf("https://") > -1)
		return uri;
	else if (uri.indexOf("*") > -1){
		var parts = uri.split("/"), filter = parts[parts.length-1], directory = uri.replace(filter,'');
		filter = filter.replace("*","");
		console.log("Filter is " + filter);
		console.log("directory is " + directory);		
		return _.map(fs.readdirSync(projectPath + directory).filter(function(file){
			return file.indexOf(filter) > -1;
		}), function(file){
			return directory + file;
		});		
	}
	else {
		return uri;
	}
}

var relativePath = "";
var assetsConfigFile = projectPath + "sync/assets.json";
var assetsBuiltInConfigFile = projectPath + "sync/assets_builtin.json";
var assetsUpdateConfigFile = projectPath + "sync/assets_update.json";
var assetsConfigFile = require(assetsConfigFile);
var completedConfigFile = {
	css: [], templates: [], js: []
}
completedConfigFile.css = _.unique(_.flatten(assetsConfigFile.css.map(resolvePaths)));
completedConfigFile.js = _.unique(_.flatten(assetsConfigFile.js.map(resolvePaths)));
completedConfigFile.templates = _.unique(_.flatten(assetsConfigFile.templates.map(resolvePaths)));
fs.writeFileSync(assetsBuiltInConfigFile, JSON.stringify(completedConfigFile, null, 2));
completedConfigFile.js = _.filter(completedConfigFile.js, function(file){
	return file.indexOf("itemDefs") == -1;
});
if ( updateLoader ){
	var backupLoaderPath = "scripts/loader.js", mainLoaderPath = "js/loader.js";
	completedConfigFile.js.unshift(backupLoaderPath);
	fs.writeFileSync(projectPath + backupLoaderPath, fs.readFileSync(projectPath + mainLoaderPath));
}
fs.writeFileSync(assetsUpdateConfigFile, JSON.stringify(completedConfigFile, null, 2));

var chromeConfigFile = "../manifest.json";
var chromeConfig = require(chromeConfigFile);
chromeConfig.version = versionInfo;
fs.writeFileSync(chromeConfigFile, JSON.stringify(chromeConfig, null, 2));

var firefoxConfigFile = "../package.json";
var firefoxConfig = require(firefoxConfigFile);
firefoxConfig.version = versionInfo;
fs.writeFileSync(firefoxConfigFile, JSON.stringify(firefoxConfig, null, 2));

var adobeBuildConfigFile = projectPath + "config.xml";
var xmlConfig = fs.readFileSync(adobeBuildConfigFile).toString("utf8");
//avoid having to load xml libraries to update it
xmlConfig = xmlConfig.replace(/version="(.*)" xmlns=\"http:\/\/www.w3.org\/ns\/widgets\"/,'version="' + versionInfo + '" xmlns="http://www.w3.org/ns/widgets"');
fs.writeFileSync(adobeBuildConfigFile, xmlConfig);

var indexHomePage = projectPath + "index.html";
var indexContent = fs.readFileSync(indexHomePage).toString("utf8");
indexContent = indexContent.replace(/<span class=\"version\">(.*)<\/span>/g,'<span class=\"version\">' + versionInfo + '</span>');

var versionScript = projectPath+ "js/version.js";
var versionContent = fs.readFileSync(versionScript).toString("utf8");
versionContent = versionContent.replace(/tgd.version = \"(.*)\";/g,'tgd.version = \"' + versionInfo + '\";');
fs.writeFileSync(versionScript, versionContent);

indexContent = indexContent.replace(/<div id=\"whatsnew\" style=\"display:none;\">(.*)<\/div>/g,'<div id="whatsnew" style="display:none;">' + escape(JSON.stringify(whatsNew)) + '</div>');
indexContent = indexContent.replace(/<div id=\"showwhatsnew\" style=\"display:none;\">(.*)<\/div>/g,'<div id=\"showwhatsnew\" style=\"display:none;\">' + whatsNew.doShow + '</div>');

fs.writeFileSync(indexHomePage, indexContent);

require("./code_format");