# CSVRectanglePack
Autodesk Fusion 360 2015 script to parse CSV rectangles and pack into a 2D sketch

Layout CSV data as packed rectangles. CSV format name,width(cm),height(cm),quantity

Script scales dimensions as 1meter:3cm ie. (width/scale)*scaleFactor or (width/100)*3 adjust these values at the top of the script.