$(function() {
    fetchData('day');
    getLiveWeather();
    getLiveRain();

    $('#span_today').on("click",function(){
        clearCharts();
        fetchData('day');
    });
    $('#span_twodays').on("click",function(){
        clearCharts();
        fetchData('twodays');
    });
    $('#span_week').on("click",function(){
        clearCharts();
        fetchData('week');
    });
    $('#span_month').on("click",function(){
        clearCharts();
        fetchData('month');
    });
    $('#span_year').on("click",function(){
        clearCharts();
        fetchData('year');
    });
});

function clearCharts() {
    $(".chart").each(function() {
       $(this).html("");
    });
    $(".y_axis").each(function() {
       $(this).html("");
    });
    $(".legend").each(function() {
       $(this).html("");
    });
    $(".axis0").each(function() {
       $(this).html("");
    });
    $(".axis1").each(function() {
       $(this).html("");
    });
}


function getLiveWeather() {
    var wxgateway = 'https://home.chrissnell.com:7000/live';

    $.getJSON(wxgateway, {
     }).done(function(data) {

     temp = round(data['results'][0]['series'][0]['values'][0][1],1)
     humid = round(data['results'][0]['series'][0]['values'][0][2],0)
     baro = round(data['results'][0]['series'][0]['values'][0][3], 2)
     windS = round(data['results'][0]['series'][0]['values'][0][4],2)
     windD = round(data['results'][0]['series'][0]['values'][0][5], 0)

     $("div.wx-reading-temperature").html(temp+"&deg;")
     $("div.wx-reading-humidity").text(humid+"%")
     $("div.wx-reading-barometer").text(baro)
     $("div.wx-reading-windspeed").text(windS)
     $("div.wx-reading-winddirection").html(windD+"&deg;")

     setTimeout(getLiveWeather, 3000);
 });
}

function getLiveRain() {
    var wxgateway = 'https://home.chrissnell.com:7000/last-hour-rain';

    $.getJSON(wxgateway, {
     }).done(function(data) {

     //console.log(data)
     console.log(data['results'][0]['series'][0]['values'][0][1])

     rain = round(data['results'][0]['series'][0]['values'][0][1],2)

     $("div.wx-reading-rainfall").text(rain+"\"")

     setTimeout(getLiveRain, 3000);
 });
}



function fetchData(span) {
    var influxdb = 'https://home.chrissnell.com:7000/' + span;

    $.getJSON( influxdb,
            function( influxData ) {
                drawGraphs(influxData);
            }
    );
}

// SELECT mean(OutTemp), mean(OutHumidity), mean(Barometer), mean(WindSpeed), last(WindDir) FROM wx_reading WHERE time > now() - 1d GROUP BY time(5m)

function drawGraphs(data) {

    var palette = new Rickshaw.Color.Palette();


    tData = xformData(data, 1, "Temperature", palette.color(0))
    hData = xformData(data, 2, "Humidity", palette.color(1))
    drawTwoVariableGraph($('#temp_humid'), tData, hData, 'line', 200, 5, 10)

    drawGraph($('#barometer'), xformData(data, 3, "Barometer", palette.color(9)), 'line', 200, 10, " in/Hg");

    drawGraph($('#wind_speed'), xformData(data, 4, "Wind Speed", palette.color(3)), 'line', 200, 10, " MPH");
    drawGraph($('#wind_dir'), xformData(data, 5, "Wind Direction", palette.color(4)), 'line', 75, 4, "&deg;");


    drawGraph($('#rainfall'), xformData(data, 6, "Rainfall", palette.color(8)), 'bar', 100, 5, " in");
}


function xformData(data, elem, name, color) {
    return data.results[0].series.map(function(s) {
        return {
            name: name,
            data: s.values.map(function(v) {
                return { x: v[0], y: v[elem] };
            }),
            color: color
        };
    });
}

function round(value, precision) {
    var multiplier = Math.pow(10, precision || 0);
    return Math.round(value * multiplier) / multiplier;
}


function drawGraph($element, series, renderer, height, ticks, unitText) {
    var graph = new Rickshaw.Graph({
        element: $element.find('.chart').get(0),
        width: 600,
        height: height,
        min: 'auto',
        renderer: renderer,
        series: series
    });

    var xAxis = new Rickshaw.Graph.Axis.Time({
        graph: graph,
        timeFixture: new Rickshaw.Fixtures.Time.Local()
    });

    var yAxis = new Rickshaw.Graph.Axis.Y({
        graph: graph,
        orientation: 'left',
        ticks: ticks,
        element: $element.find('.y_axis').get(0)
    });

    var legend = new Rickshaw.Graph.Legend({
        element: $element.find('.legend').get(0),
        graph: graph
    });

    new Rickshaw.Graph.HoverDetail( {
        graph: graph,
        formatter: function(series, x, y) {
            var date = '<span class="date">' + new Date(x * 1000).toLocaleString() + '</span>';
            var swatch = '<span class="detail_swatch" style="background-color: ' + series.color + '"></span>';
            var content = swatch + series.name + ": " + round(y, 2) + unitText + '<br>' + date;
            return content;
        }
    } );

    graph.render();

}




function drawTwoVariableGraph($element, series1, series2, renderer, height, ticks1, ticks2) {
    series1Arr = series1[0]['data'].map(function(v) {
       return v['y'];
    }).filter(Number);

    series1min = Math.min.apply(null,series1Arr);
    series1max = Math.max.apply(null,series1Arr)

    series2Arr = series2[0]['data'].map(function(v) {
       return v['y'];
    }).filter(Number);

    series2min = Math.min.apply(null,series2Arr);
    series2max = Math.max.apply(null,series2Arr)


    var graphMin;
    var graphMax;

    if (series1min < series2min) {
        graphMin = series1min - (Math.abs(series1min) * 0.1)
    } else {
        graphMin = series2min - (Math.abs(series2min) * 0.1)
    }

    if (series1max > series2max) {
        graphMax = series1max + (Math.abs(series1max) * 0.1)
    } else {
        graphMax = series2max + (Math.abs(series2max) * 0.1)
    }


    graph = new Rickshaw.Graph({
      element: $element.find('.chart').get(0),
      renderer: renderer,
      width: 600,
      min: graphMin,
      max: graphMax,
      series: [series1[0], series2[0]],
    });

    new Rickshaw.Graph.Axis.Y({
      element: $element.find('.axis0').get(0),
      graph: graph,
      orientation: 'left',
    });

    new Rickshaw.Graph.Axis.Y({
      element: $element.find('.axis1').get(0),
      graph: graph,
      grid: false,
      max: 100,
      ticks: 10,
      orientation: 'right',
    });

    new Rickshaw.Graph.Axis.Time({
      graph: graph,
      timeFixture: new Rickshaw.Fixtures.Time.Local()
    });

    var legend = new Rickshaw.Graph.Legend({
        element: $element.find('.legend').get(0),
        graph: graph
    });

    new Rickshaw.Graph.HoverDetail( {
        graph: graph,
        formatter: function(series, x, y) {
            var date = '<span class="date">' + new Date(x * 1000).toLocaleString() + '</span>';
            var swatch = '<span class="detail_swatch" style="background-color: ' + series.color + '"></span>';
            var content = swatch + series.name + ": " + round(y, 1) + '<br>' + date;
            return content;
        }
    } );


    graph.render();
};
