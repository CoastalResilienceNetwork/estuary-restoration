
define([
	    "dojo/_base/declare",
		"d3",
		"underscore",
		"dojo/json",
		"dojo/parser",
		"dojo/on",
		"dojo/_base/array",
		"dojo/_base/html",
		"dojo/_base/window",
		"dojo/query",
		"dojo/dom",
		"dojo/dom-class",
		"dojo/dom-style",
		"dojo/dom-attr",
		"dojo/dom-construct",
		"dojo/dom-geometry",
		"dojo/_base/fx",
		"dojo/fx",
		"dojox/fx",
		"dijit/registry",
		"dijit/layout/ContentPane",
		"dijit/form/HorizontalSlider",
		"dijit/form/HorizontalRuleLabels",
		"esri/layers/ArcGISDynamicMapServiceLayer",
		"esri/layers/ArcGISTiledMapServiceLayer",
		"esri/layers/FeatureLayer",
		"esri/layers/GraphicsLayer",
		"esri/graphic",
		"esri/geometry/Extent",
		"esri/tasks/IdentifyTask",
		"esri/tasks/IdentifyParameters",
		"esri/symbols/SimpleMarkerSymbol",
		"esri/symbols/SimpleLineSymbol",
		"esri/symbols/TextSymbol",  
		"esri/symbols/Font",  
		"esri/Color",
		"dojo/NodeList-traverse"
		], 


	function (declare,
			d3,
			_, 
			JSON,
			parser,
			on,
			array,
			html,
			win,			
			query,
			dom,
			domClass,
			domStyle,
			domAttr,
			domConstruct,
			domGeom,
			fx,
			coreFx,
			xFx,
			registry,
			ContentPane,
			HorizontalSlider,
			HorizontalRuleLabels,
			DynamicMapServiceLayer,
			TiledMapServiceLayer,
			FeatureLayer,
			GraphicsLayer,
			Graphic,
			Extent,
			IdentifyTask,
			IdentifyParameters,
			SimpleMarkerSymbol,
			SimpleLineSymbol,
			TextSymbol,
			Font,
			Color
		  ) 
		
		{

		var slrTool = function(plugin, appData, appConfig){
			var self = this;
			this._data = JSON.parse(appData);
			this._interface = JSON.parse(appConfig);
			this._plugin = plugin;
			this._app = this._plugin.app;
			this._container = this._plugin.container;
			this._plugin_directory = this._plugin.plugin_directory;
			this._legend = this._plugin.legendContainer;
			this._map = this._plugin.map;
			this._status = "close";
			
			on(dom.byId(this._map.getMapId() + "_layers"), "click", function(evt) {
				domStyle.set(self.mapTip, { "display": "none" });
				if (self._status != "close") {
					if (_.has(self._interface.region[self._region], "identify")) {
						
						window.setTimeout(function() {
							var identifyParams = new IdentifyParameters();
							identifyParams.tolerance = 3;
							identifyParams.layerIds = self._mapLayer.visibleLayers;
							identifyParams.layerOption = IdentifyParameters.LAYER_OPTION_VISIBLE;
							identifyParams.width = self._map.width;
							identifyParams.height = self._map.height;
							identifyParams.geometry = evt.mapPoint;
							identifyParams.mapExtent = self._map.extent;
							identifyParams.returnGeometry = false;

							var identifyTask = new IdentifyTask(self._mapLayer.url);
							identifyTask.execute(identifyParams, function(response) {
								
								if (response.length > 0) {
									var field = self._interface.region[self._region].identify.field;
									var value = response[0].feature.attributes[field];
									value = (_.has(self._interface.region[self._region].identify, "lookup")) ? self._interface.region[self._region].identify.lookup[value] : value;

									if (!_.isUndefined(value)) {
										self.mapTip.innerHTML = value;
										domStyle.set(self.mapTip, { "display": "block" });
										var left = evt.screenPoint.x;
										var top = evt.screenPoint.y - domGeom.getMarginBox(self.mapTip).h/2;
										domStyle.set(self.mapTip, {
											"left": left + "px",
											"top": top + "px"
										});
										
										self.mapTip.focus();
									}
									
								}
							});
							
						}, 250);
					}
				
				}
				
			})
			this._mapLayers = {};
			this._mapLayer = {};
			this._mapLayers_closeState = {};
			this._extent = {
				"xmin": 0,
				"ymin": 0,
				"xmax": 0,
				"ymax": 0,
				"spatialReference": {
					"wkid": 102100,
					"latestWkid": 3857
				}
			};
			
			this._firstLoad = this._plugin._firstLoad;

			this.initialize = function(){
				//console.log("initialize - container");
				
				this._extent.xmin = this._interface.extent.xmin;
				this._extent.ymin = this._interface.extent.ymin;
				this._extent.xmax = this._interface.extent.xmax;
				this._extent.ymax = this._interface.extent.ymax;
				
				domStyle.set(this._container, {
					"padding": "0px"
				});
				
				var node = _.first(query("#" + this._container.parentNode.id + " .sidebar-nav"));
				this.infoGraphicButton = domConstruct.create("button", {
					class: "button button-default plugin-estuary-restoration info-graphic",
					style: "display:none",
					innerHTML: '<img src="' + this._plugin_directory + '/InfographicIcon_v1_23x23.png" alt="show overview graphic">'
				}, node, "first")
				
				if (_.has(this._interface, "infoGraphic")) {
					domAttr.set(this.infoGraphicButton, "data-popup", JSON.stringify(this._interface.infoGraphic.popup));
					domAttr.set(this.infoGraphicButton, "data-url", this._interface.infoGraphic.url);
					
					var display = (this._interface.infoGraphic.show) ? "block" : "none";
					domStyle.set(this.infoGraphicButton, "display", display);
				}
				
				on(this.infoGraphicButton, "mouseover", function(){
					self.showMessageDialog(this, "Learn more");
				})
				
				on(this.infoGraphicButton, "mouseout", function(){
					self.hideMessageDialog();
				})
				
				var plugin = this;
				on(this.infoGraphicButton, "click", function(c){
					var popup = JSON.parse(domAttr.get(this, "data-popup"));
					var url = domAttr.get(this, "data-url");
					if (popup) {
						var html = url.replace("PLUGIN-DIRECTORY", plugin._plugin_directory);
						TINY.box.show({
							animate: true,
							html: html,
							fixed: true,
							width: 640,
							height: 450
						});
					} else {
						window.open(url, "_blank");
					}
					
				})
				
				this.loadingDiv = domConstruct.create("div", {
					innerHTML:"<i class='fa fa-spinner fa-spin fa-3x fa-fw'></i>",
					style:"position:absolute; left: 110px; top:50%; width:100px; height:100px; line-height:100px; text-align:center; z-index:1000;"
				}, this._container);
				
				this.loadInterface(this);
			}
			
			this.showIntro = function(){
				var self = this;	
			};

			this.showTool = function(){
				//console.log("showTool");
				//this._firstLoad = false;
				this._mapLayer.show();
				
				if (this._firstLoad) {
					this._map.setExtent(new Extent(this._extent));
					this.updateOptions();
					this.updateMapLayers();
					this._firstLoad = false;
				}
			} 

			this.hideTool = function(){
				//console.log("hideTool");
				domStyle.set(self.tip, { "display": "none" });
			}
			
			this.closeTool = function(){
				//console.log("closeTool");
				if (!_.isEmpty(this._mapLayer)) {
					this._mapLayer.hide();
				}
				domStyle.set(self.tip, { "display": "none" });
				domStyle.set(self.mapTip, { "display": "none" });
			}

			this.loadLayers = function() {
				//console.log("loadLayers");
				this._plugin._firstLoad = false;
				var id = "estuary-restoration-layer";
				var mapLayer = new DynamicMapServiceLayer(this._interface.serviceUrl, { id:id });
				mapLayer.setImageFormat("png32");
				mapLayer.setVisibleLayers([]);
				on(mapLayer,"update-start",function(){
					domStyle.set(self.loadingDiv,"display", "block");
				})
				on(mapLayer,"update-end",function(){
					domStyle.set(self.loadingDiv,"display", "none");
				})
				this._map.addLayer(mapLayer);
				this._mapLayer = mapLayer;
			}
			
			this.updateMapLayers = function() {
				
				var parameters = {};
				parameters.simulation = this.simulationSelect.value.toLowerCase();
				parameters.flowTide = this.flowTideSelect.value.toLowerCase();
				parameters.modelOutput = this.modelOutputSelect.value.toLowerCase();
				
				this._mapLayer.setVisibleLayers([]);
				this._mapLayer.hide();
				
				var layerKey = _.values(parameters).join("|");
				console.log(layerKey);
				var visibleIds = (_.has(this._data, layerKey)) ? this._data[layerKey] : [];
				
				array.forEach(_.keys(this._interface.additionalLayers), function(cb) {
					if (self[cb + "CheckBox"].checked) {
						visibleIds = _.union(visibleIds, self._data[cb]);
					}
				});
				this._mapLayer.setVisibleLayers(visibleIds);
				this._mapLayer.show();
				
			}
						
			this.loadInterface = function() {
				var self = this;
				
				if (!this._app.singlePluginMode) {
					domStyle.set(this._container, { 
						"overflow": "visible"
					});
				}
				
				//empty layout containers
			    this.cp = new ContentPane({
					id: "plugin-estuary-restoration-" + self._map.id,
					style: "position:relative; overflow: visible; width:100%; height:100%;",
					className: 'cr-dojo-dijits'
			    });
			    this.cp.startup();
				this._container.appendChild(this.cp.domNode);
				
				this.createInputs();
				
				this.tip = domConstruct.create("div", { className: "plugin-estuary-restoration estuary-restoration-tooltip interface", tabindex: -1 });
				win.body().appendChild(this.tip);
				
				this.mapTip = domConstruct.create("div", { className: "plugin-estuary-restoration estuary-restoration-tooltip estuary-restoration-maptip interface", tabindex: -1 });
				this._plugin.app._unsafeMap.container.appendChild(this.mapTip);
				on(this.mapTip, "blur", function() {
					domStyle.set(self.mapTip, { "display": "none" });
				});
				
				on(this.mapTip, "click", function() {
					domStyle.set(self.mapTip, { "display": "none" });
				});
				
				this.createTooltips();
				domStyle.set(this.loadingDiv,"display", "none");
			}
			
			this.createInputs = function(){
				this.inputsPane = new ContentPane({});
				this.cp.domNode.appendChild(this.inputsPane.domNode);
			    domStyle.set(this.inputsPane.containerNode, {
					"position": "relative",
					"overflow": "visible",
					"background": "none",
					"border": "none",
					"width": "100%",
					"height": "auto",
					"padding": "20px 20px 5px 20px"
				});
				on(this._map, "resize", function() {
					domStyle.set(self.inputsPane.containerNode, { "width": "100%", "height": "auto" });
				});
				
				var simulationTd = domConstruct.create("div", {
					style:"position:relative; width:100%; margin-bottom:20px;"
				}, this.inputsPane.containerNode);
				
				var flowTideTd = domConstruct.create("div", {
					style:"position:relative; width:100%; margin-bottom:20px;"
				}, this.inputsPane.containerNode);
				
				var modelOutputTd = domConstruct.create("div", {
					style:"position:relative; width:100%; margin-bottom:20px"
				}, this.inputsPane.containerNode);
				
				var additionalLayersTd = domConstruct.create("div", {
					style:"position:relative; width:100%; height:auto; margin-bottom:30px"
				}, this.inputsPane.containerNode);
				
				// simulation control
				var simulationText = domConstruct.create("div", {
					style:"position:relative;margin-bottom:5px;",
					innerHTML: '<span class="info-circle fa-stack fa slr-' + this._map.id + '-simulation"><i class="fa fa-circle fa-stack-1x"></i><span class="fa-stack-1x info-circle-text">1</span></span><b> Select a Simulation:</b>'
				}, simulationTd);
				
				var simulationSelectDiv = domConstruct.create("div", { 
					className: "styled-select",
					style:"width:100%;display:block;margin-bottom:5px;" 
				}, simulationTd);
				this.simulationSelect = domConstruct.create("select", { name: this._interface.simulation.name }, simulationSelectDiv);
				array.forEach(this._interface.simulation.options, function(opt) {
					domConstruct.create("option", { innerHTML: opt.label, value: opt.value }, self.simulationSelect);
				});
				on(this.simulationSelect, "change", function() {
					self.updateOptions();
					self.updateMapLayers();
				});
				this.simulationSelect.value = _.first(this.simulationSelect.options).value;			
				
				
				// flowTide controls
				var flowTideText = domConstruct.create("div", {
					style: "position:relative;margin-bottom:5px;",
					innerHTML: '<span class="info-circle fa-stack fa slr-' + this._map.id + '-flowTide"><i class="fa fa-circle fa-stack-1x"></i><span class="fa-stack-1x info-circle-text">2</span></span><b> Select Flow (cfs) & Tide (ft):</b>'
				}, flowTideTd);
				
				var flowTideSelectDiv = domConstruct.create("div", {
					className: "styled-select",
					style:"width:100%;display:block;margin-bottom:5px;"
				}, flowTideTd);
				this.flowTideSelect = domConstruct.create("select", { name: "dataSource" }, flowTideSelectDiv);
				array.forEach(this._interface.flowTide.options, function(opt) {
					domConstruct.create("option", { innerHTML: opt.label, value: opt.value }, self.flowTideSelect);
				});
				on(this.flowTideSelect, "change", function() { 
					self.updateMapLayers();
				});
				
				// modelOutput controls
				var modelOutputText = domConstruct.create("div", {
					style: "position:relative;margin-bottom:5px;",
					innerHTML: '<span class="info-circle fa-stack fa slr-' + this._map.id + '-modelOutput"><i class="fa fa-circle fa-stack-1x"></i><span class="fa-stack-1x info-circle-text">3</span></span><b> Select a Model Output:</b>'
				}, modelOutputTd);
				
				var modelOutputSelectDiv = domConstruct.create("div", {
					className: "styled-select",
					style:"width:100%;display:block;margin-bottom:5px;"
				}, modelOutputTd);
				this.modelOutputSelect = domConstruct.create("select", { name: "hazard" }, modelOutputSelectDiv);
				array.forEach(this._interface.modelOutput.options, function(opt) {
					domConstruct.create("option", { innerHTML: opt.label, value: opt.value }, self.modelOutputSelect);
				});
				on(this.modelOutputSelect, "change", function() { 
					self.updateMapLayers();
				});
				
				var additionalLayersCp = new ContentPane({
					style:"width:100%;margin-top:10px;position: relative;min-height:28px;padding:0px;"
				}, additionalLayersTd);
				var additionalLayersNode = domConstruct.create("div", { class:"other"}, additionalLayersCp.containerNode);
				domConstruct.create("div", { class:"add-layers-header", innerHTML: "View Supporting Data" }, additionalLayersNode);
				//domConstruct.create("div", { class:"add-layers-instructions", innerHTML: "Learn more about data used as part of these analyses by selecting from the layers below:" }, additionalLayersNode);
				
				var checkBoxDiv = domConstruct.create("div", {}, additionalLayersNode);
				array.forEach(_.keys(this._interface.additionalLayers), function(cb) {
					var cb = self._interface.additionalLayers[cb];
					var checkBoxLabel = domConstruct.create("label", { 
						for: "plugin-estuary-restoration-" + cb.name + "-" + self._map.id,
						className:"styled-checkbox",
						style:"display:block;margin-left:0px;"
					}, checkBoxDiv);
					
					self[cb.name + "CheckBox"] = domConstruct.create("input", {
						type:"checkbox",
						value:cb.value,
						name:cb.name,
						id:"plugin-estuary-restoration-" + cb.name + "-" + self._map.id,
						disabled:false,
						checked:false
					}, checkBoxLabel);
					
					domConstruct.create("div", {
						innerHTML: '<span>' + cb.label +'</span>'
					}, checkBoxLabel);
					
					on(self[cb.name + "CheckBox"], "change", function(){
						self.updateMapLayers();
					});
				});
				
				var opacity = domConstruct.create("div", {
					className: "utility-control",
					innerHTML: '<span class="slr-' + this._map.id + '-opacity"><b>Opacity</b>&nbsp;<i class="fa fa-adjust"></i></span>'
				}, this.inputsPane.containerNode);
				
				on(opacity,"click", function() {
					var status = domStyle.get(self.opacityContainer, "display");
					var display = (status == "none") ? "block" : "none";
					domStyle.set(self.opacityContainer, "display", display);
				})
				
				this.opacityContainer = domConstruct.create("div", {
					className: "utility"
				}, this.inputsPane.containerNode);
				
				//opacity slider
				this.opacitySlider = new HorizontalSlider({
			        name: "opacitySlider",
			        value: 1,
			        minimum: 0,
			        maximum: 1,
			        intermediateChanges: true,
			        showButtons: false,
					disabled: false,
			        style: "width:75px; display:inline-block; margin:0px; background:none;",
			        onChange: function(value){
						self._mapLayer.setOpacity(Math.abs(value));
			        }
			    });
				this.opacityContainer.appendChild(this.opacitySlider.domNode);
			}
			
			this.updateOptions = function() {
				var simulationOption = this.simulationSelect.value.toLowerCase();
				var flowTideOptions = [];
				var modelOutputOptions = [];
				array.forEach(this._interface.flowTide.options, function(flowTideOption) { 
					array.forEach(self._interface.modelOutput.options, function(modelOutputOption) {
						var layerKey = simulationOption + "|" + flowTideOption.value + "|" + modelOutputOption.value;
						if (_.has(self._data, layerKey)) {
							flowTideOptions = _.union(flowTideOptions, [flowTideOption]);
							modelOutputOptions = _.union(modelOutputOptions, [modelOutputOption]);
						}
					});
				}); 

				/* console.log(flowTideOptions);
				console.log(modelOutputOptions); */
				
				domConstruct.empty(this.flowTideSelect);
				array.forEach(flowTideOptions, function(opt) {
					domConstruct.create("option", { innerHTML: opt.label, value: opt.value }, self.flowTideSelect);
				});
				this.flowTideSelect.value = _.first(this.flowTideSelect.options).value;	
				
				domConstruct.empty(this.modelOutputSelect);
				array.forEach(modelOutputOptions, function(opt) {
					domConstruct.create("option", { innerHTML: opt.label, value: opt.value }, self.modelOutputSelect);
				});
				this.modelOutputSelect.value = _.first(this.modelOutputSelect.options).value;	
				
			}
			
			this.createTooltips = function() {
				on(query('*.fa[class*="slr-' + this._map.id + '"]'), "click", function(evt) {
					var cssClass = _.last(domAttr.get(this, "class").split(" "));
					var control = _.last(cssClass.split("-"));
					var tooltips = self._interface.tooltips;
					var message = tooltips[control];
					if (!_.isUndefined(message)) {
						if (_.isObject(message)) {
							var popup = (_.has(message, "popup") && message.popup) ? message.popup : false;
							if (popup) {
								var url = (_.has(message.url, "url")) ? message.url : "";
								var html = (url == "") ? message.html : url.replace("PLUGIN-DIRECTORY", self._plugin_directory);
								var width = (_.has(message, "width")) ? message.width : 600;
								var height = (_.has(message, "height")) ? message.height : 400;
								TINY.box.show({
									animate: true,
									html: html,
									fixed: true,
									width: width + 40,
									height: height + 40
								});
							} else {
								self.showMessageDialog(this, message.html);
							}
							
						} else {
							self.showMessageDialog(this, message);
						}
					}
				});
				
				on(this.tip, "blur", function() {
					window.setTimeout(function() {
						self.hideMessageDialog();
					}, 250);
				});
				
				on(this.tip, "click", function() {
					window.setTimeout(function() {
						self.hideMessageDialog();
					}, 250);
				});
			}

			this.showMessageDialog = function(node, message, position) {
				self.tip.innerHTML = message;
				domStyle.set(self.tip, { "display": "block" });
				
				var p = domGeom.position(win.body());
				var np = domGeom.position(node);
				var nm = domGeom.getMarginBox(node);
				var t = domGeom.getMarginBox(self.tip);
				
				var n = { "x": np.x, "y": np.y, "w": np.w, "h": (np.h == nm.h) ? np.h - 4 : np.h }
				
				var left = n.x - p.x + 1.5*n.w;
				var top = n.y - p.y - t.h/2 + n.h/2;
				
				left = (position && position.l) ? n.x - p.x + position.l : left;
				top = (position && position.t) ? n.y - p.y + t.h/2 + position.t : top;
				
				domStyle.set(self.tip, {
					"left": left + "px",
					"top": top + "px"
				});
				
				self.tip.focus();
            }

            this.hideMessageDialog = function() {
        		domStyle.set(self.tip, { "display": "none" });
			}


		};// End slrTool

		
		return slrTool;	
		
	} //end anonymous function

); //End define
