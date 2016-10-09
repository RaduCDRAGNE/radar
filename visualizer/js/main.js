// Authors: Catalin Tiseanu, Mihai Gheorghe, Mihai Ciucu

ACCESS_TOKEN = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpandmbXliNDBjZWd2M2x6bDk3c2ZtOTkifQ._QA7i5Mpkd_m30IGElHziw';
MB_ATTR = 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
    '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
    'Imagery © <a href="http://mapbox.com">Mapbox</a>';
MB_URL = 'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=' + ACCESS_TOKEN;
OSM_URL = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
OSM_ATTRIB = '&copy; <a href="http://openstreetmap.org/copyright">OpenStreetMap</a> contributors';

var sirutaPopMap = {};

var grayscale = L.tileLayer(MB_URL, {id: 'mapbox.light', attribution: MB_ATTR});
var streets = L.tileLayer(MB_URL, {id: 'mapbox.streets', attribution: MB_ATTR});

class BaseLayerGroup {
    constructor(jsonPath) {
        this.layerGroup = new L.layerGroup();
        this.jsonPath = jsonPath;
    }

    addTo(map) {
        this.layerGroup.addTo(map);
    }

    setStyle(style) {
        this.innerLayer.setStyle(style);
    }

    redraw() {
        let startTime = performance.now()
        this.setStyle(this.getStyle());
        console.log("Duration: ", (performance.now() - startTime));
    }

    setTooltipData(feature) { }

    mouseOverFeature(e) {
        if (this.lastTarget) {
            this.innerLayer.resetStyle(this.lastTarget);
        }

        this.lastTarget = e.target;

        this.lastTarget.setStyle({
            weight: 4,
            color: 'grey',
            dashArray: '',
            fillOpacity: 0.0
        });

        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            this.lastTarget.bringToFront();
        }

        this.setTooltipData(this.lastTarget.feature);
    }

    mouseOutFeature(e) {
        tooltipDataDiv.html(defaultInfo);
        this.innerLayer.resetStyle(this.lastTarget);
    }

    clickFeature(e) {
        let url = this.getRegionChartUrl(this.lastTarget.feature);
        window.open(url,'_blank');
    }

    setData(data) {
        let myOnEachFeature = (feature, layer) => {
            layer.on({
                click: (e) => {
                    this.clickFeature(e);
                },
                mouseover: (e) => {
                    this.mouseOverFeature(e);
                },
                mouseout: (e) => {
                    this.mouseOutFeature(e);
                },
            });
        };

        this.innerLayer = L.geoJson(data, {
            style: this.getStyle(),
            onEachFeature: myOnEachFeature,
        }).addTo(this.layerGroup);
    }
}

class DemographicsLayer extends BaseLayerGroup {
    constructor() {
        super();
        this.FIRST_DATA_YEAR = this.FIRST_YEAR = 1992;
        this.LAST_DATA_YEAR = this.LAST_YEAR = 2015;
    }

    setFirstYear(year) {
        if (year == this.FIRST_YEAR) {
            return;
        }
        this.FIRST_YEAR = year;
        this.redraw();
    }

    setLastYear(year) {
        if (year == this.LAST_YEAR) {
            return;
        }
        this.LAST_YEAR = year;
        this.redraw();
    }

    getStyle() {
        let getPercentChange = (d) => {
            let firstPopYear = this.FIRST_YEAR;
            while (!d["pop" + firstPopYear] && firstPopYear < this.LAST_YEAR) {
                firstPopYear++;
            }
            if (firstPopYear == this.LAST_YEAR) {
                return 0;
            }
            let lastYearPop = d["pop" + this.LAST_YEAR];
            return (lastYearPop - d["pop" + firstPopYear]) / lastYearPop;
        };

        let getOpacity = (d) => {
            return Math.min(Math.abs(getPercentChange(d)) * 3, 1.0);
        };

        let getColor = (d) => {
            let strength = getPercentChange(d);
            let scale = chroma.scale(['blue', 'red']).domain([-0.25, 0.25], 50);
            return scale(2 * strength).hex();
        };

        return function style(feature) {
            return {
                weight: 0.5,
                opacity: 1,
                color: 'white',
                dashArray: '3',
                fillOpacity: getOpacity(feature.properties),
                fillColor: getColor(feature.properties)
            };
        }
    }

    setTooltipData(feature) {
        let tooltipHTML = "<h3>Informatii regiune</h3>";
        if (datasetLabel === "populatie") {

        } else if (datasetLabel === "electoral") {

        }
        for (let key of Object.keys(feature.properties)) {
            if (key.startsWith("pop")) {
                continue;
            }
            let value = feature.properties[key];
            tooltipHTML += "<p>" + key + ": " + value + "</p>";
        }

        tooltipDataDiv.html(tooltipHTML);
    }

    startAnimation(startYear=this.FIRST_DATA_YEAR, stepDuration=100) {
        let currentLastYear = this.FIRST_YEAR;
        this.animationInterval = setInterval(() => {
            if (currentLastYear > 2015) {
                this.stopAnimation();
                return;
            }
            demographics_layer.setLastYear(currentLastYear);
            currentLastYear += 1;
        }, stepDuration);
    }

    stopAnimation() {
        if (this.animationInterval) {
            clearInterval(this.animationInterval);
        }
    }

    getRegionChartUrl(feature){
        return "http://193.230.8.27:10081/app/kibana#/visualize/edit/Top-judete-ca-populatie-dupa-ani?_g=(filters:!(),refreshInterval:(display:Off,pause:!f,value:0),time:(from:now-15m,mode:quick,to:now))&_a=(filters:!(('$state':(store:appState),meta:(alias:!n,apply:!t,disabled:!f,index:radar-population,key:siruta,negate:!f,value:'" + feature.properties.siruta + "'),query:(match:(siruta:(query:" + feature.properties.siruta + ",type:phrase))))),linked:!f,query:(query_string:(analyze_wildcard:!t,query:'*')),uiState:(),vis:(aggs:!((id:'1',params:(field:population),schema:metric,type:sum),(id:'2',params:(field:year,order:asc,orderBy:_term,size:26),schema:segment,type:terms),(id:'3',params:(field:siruta,order:desc,orderBy:'1',size:5),schema:group,type:terms)),listeners:(),params:(addLegend:!t,addTimeMarker:!f,addTooltip:!t,defaultYExtents:!t,mode:stacked,scale:linear,setYExtents:!f,shareYAxis:!t,times:!(),yAxis:(max:23500000,min:22000000)),title:'Top%20judete%20ca%20populatie%20dupa%20ani',type:histogram))";
    }
}

var demographics_layer = new DemographicsLayer();
var primarii_layer = new L.layerGroup();

var last_target;

var layer;
var datasetLabel;

// Controls
var info;
var about;
var legend;

var map = L.map('map', {
    center: [45.4267674, 26.1025384],
    zoom: 7,
    zoomControl: false,
    layers: [grayscale],
});

// var defaultInfo = '<h4>Informatii<br>Schimba afisajul din stanga</h4>' + "<p>Muta mouseul/Tap <br> pe un obiect de interes</p>";
var defaultInfo = "<p>Muta mouseul/Tap <br> pe un obiect de interes</p>";
// var mapboxAccessToken = "pk.eyJ1IjoiY2F0YWxpbnQiLCJhIjoiY2lzbmEzaHJrMDAwczJ4bWVoZTY1YmJ2NyJ9._QXsrLfaJfmE79a8HLuFSQ";

function redrawDemographics() {
    let start = performance.now();
    demographics_layer.redraw();
    console.log("Redraw duration: ", (performance.now() - start));
}

$.getJSON("data/ro_uat_poligon_small.json", function (data) {
    $.getJSON("data/siruta_population.json", (popData) => {
        for (let pop of popData) {
            let siruta = pop.SIRUTA + "";
            sirutaPopMap[siruta] = sirutaPopMap[siruta] || [];
            sirutaPopMap[siruta].push(pop);
        }
        for (let feature of data.features) {
            let siruta = feature.properties.natcode + "";
            if (sirutaPopMap[siruta]) {
                for (let popEntry of sirutaPopMap[siruta]) {
                    feature.properties["pop" + popEntry.Year] = popEntry.Population;
                    feature.properties['siruta'] = siruta;
                }
            } else {
                console.log("Missing siruta info for ", feature);
            }
        }

        demographics_layer.setData(data);

        demographics_layer.startAnimation(1992, 100);
    });

    $.getJSON("data/extra_locality_regions_data.json", (regData) => {
        for (let key of Object.keys(regData)) {
            let siruta = key + "";
            sirutaRegMap[siruta] = regData[key];
        }

        for (let feature of data.features) {
            let siruta = feature.properties.natcode + "";
            if (sirutaRegMap[siruta]) {
                feature.extra = sirutaRegMap[siruta];
                feature.turnout = 1.0 * feature.extra.b / feature.extra.a;                
            } else {
                console.log("Missing siruta info for ", feature);
            }
        }
        
        primarii = L.geoJson(data, {
            style: style,
        }).addTo(primarii_layer);
    });
});

var baseMaps = {
    "Fara": L.tileLayer("", {opacity: 0.0}),
    "Strazi": streets,
    "Grayscale": grayscale,
};

var overlays = {
    "Demografie": demographics_layer.layerGroup,
};

demographics_layer.addTo(map);

var layerControl = L.control.layers(baseMaps, overlays, {position: 'topleft', collapsed: true}).addTo(map);


// Settings Menu
let tooltipDataDiv = $("#tooltipDataDiv");
let legendDiv = $("#legendDiv");

tooltipDataDiv.html(defaultInfo);
$("#dataset").on("change", function() {
    datasetLabel = this.value;
    // TODO: load new json + redraw
    // tooltipDataDiv.html(this.value);

    if (this.value === "populatie") {
        // TODO: hardcode this values
        legendDiv.html(datasetLabel);
    } else if (this.value === "electoral") {

    }
});
