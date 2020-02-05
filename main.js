
// Plugins should load their own versions of any libraries used even if those libraries are also used
// by the GeositeFramework, in case a future framework version uses a different library version.

require({
    // Specify library locations.
    // The calls to location.pathname.replace() below prepend the app's root path to the specified library location.
    // Otherwise, since Dojo is loaded from a CDN, it will prepend the CDN server path and fail, as described in
    // https://dojotoolkit.org/documentation/tutorials/1.7/cdn
    packages: [
        {
        	name: "jquery",
            location: "//ajax.googleapis.com/ajax/libs/jquery/1.9.0",
            main: "jquery.min"
        },
		{
            name: "d3",
            location: "//d3js.org",
            main: "d3.v3.min"
        }
    ]
});

define([
		"dojo/_base/declare",
		"framework/PluginBase",
		"dojo/parser",
		"dojo/on",
		"dijit/registry",
		"dojo/_base/array",
		"dojo/dom-construct",
		"dojo/query",
		"dojo/dom",
		"dojo/dom-class",
		"dojo/dom-style",
		"dojo/dom-attr",
		"esri/geometry/Extent",
		"d3",
		"underscore",
		"./app",
		"dojo/text!plugins/estuary-restoration/data.json",
		"dojo/text!plugins/estuary-restoration/interface.json"
       ],
       function (declare, PluginBase, parser, on, registry, array, domConstruct, query, dom, domClass, domStyle, domAttr, Extent, d3, _, slr, appData, appConfig) {
           return declare(PluginBase, {
               toolbarName: "Estuary Restoration",
			   fullName: "Estuary Restoration",
               hasHelp: false,
               showServiceLayersInLegend: true,
               allowIdentifyWhenActive: true,
               plugin_directory: "plugins/estuary-restoration",
			   resizable: false,
			   width: 425,
			   _state: {},
			   _firstLoad: true,
			   _saveAndShare: true,

               activate: function () {
					//console.log("activate");
                    if (this._firstLoad && this.app.singlePluginMode) {
                        $('#show-single-plugin-mode-help').click();
                        $('body').removeClass('pushy-open-left').removeClass('pushy-open-right');
                    }
					this.slr._status = "active";
					if (_.isUndefined(this.map.getLayer("estuary-restoration-layer"))) {
						var plugin = this;
						window.setTimeout(function() {
							if (plugin._firstLoad) {
								plugin.slr.loadLayers();
								if (!_.isEmpty(plugin._state)) {
									plugin.loadState();
								}
								plugin.slr.showTool();
							}
						}, 1000);
					} else {
						this.slr.showTool();
					}
               },

               deactivate: function () {
                   //console.log("deactivate");
				   
				    if (_.has(this.slr._interface, "includeMinimize") && !this.slr._interface.includeMinimize && _.has(this.slr, "closeTool")) {
					   this.slr.closeTool();
					   this.slr._status = "close";
				   } else if (_.has(this.slr, "hideTool")) {
					   this.slr.hideTool();
					   this.slr._status = "minimize";
				   }
               },

               hibernate: function () {
				   //console.log("hibernate");
				   if (_.has(this.slr, "closeTool")) {
					   this.slr._status = "close";
					   this.slr.closeTool();
				   }
               },

               initialize: function (frameworkParameters) {
				   //console.log("initialize - plugin");
					var plugin = this;
					declare.safeMixin(this, frameworkParameters);
					  var djConfig = {
						parseOnLoad: true
				    };
				    domClass.add(this.container, "claro");
				    domClass.add(this.container, "plugin-estuary-restoration");
					this.slr = new slr(this, appData, appConfig);
					tool_er = this.slr;
					this.slr.initialize(this.slr);
					domStyle.set(this.container.parentNode, {
						"padding": "0px"
					});
               },

               getState: function () {
                   var plugin = this.slr;
				   var state = new Object();
				   
				   state.extent = {};
				   state.selects = {};
				   state.checkbox = {};
				   
				   state.extent = plugin._map.extent.toJson();
				   
				   state.selects.simulationSelect = {
						"value": plugin.simulationSelect.value
				   }
				   state.selects.flowTideSelect = {
						"value": plugin.flowTideSelect.value
				   }
				   state.selects.modelOutputSelect = {
						"value": plugin.modelOutputSelect.value
				   }
				   
				   array.forEach(_.keys(plugin._interface.additionalLayers), function(layer) {
					   var cb = plugin._interface.additionalLayers[layer];
					   state.checkbox[cb.name + "CheckBox"] = plugin[cb.name + "CheckBox"].checked;
				   })
				   
                   return state;
                },

               setState: function (data) {
				   //console.log("setState");
				   this._state = data;
               },
			   
			   loadState: function () {
				//console.log("loadState");
				//console.log(this._state);
				var plugin = this.slr;
				var state = this._state;

				array.forEach(_.keys(state.selects), function(sel) {
					plugin[sel].value = state.selects[sel].value;
				})

				array.forEach(_.keys(state.checkbox), function(cb) {
					plugin[cb].checked = state.checkbox[cb];
				})
				
				plugin._extent = state.extent;
					 
				this._state = {};
			   }
           });
       });
