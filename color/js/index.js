var MAX_WIDTH = 600;
var VEC_LEN = 4;

var worker = new Worker("./worker.js");
const colorThief = new ColorThief();

var getPercent = ([colors, labels]) =>
  colors
    .map((color, idx) => ({
      percent:
        (labels.filter((label) => label == idx).length / labels.length) * 100,
      color,
      idx,
    }))
    .sort((a, b) => b.percent - a.percent);

var getLight = ([R, G, B]) => (R * 299 + G * 587 + B * 114) / 1000;

var convertBlackData = (data) => {
  var pixels = _.clone(data);
  //遍历像素点
  for (let i = 0; i < pixels.length; i += 4) {
    let r = pixels[i];
    let g = pixels[i + 1];
    let b = pixels[i + 2];
    //获取灰色
    let gray = getLight([r, g, b]);

    pixels[i] = gray;
    pixels[i + 1] = gray;
    pixels[i + 2] = gray;
  }
  return pixels;
};

var handleBlack = (app, img) => {
  const obj = document.querySelector("#canvas2");
  const ctx = obj.getContext("2d");
  ctx.canvas.width = app.width;
  ctx.canvas.height = app.height;

  var ctx2 = document.querySelector("#canvas").getContext("2d");
  var imageData = ctx2.getImageData(0, 0, app.width, app.height);

  ctx.drawImage(img, 0, 0, app.width, app.height);

  // 获取图片像素信息
  imageData.data = convertBlackData(imageData.data);

  ctx.putImageData(imageData, 0, 0);
  return imageData.data;
};

var getOption = (data) => {
  return {
    backgroundColor: "#fff",
    tooltip: {},
    tooltip: {
      trigger: "item",
      formatter: "{b}: {c} ({d}%)",
    },
    grid: {
      x: 5,
      y: 5,
      x2: 5,
      y2: 5,
    },
    legend: {
      orient: "vertical",
      right: 0,
      icon: "rect",
      itemWidth: 20,
      itemHeight: 20,
      top: "center",
    },
    color: data.map((item) => item.color),
    series: [
      {
        type: "pie",
        center: ["40%", "50%"],
        avoidLabelOverlap: false,
        label: {
          show: true,
          formatter: (e) => e.percent.toFixed(1) + "%",
          textStyle: {
            fontSize: 16,
            color: "rgb(53,76,114)",
          },
          position: "inner",
        },
        // labelLine: { length: 20, length2: 10 },
        emphasis: {
          label: {
            show: true,
            position: "center",
            fontSize: "24",
            fontWeight: "bold",
            formatter: function (e) {
              return e.percent + " %";
            },
          },
        },
        data: data,
      },
    ],
  };
};

var App = new Vue({
  el: "#app",
  data: {
    moduleInitialized: false,
    imageLoaded: false,
    labels: [],
    labels2: [],
    pixels: [],
    pixels2: [],
    percent: [],
    percent2: [],
    colorHoverIdx: -1,
    width: 0,
    height: 0,
    bgColor: "#fff",
    numColors: "6",
    numColors2: "4",
    running: false,
  },
  created: function () {
    var app = this;

    app.$on("moduleInitializedEvent", function () {
      app.moduleInitialized = true;
    });
  },
  watch: {
    numColors() {
      this.run();
    },
    numColors2() {
      this.run();
    },
  },
  mounted: function () {
    var myChart = echarts.init(document.querySelector("#chart"));
    var myChart2 = echarts.init(document.querySelector("#chart2"));

    this.loadFileFromUrl(
      "./img/Brazil_BCB_2_reais_2010.00.00_B874f_P252_FB_036655446_r.jpg"
    );

    var app = this;
    app.$on("kmeansDone", function (data) {
      app.running = false;

      if (data[2] === "color") {
        app.labels = data[1];
        let percent = getPercent(data);
        let option = getOption(
          percent.map((item) => {
            let { c, m, y, k } = colorsys.rgbToCmyk(
              item.color[0],
              item.color[1],
              item.color[2]
            );
            return {
              name: `cmyk(${(c * 100).toFixed(0)},${(m * 100).toFixed(0)},${(
                y * 100
              ).toFixed(0)},${(k * 100).toFixed(0)})`,
              color: app.colorRGB2Hex(item.color),
              value: Number(item.percent.toFixed(1)),
            };
          })
        );
        app.percent = percent;
        myChart.setOption(option);
      } else {
        app.labels2 = data[1];

        let percent = getPercent(data);
        let option = getOption(
          percent.map((item) => {
            let { k } = colorsys.rgbToCmyk(
              item.color[0],
              item.color[1],
              item.color[2]
            );
            return {
              name: `black: ${(k * 100).toFixed(0)}`,
              color: app.colorRGB2Hex(item.color),
              value: Number(item.percent.toFixed(1)),
            };
          })
        );
        app.percent2 = percent;
        myChart2.setOption(option);
      }
    });

    myChart.on("mouseover", function (params) {
      if (app.percent.length === 0) {
        return;
      }
      let idx = params.dataIndex;
      app.handleMouseOverColor(app.percent[idx].idx);
    });
    myChart.on("mouseout", () => {
      app.handleMouseLeaveColors();
    });

    myChart2.on("mouseover", function (params) {
      if (app.percent2.length === 0) {
        return;
      }
      let idx = params.dataIndex;
      app.handleMouseOverColor2(app.percent2[idx].idx);
    });
    myChart2.on("mouseout", () => {
      app.handleMouseLeaveColors("canvas2");
    });
  },
  methods: {
    handleImage: function (id) {
      var app = this;
      var ctx = document.querySelector(id).getContext("2d");
      // Prepare the parameters
      var data = ctx.getImageData(0, 0, app.width, app.height);
      var k = parseInt(this.numColors, 10);
      var imgData = Float64Array.from(data.data);
      var numPixels = imgData.length / VEC_LEN;

      app.pixels = Array.from(imgData);

      worker.postMessage([imgData, k, numPixels, "color"]);

      var dataBlack = convertBlackData(imgData);
      worker.postMessage([
        dataBlack,
        parseInt(this.numColors2, 10),
        numPixels,
        "black",
      ]);
    },
    run: function () {
      this.running = true;

      // 处理左边彩色图像
      this.handleImage("#canvas");
    },
    loadFileFromUrl: function (url) {
      var app = this;

      var img = new Image();
      img.src = url;

      img.onload = function () {
        var ratio = this.width / this.height;
        app.width = Math.min(this.width, MAX_WIDTH);
        app.height = app.width / ratio;

        var ctx = document.querySelector("#canvas").getContext("2d");
        ctx.canvas.width = app.width;
        ctx.canvas.height = app.height;
        ctx.drawImage(img, 0, 0, app.width, app.height);

        app.pixels2 = handleBlack(app, img);

        app.pixels = ctx.getImageData(0, 0, app.width, app.height);

        app.imageLoaded = true;
        let { color } = colorThief.getColor(img);
        app.bgColor = app.colorRGB2Hex(color);

        app.run();
      };
    },
    handleFileChange: function (ev) {
      var app = this;

      app.imageLoaded = false;
      app.percent = [];
      app.percent2 = [];
      app.labels = [];
      app.labels2 = [];
      app.pixels = [];
      app.pixels2 = [];
      app.bgColor = "#fff";

      app.colorHoverIdx = -1;

      if (ev.target.files && ev.target.files[0]) {
        var reader = new FileReader();

        reader.onload = function (e) {
          var img = new Image();
          img.src = e.target.result;

          img.onload = function () {
            var ratio = this.width / this.height;
            app.width = Math.min(this.width, MAX_WIDTH);
            app.height = app.width / ratio;

            var ctx = document.getElementById("canvas").getContext("2d");
            ctx.canvas.width = app.width;
            ctx.canvas.height = app.height;
            ctx.drawImage(img, 0, 0, app.width, app.height);

            // var ctx2 = document.getElementById("canvas2").getContext("2d");
            // ctx2.canvas.width = app.width;
            // ctx2.canvas.height = app.height;
            // ctx2.drawImage(img, 0, 0, app.width, app.height);
            app.pixels2 = handleBlack(app, img);

            app.pixels = ctx.getImageData(0, 0, app.width, app.height);
            app.imageLoaded = true;

            let { color } = colorThief.getColor(img);
            app.bgColor = app.colorRGB2Hex(color);

            app.run();
          };
        };

        reader.readAsDataURL(ev.target.files[0]);
      }
    },
    getRgbaColor: function (color) {
      return "rgb(" + color.slice(0, 3).join(",") + ")";
    },
    getReverseColor: function (color) {
      return color[0] * 0.3 + color[1] * 0.6 + color[2] * 0.1 > 100
        ? "#000"
        : "#fff";
    },
    colorRGB2Hex: function ([r, g, b]) {
      return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    },
    handleMouseOverColor: function (colorIdx) {
      var app = this;
      if (app.colorHoverIdx != colorIdx) {
        app.colorHoverIdx = colorIdx;
        var ctx = document.getElementById("canvas").getContext("2d");
        var imageData = ctx.getImageData(0, 0, app.width, app.height);

        var data = imageData.data;
        for (var i = 0; i < data.length; i += 4) {
          if (app.labels[i / 4] != app.colorHoverIdx) {
            // Make pixel transparent
            data[i + 3] = 0;
          } else {
            // Reset the pixel
            data[i] = app.pixels[i];
            data[i + 1] = app.pixels[i + 1];
            data[i + 2] = app.pixels[i + 2];
            data[i + 3] = app.pixels[i + 3];
          }
        }
        ctx.putImageData(imageData, 0, 0);
      }
    },
    handleMouseOverColor2: function (colorIdx) {
      var app = this;
      if (app.colorHoverIdx != colorIdx) {
        app.colorHoverIdx = colorIdx;
        var ctx = document.getElementById("canvas2").getContext("2d");
        var imageData = ctx.getImageData(0, 0, app.width, app.height);

        var data = imageData.data;
        for (var i = 0; i < data.length; i += 4) {
          if (app.labels2[i / 4] != app.colorHoverIdx) {
            // Make pixel transparent
            data[i + 3] = 0;
          } else {
            // Reset the pixel
            data[i] = app.pixels2[i];
            data[i + 1] = app.pixels2[i + 1];
            data[i + 2] = app.pixels2[i + 2];
            data[i + 3] = app.pixels2[i + 3];
          }
        }
        ctx.putImageData(imageData, 0, 0);
      }
    },
    handleMouseLeaveColors: function (id = "canvas") {
      // Reset the canvas
      var app = this;
      app.colorHoverIdx = -1;
      var ctx = document.getElementById(id).getContext("2d");
      var imageData = ctx.getImageData(0, 0, app.width, app.height);

      var data = imageData.data;
      for (var i = 0; i < data.length; i += 4) {
        // Reset the pixel
        if (id === "canvas") {
          data[i] = app.pixels[i];
          data[i + 1] = app.pixels[i + 1];
          data[i + 2] = app.pixels[i + 2];
          data[i + 3] = app.pixels[i + 3];
        } else {
          {
            data[i] = app.pixels2[i];
            data[i + 1] = app.pixels2[i + 1];
            data[i + 2] = app.pixels2[i + 2];
            data[i + 3] = app.pixels2[i + 3];
          }
        }
      }
      ctx.putImageData(imageData, 0, 0);
    },
    save: function () {
      html2canvas(document.querySelector("#container"), {
        background: "#ffffff", // 一定要添加背景颜色，否则出来的图片，背景全部都是透明的
        dpi: 300, // 处理模糊问题 
        foreignObjectRendering: true,
        scale: 2,
      }).then((canvas) => {
        canvas.toBlob(function (blob) {
          saveAs(blob, "主题色提取.png");
        });
      });
    },
  },
});

worker.onmessage = function (e) {
  var data = e.data;
  if (data[0] === "init") {
    App.$emit("moduleInitializedEvent");
  } else if (data[0] === "result") {
    App.$emit("kmeansDone", data.splice(1));
  }
};
