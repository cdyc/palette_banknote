function CanvasView(image) {
  this.canvas = document.createElement("canvas");
  this.context = this.canvas.getContext("2d");
  this.width = this.canvas.width = image.width;
  this.height = this.canvas.height = image.height;
  document.body.appendChild(this.canvas);
  this.context.drawImage(image, 0, 0, this.width, this.height);
}

CanvasView.prototype.clearImage = function () {
  this.context.clearRect(0, 0, this.width, this.height);
};

CanvasView.prototype.update = function (imageData) {
  this.context.putImageData(imageData, 0, 0);
};

CanvasView.prototype.getPixelCount = function () {
  return this.width * this.height;
};

CanvasView.prototype.getImageData = function () {
  return this.context.getImageData(0, 0, this.width, this.height);
};

CanvasView.prototype.removeCanvas = function () {
  this.canvas.parentNode.removeChild(this.canvas);
};
