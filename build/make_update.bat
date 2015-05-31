del www.zip
cd ..\www
"C:\Program Files\WinRAR\WinRAR.exe" a -r -x.svn -x.git -xconfig.xml -xassets -xdata\common -xdata\img -xres -xjs -x*.html ..\build\www.zip .
cd ..\build