var init = function () {
  var imgSource = $("#img")[0];
  const colorThief = new ColorThief();
  let mainColor = "";
  var dominantColorTag = $(".dominantColor")[0];

  mainColor = colorThief.getColor(imgSource);
  dominantColorTag.style.backgroundColor = colorRGB2Hex(mainColor.color);

  var paletteColors = colorThief.getPalette(imgSource, 10);

  let data = [];
  var sum = 0;
  for (var i = 0; i < paletteColors.length; i++) {
    var item = paletteColors[i];
    let name = colorRGB2Hex(item.color);

    data.push({
      name: name,
      value: item.num,
    });
    sum += item.num;
  }
  data = data
    .map(function (item) {
      item.percent = (item.value / sum) * 100;
      return item;
    })
    .filter((item) => item.percent > 0.5);

  var myChart = echarts.init(document.getElementById("chart"));
  var option = {
    tooltip: {},
    tooltip: {
      trigger: "item",
      formatter: "{b}: {c} ({d}%)",
    },
    legend: {
      orient: "vertical",
      right: 3,
      icon: "rect",
      itemWidth: 20,
      itemHeight: 20,
      top: 5,
    },
    color: data.map((item) => item.name),
    series: [
      {
        type: "pie",
        center: ["50%", "60%"],
        // radius: ["40%", "70%"],
        avoidLabelOverlap: false,
        label: {
          show: true,
          //position: "inner",
          formatter: (e) => e.percent.toFixed(1) + "%", // {b}:
          textStyle: {
            fontSize: 20,
            color: "rgb(53,76,114)",
          },
        },
        labelLine: { length: 30, length2: 20 },
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
  // 使用刚指定的配置项和数据显示图表。
  myChart.setOption(option);
};

window.onload = init;
const input = document.querySelector("input");

function updateImageDisplay() {
  for (const file of input.files) {
    $("#img")[0].src = URL.createObjectURL(file);
    setTimeout(() => {
      init();
    }, 400);
  }
}

$("#file").on("change", updateImageDisplay);

function colorReturn(rgbArr) {
  return "rgb(" + rgbArr[0] + "," + rgbArr[1] + "," + rgbArr[2] + ")";
}
function colorRGB2Hex([r, g, b]) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
