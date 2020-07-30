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

var refreshChart = (data) => {
  return {
    backgroundColor:'#fff',
    tooltip: {},
    tooltip: {
      trigger: "item",
      formatter: "{b}: {c} ({d}%)",
    },
    grid:{ 
        x:5,
        y:5,
        x2:5,
        y2:5
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
            fontSize: 18,
            color: "rgb(53,76,114)",
          },
        },
        labelLine: { length: 20, length2: 10 },
        emphasis: {
          label: {
            show: true,
            position: "center",
            fontSize: "30",
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
    pixels: [],
    percent: [],
    colorHoverIdx: -1,
    width: 0,
    height: 0,
    bgColor: "#fff",
    numColors: "8",
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
  },
  mounted: function () {
    var myChart = echarts.init(document.getElementById("chart"));

    this.loadFileFromUrl(
      "./img/Brazil_BCB_2_reais_2010.00.00_B874f_P252_FB_036655446_r.jpg"
    );

    var app = this;
    app.$on("kmeansDone", function (data) {
      app.labels = data[1];
      app.running = false;
      let percent = getPercent(data);

      let option = refreshChart(
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

      myChart.setOption(option);

      app.percent = percent;
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
  },
  methods: {
    run: function () {
      // Run the algorithm
      var app = this;
      app.running = true;
      var ctx = document.getElementById("canvas").getContext("2d");

      // Prepare the parameters
      var data = ctx.getImageData(0, 0, app.width, app.height);
      var k = parseInt(this.numColors, 10);
      var imgData = Float64Array.from(data.data);
      var numPixels = imgData.length / VEC_LEN;
      app.pixels = Array.from(imgData);

      worker.postMessage([imgData, k, numPixels]);
    },
    loadFileFromUrl: function (url) {
      var app = this;

      var img = new Image();
      img.src = url;

      img.onload = function () {
        var ratio = this.width / this.height;
        app.width = Math.min(this.width, MAX_WIDTH);
        app.height = app.width / ratio;

        var ctx = document.getElementById("canvas").getContext("2d");
        ctx.canvas.width = app.width;
        ctx.canvas.height = app.height;

        ctx.drawImage(img, 0, 0, app.width, app.height);
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
      app.labels = [];
      app.pixels = [];
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
    handleMouseLeaveColors: function () {
      // Reset the canvas
      var app = this;
      app.colorHoverIdx = -1;
      var ctx = document.getElementById("canvas").getContext("2d");
      var imageData = ctx.getImageData(0, 0, app.width, app.height);

      var data = imageData.data;
      for (var i = 0; i < data.length; i += 4) {
        // Reset the pixel
        data[i] = app.pixels[i];
        data[i + 1] = app.pixels[i + 1];
        data[i + 2] = app.pixels[i + 2];
        data[i + 3] = app.pixels[i + 3];
      }
      ctx.putImageData(imageData, 0, 0);
    },
    save: function(){
        html2canvas(document.querySelector("#main")).then(canvas => {
            canvas.toBlob(function(blob) {
                saveAs(blob, "主题色提取.png");
            });
        });
    }
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


