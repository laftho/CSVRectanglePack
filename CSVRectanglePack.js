//Author- Thomas LaFreniere
//Description- Layout CSV data as packed rectangles. CSV format name,width(cm),height(cm),quantity

var scale = 100; //meters
var scaleFactor = 3;

// GrowingPacker - credit https://github.com/jakesgordon/bin-packing/blob/master/js/packer.growing.js
var GrowingPacker = function() { };

GrowingPacker.prototype = {

  fit: function(blocks) {
    var n, node, block, len = blocks.length;
    var w = len > 0 ? blocks[0].w : 0;
    var h = len > 0 ? blocks[0].h : 0;
    this.root = { x: 0, y: 0, w: w, h: h };
    for (n = 0; n < len ; n++) {
      block = blocks[n];
      if (node = this.findNode(this.root, block.w, block.h))
        block.fit = this.splitNode(node, block.w, block.h);
      else
        block.fit = this.growNode(block.w, block.h);
    }
  },

  findNode: function(root, w, h) {
    if (root.used)
      return this.findNode(root.right, w, h) || this.findNode(root.down, w, h);
    else if ((w <= root.w) && (h <= root.h))
      return root;
    else
      return null;
  },

  splitNode: function(node, w, h) {
    node.used = true;
    node.down  = { x: node.x,     y: node.y + h, w: node.w,     h: node.h - h };
    node.right = { x: node.x + w, y: node.y,     w: node.w - w, h: h          };
    return node;
  },

  growNode: function(w, h) {
    var canGrowDown  = (w <= this.root.w);
    var canGrowRight = (h <= this.root.h);

    var shouldGrowRight = canGrowRight && (this.root.h >= (this.root.w + w)); // attempt to keep square-ish by growing right when height is much greater than width
    var shouldGrowDown  = canGrowDown  && (this.root.w >= (this.root.h + h)); // attempt to keep square-ish by growing down  when width  is much greater than height

    if (shouldGrowRight)
      return this.growRight(w, h);
    else if (shouldGrowDown)
      return this.growDown(w, h);
    else if (canGrowRight)
     return this.growRight(w, h);
    else if (canGrowDown)
      return this.growDown(w, h);
    else
      return null; // need to ensure sensible root starting size to avoid this happening
  },

  growRight: function(w, h) {
    this.root = {
      used: true,
      x: 0,
      y: 0,
      w: this.root.w + w,
      h: this.root.h,
      down: this.root,
      right: { x: this.root.w, y: 0, w: w, h: this.root.h }
    };
    if (node = this.findNode(this.root, w, h))
      return this.splitNode(node, w, h);
    else
      return null;
  },

  growDown: function(w, h) {
    this.root = {
      used: true,
      x: 0,
      y: 0,
      w: this.root.w,
      h: this.root.h + h,
      down:  { x: 0, y: this.root.h, w: this.root.w, h: h },
      right: this.root
    };
    if (node = this.findNode(this.root, w, h))
      return this.splitNode(node, w, h);
    else
      return null;
  }

};

function parseCSV(csvdata)
{
    csvdata = csvdata.split('\n');
    var data = [];

    for (var i in csvdata)
    {
        var csvdatum = csvdata[i].split(',');

        var w = (parseFloat(csvdatum[1]) / scale) * scaleFactor;
        var h = (parseFloat(csvdatum[2]) / scale) * scaleFactor;
        var q = parseInt(csvdatum[3]);

        if (h < w)
        {
            var temp = h;

            h = w;
            w = temp;
        }

        var obj = {
            name: csvdatum[0],
            w: w,
            h: h,
            qty: q
        };

        for(var j = 0; j < obj.qty; j++)
        {
            data.push({
                name: obj.name,
                w: obj.w,
                h: obj.h
            });
        }
    }
    
    return data;
}

function draw(sketch, items, options)
{
    var textSize = (options && options.textSize) ? options.textSize : 0.4;
    var textPaddingX = (options && options.textPaddingX) ? options.textPaddingX : 0.1;
    var textPaddingY = (options && options.textPaddingY) ? options.textPaddingY : 0.02;
    var textAngle = (options && options.textAngle) ? options.textAngle : 1.5708;
    
    var lines = sketch.sketchCurves.sketchLines;
    var texts = sketch.sketchTexts;
    
    for (var i in items)
    {
        var item = items[i];

        var x = item.fit.x;
        var y = item.fit.y;

        var x2 = x + item.w;
        var y2 = y + item.h;

        lines.addTwoPointRectangle(adsk.core.Point3D.create(x, y, 0), adsk.core.Point3D.create(x2, y2, 0));

        var text = item.name.split(' ');

        for (var j = 0; j < text.length; j++)
        {
            var str = text[j];

            if (str.substring(0, 1) == '(') break;

            var textInput = texts.createInput(str, textSize, adsk.core.Point3D.create(x + textPaddingX + (textSize * (j + 1)), y + textPaddingY, 0));
            textInput.angle = textAngle;

            texts.add(textInput);
        }
    }
}

function run(context)
{
    "use strict";
    if (adsk.debug === true)
    {
        /*jslint debug: true*/
        debugger;
        /*jslint debug: false*/
    }
    
    var ui;
    try
    {        
        var app = adsk.core.Application.get();
        ui = app.userInterface;
        
        var dlg = ui.createFileDialog();
        dlg.title = "Open CSV File";
        dlg.filter = "Comma Sparated Values (*.csv);;All Files (*.*)";
        
        if (dlg.showOpen() !== adsk.core.DialogResults.DialogOK)
        {
            adsk.terminate();
            return;
        }
        
        var filename = dlg.filename;
        
        var buffer = adsk.readFile(filename);
        
        if (!buffer)
        {
            ui.messageBox("Failed to open " + filename);
            adsk.terminate();
            return;
        }
        
        var data = parseCSV(adsk.utf8ToString(buffer));
        
        // sort heighest first
        data = data.sort(function(a, b) { 
            if (a.h > b.h)
                return -1; //reverse
            
            if (a.h < b.h)
                return 1;
            
            return 0;
        });
        
        var packer = new GrowingPacker();
        
        packer.fit(data);
        
        var unfit = 0;
        for (var i in data)
        {
            if (!data[i].fit)
                unfit += 1;
        }
        
        if (unfit > 0)
            throw unfit + " unfit!";

        var design = app.activeProduct;
        var rootComp = design.rootComponent;
        var sketch = rootComp.sketches.add(rootComp.xYConstructionPlane);

        draw(sketch, data);
    } 
    catch (e)
    {
        if (ui)
        {
            ui.messageBox('Failed : ' + (e.description ? e.description : e));
        }
    }

    adsk.terminate(); 
}
