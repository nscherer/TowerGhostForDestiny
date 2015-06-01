del www.zip
cd ..\www
"C:\Program Files\WinRAR\WinRAR.exe" a -r -x.svn -x.git -xconfig.xml -xassets -xdata\common -xdata\img -xdata\itemDefs.js -xsync\assets_builtin.json -xres -xjs ..\build\www.zip .
cd ..\build