function ImageSoldHisColor() {}

ImageSoldHisColor.prototype.getColor = function (sourceImage, num, quality) {
  var res = this.getPalette(sourceImage, num || 5, quality);
  return res.palette[0].color;
};

ImageSoldHisColor.prototype.getPalette = function (
  sourceImage,
  colorCount,
  quality
) {
  if (typeof colorCount === "undefined" || colorCount < 2 || colorCount > 256) {
    colorCount = 10;
  }
  if (typeof quality === "undefined" || quality < 1) {
    quality = 10;
  }

  var image = new CanvasView(sourceImage);

  var imageData = image.getImageData();
  var pixels = imageData.data;
  var pixelCount = image.getPixelCount();

  // Store the RGB values in an array format suitable for quantize function
  var pixelArray = [];
  for (var i = 0, offset, r, g, b, a; i < pixelCount; i = i + quality) {
    offset = i * 4;
    r = pixels[offset + 0];
    g = pixels[offset + 1];
    b = pixels[offset + 2];
    a = pixels[offset + 3];
    // If pixel is mostly opaque and not white
    if (a >= 125) {
      if (!(r > 250 && g > 250 && b > 250)) {
        pixelArray.push([r, g, b]);
      }
    }
  }

  // Send array to quantize function which clusters values
  // using median cut algorithm
  var cmap = MMCQ.quantize(pixelArray, colorCount);

  var palette = cmap ? cmap.palette() : null;
  // Clean up
  image.removeCanvas();

  return palette;
};
ImageSoldHisColor.prototype.getColorFromUrl = function (
  imageUrl,
  callback,
  quality
) {
  sourceImage = document.createElement("img");
  var self = this;
  sourceImage.addEventListener("load", function () {
    var palette = self.getPalette(sourceImage, 5, quality);
    var dominantColor = palette[0];
    callback(dominantColor, imageUrl);
  });
  sourceImage.src = imageUrl;
};

ImageSoldHisColor.prototype.getImageData = function (imageUrl, callback) {
  xhr = new XMLHttpRequest();
  xhr.open("GET", imageUrl, true);
  xhr.responseType = "arraybuffer";
  xhr.onload = function (e) {
    if (this.status == 200) {
      uInt8Array = new Uint8Array(this.response);
      i = uInt8Array.length;
      binaryString = new Array(i);
      for (var i = 0; i < uInt8Array.length; i++) {
        binaryString[i] = String.fromCharCode(uInt8Array[i]);
      }
      data = binaryString.join("");
      base64 = window.btoa(data);
      callback("data:image/png;base64," + base64);
    }
  };
  xhr.send();
};

ImageSoldHisColor.prototype.getColorAsync = function (
  imageUrl,
  callback,
  quality
) {
  var self = this;
  this.getImageData(imageUrl, function (imageData) {
    sourceImage = document.createElement("img");
    sourceImage.addEventListener("load", function () {
      var palette = self.getPalette(sourceImage, 5, quality);
      var dominantColor = palette[0];
      callback(dominantColor, this);
    });
    sourceImage.src = imageData;
  });
};

/*!
 * quantize.js Copyright 2008 Nick Rabinowitz.
 * Licensed under the MIT license: http://www.opensource.org/licenses/mit-license.php
 * @license
 */

// fill out a couple protovis dependencies
/*!
 * Block below copied from Protovis: http://mbostock.github.com/protovis/
 * Copyright 2010 Stanford Visualization Group
 * Licensed under the BSD License: http://www.opensource.org/licenses/bsd-license.php
 * @license
 */
if (!pv) {
  var pv = {
    map: function (array, f) {
      var o = {};
      return f
        ? array.map(function (d, i) {
            o.index = i;
            return f.call(o, d);
          })
        : array.slice();
    },
    naturalOrder: function (a, b) {
      return a < b ? -1 : a > b ? 1 : 0;
    },
    sum: function (array, f) {
      var o = {};
      return array.reduce(
        f
          ? function (p, d, i) {
              o.index = i;
              return p + f.call(o, d);
            }
          : function (p, d) {
              return p + d;
            },
        0
      );
    },
    max: function (array, f) {
      return Math.max.apply(null, f ? pv.map(array, f) : array);
    },
  };
}
