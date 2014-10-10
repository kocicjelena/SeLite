/*
 * Copyright 2013,  2014 Peter Kehl
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
"use strict";
//var console = (Components.utils.import("resource://gre/modules/devtools/Console.jsm", {})).console;
//console.error( 'extension-loader');
Components.utils.import("chrome://selite-extension-sequencer/content/SeLiteExtensionSequencer.js");
Components.utils.import("resource://gre/modules/AddonManager.jsm");

// Selenium IDE loads this file twice. Maybe related to
// http://code.google.com/p/selenium/issues/detail?id=6697
// Therefore here I make sure to register this plugin itself and I load sequencer manifests of target plugins and register them with Selenium only once.
// Developers: if you use debugger; statements here, that will (normally) not trigger a breakpoint, not even if you invoke firefox with parameter -jsdebugger, because this gets processed before Browser Debugger/ToolBox shows up.
if( !SeLiteExtensionSequencer.processedAlready ) {
    // I must reset SeLiteExtensionSequencer.coreExtensionsLoadedTimes. I can't expect that extensions will have an even number of loads - because if the user closes Selenium IDE before running any Selenese, the extensions don't get loaded for the 2nd time during that run of Selenium IDE, and the odd-even sequence would not apply.
    SeLiteExtensionSequencer.coreExtensionsLoadedTimes= {};

    var ide_api= new API(); // API comes from chrome://selenium-ide/content/api.js - referenced through ./extension-loader.xul
    // Register itself - so that it shows up in Selenium IDE > Options > Options > Plugins
    ide_api.addPluginProvidedUserExtension( 'chrome://selite-extension-sequencer/content/extensions/core.js' );
    ide_api.addPlugin( 'extension-sequencer@selite.googlecode.com' );

    // For some reasons I couldn't use console here (Firefox 26.0, Selenium IDE 2.5.0). Using it generated a log: can't start debugging: a debuggee script is on the stack webconsole.js:68. I can use console in the handler function passed to AddonManager.getAllAddons():
    AddonManager.getAllAddons(
    function( addons ) {
        var problems= []; // Chunks of message. This will add new lines after each chunk.
        var console= Components.utils.import("resource://gre/modules/devtools/Console.jsm", {}).console;
        var subScriptLoader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"].getService(Components.interfaces.mozIJSSubScriptLoader);
        var addonsById= {}; // Object { string addOnId => Addon object }. This includes all add-ons, not just ones with SeLiteExtensionSequencerManifest.js. I need those other add-ons later when calling SeLiteExtensionSequencer.sortedPlugins( addonsById ), which checks for non-sequenced dependencies.
        for( var i=0; i<addons.length; i++ ) { //@TODO for(.. of ..) once NetBeans supports it
            var addon= addons[i];
            addonsById[ addon.id ]= addon;
            // On Windows some addon objects don't have function 'hasResource'
            if( addon.isActive && addon.hasResource && addon.hasResource( 'chrome/content/SeLiteExtensionSequencerManifest.js') ) {
                console.log( 'SeLiteExtensionSequencer is registering addon with ID ' +addon.id );
                var fileUrl= addon.getResourceURI('chrome/content/SeLiteExtensionSequencerManifest.js').spec;
                try {
                    subScriptLoader.loadSubScript(
                        fileUrl,
                        { SeLiteExtensionSequencer: SeLiteExtensionSequencer
                        },
                        'UTF-8'
                    );
                }
                catch( e ) {
                    problems.push( 'Add-on ' +addon.name+ ' has an error in its SeLiteExtensionSequencerManifest.js. Please report this issue '+
                        (addon.id.indexOf('selite.googlecode.com')>0
                         ? 'at <a href="https://code.google.com/p/selite/wiki/ReportingIssues/">https://code.google.com/p/selite/wiki/ReportingIssues/</a>'
                         : 'to its author (but not to SeLite project).'
                        )
                    );
                    problems.push( ''+e );
                    problems.push( e.stack );
                }
            }
        }
        var sortedPlugins= SeLiteExtensionSequencer.sortedPlugins( addonsById );
        if( Object.keys(sortedPlugins.missingDirectDependancies).length ) {
            var dependancyPluginNames= {}; // { pluginId => pluginName } - for dependancies only
            for( var dependantId in SeLiteExtensionSequencer.plugins ) {
                var plugin= SeLiteExtensionSequencer.plugins[dependantId];
                for( var dependencyPluginId in plugin.requisitePlugins ) {
                    dependancyPluginNames[dependencyPluginId]= plugin.requisitePlugins[dependencyPluginId];
                }
                for( var dependencyPluginId in plugin.optionalRequisitePlugins ) {
                    dependancyPluginNames[dependencyPluginId]= plugin.optionalRequisitePlugins[dependencyPluginId];
                }
            }                
            var pluginIdToName= function pluginIdToName(pluginId) {
                return dependancyPluginNames[pluginId];
            };

            problems.push( 'Following Selenium IDE plugin(s) are missing their dependancy plugin(s). Please, install (or enable) any missing dependancies. Please follow documentation of the plugin; if it is an SeLite add-on, see <a href="https://code.google.com/p/selite/wiki/AddOnsDependencies">https://code.google.com/p/selite/wiki/AddOnsDependencies</a>.' );
            problems.push( '' );
            problems.push( "Plugin(s) missing at least one direct dependency:" );
            for( var pluginId in sortedPlugins.missingDirectDependancies ) {
                problems.push( addonsById[pluginId].name+ ' depends on missing plugin(s): ' +
                    sortedPlugins.missingDirectDependancies[pluginId].map(pluginIdToName).join(', ')+ '.' );
                if( pluginId in sortedPlugins.missingIndirectDependancies ) {
                    problems.push( 'It also indirectly depends on other missing dependancies through other plugin(s): ' +
                        sortedPlugins.missingIndirectDependancies[pluginId].map(pluginIdToName).join(', ')+ '.' );
                }
            }
            if( Object.keys(sortedPlugins.missingIndirectDependancies).length ) {
                problems.push( '' );
                problems.push( "\nPlugin(s) missing indirect dependencies only:" );
                for( var pluginId in sortedPlugins.missingIndirectDependancies ) {
                    problems.push( addonsById[pluginId].name+ ' indirectly depends on missing plugin(s): ' +
                        sortedPlugins.missingIndirectDependancies[pluginId].map(pluginIdToName).join(', ') );
                }
            }
        }
        if( problems.length>0 ) {
            SeLiteExtensionSequencer.popup( window, "Problem(s) with add-on(s) for Firefox and Selenium IDE", problems.join('\n<br/>\n') );
        }
        
        // The actual registration is in the following function, because I need ability to call it in two ways (see below).
        var registerAddOns= function registerAddOns() {
            var failed= {}; // Object { string failed pluginId => exception }
            for( var i=0; i<sortedPlugins.sortedPluginIds.length; i++ ) {
                var pluginId= sortedPlugins.sortedPluginIds[i];
                var plugin= SeLiteExtensionSequencer.plugins[pluginId];
                var ide_api = new API();
                try {
                    // I register the plugin even if it has no core/ide extension url. That way it
                    // will be listed in Selenium IDE > Options > Options > Plugins.
                    console.log( 'SeLiteExtensionSequencer is adding plugin with ID ' +pluginId+ '. Its core extension files are ' +plugin.coreUrl+ '. Its IDE extension files are ' +plugin.ideUrl+ '.' );
                    ide_api.addPlugin(pluginId);
                    for( var j=0; j<plugin.ideUrl.length; j++ ) {
                        ide_api.addPluginProvidedIdeExtension( plugin.ideUrl[j] );
                    }
                    for( var j=0; j<plugin.coreUrl.length; j++ ) {
                        if( j<plugin.xmlUrl.length ) {
                            ide_api.addPluginProvidedUserExtension( plugin.coreUrl[j], plugin.xmlUrl[j] );
                        }
                        else {
                            ide_api.addPluginProvidedUserExtension( plugin.coreUrl[j] );
                        }
                    }
                    if( plugin.preActivate ) {
                        plugin.preActivate.call( null, ide_api );
                    }
                }
                catch(e) {
                    failed[pluginId]= e;
                }
            }
            problems= [];
            if( Object.keys(failed).length ) {
                for( var pluginId in failed ) {
                    var e= failed[pluginId];
                    if( problems.length ) {
                        problems.push( '' );
                    }
                    problems.push( 'Failure when initialising Selenium IDE plugin ' +pluginId+ ': ' +e+ '\n' +e.stack );
                    var isSeLiteAddon= addon.id.indexOf('selite.googlecode.com');
                    problems.push( 'Please get its newest version (if available)' +(
                            isSeLiteAddon
                                ? ' from <a href="https://code.google.com/p/selite/wiki/AddOns">https://code.google.com/p/selite/wiki/AddOns</a>'
                                : ' from its website'
                        )
                        + ', check its documentation' +(
                            isSeLiteAddon
                                ? ' at <a href="https://code.google.com/p/selite/wiki/ProjectHome">https://code.google.com/p/selite/wiki/ProjectHome</a>'
                                : '' )
                        + " and if that doesn't help, report the issue" +(
                            isSeLiteAddon
                                ? ' at <a href="https://code.google.com/p/selite/wiki/ReportingIssues">https://code.google.com/p/selite/wiki/ReportingIssues</a>.'
                                : ' to its author.'
                        )
                    );
                }
            }
            if( problems.length>0 ) {
                SeLiteExtensionSequencer.popup( window, "Problem(s) with add-on(s) for Firefox and Selenium IDE", problems.join('\n<br/>\n') );
            }
        };
        // Almost ready to register the addons. However, if there are any non-sequenced dependancies that were not registered with Selenium API yet, then tail-override API.prototype.addXXX() and make it invoke registerAddOns() only once all non-sequenced dependancies are loaded. If that doesn't happen within a short time limit, that may mean that non-sequenced dependancy didn't register itself with Selenium IDE API, or its initialisation failed; then show a warning message.
        var expectedNonSequencedDependencies= []; // This will be an array of pluginIds of non-sequenced dependencies that were not loaded yet
        if( sortedPlugins.nonSequencedDependencies.length ) {
            // See Selenium IDE's chrome/content/api.js > function API(), which sets: this.preferences = SeleniumIDE.Preferences; See also API.prototype._save()
            var plugins= JSON.parse(SeleniumIDE.Preferences.getString('pluginsData', '[]')); // An array of objects { id: pluginId, ... code:{ideExtensions: array, userExtensions:array, formatters:array} ... }
            for( var i=0; i<plugins.length; i++ ) {
                var index= expectedNonSequencedDependencies.indexOf( plugins[i].id );
                if( index>=0 ) {
                    expectedNonSequencedDependencies.splice( index, 1 );
                }
            }
        }
        if( expectedNonSequencedDependencies.length ) {
            // Tail-override of API.prototype._save(), which is called by addXXX()
            var oldSave= API.prototype._save;
            API.prototype._save= function _save() {
                oldSave.call( this );
                var pluginIndex= expectedNonSequencedDependencies.indexOf(this.id);
                if( pluginIndex>=0 ) {
                    expectedNonSequencedDependencies.splice( pluginIndex, 1 );
                }
                if( !expectedNonSequencedDependencies.length ) {
                    SeLiteExtensionSequencer.nonSequencedDependenciesLoaded= true;
                    registerAddOns();
                }
            };
            window.setTimeout( function() {
                    if( !SeLiteExtensionSequencer.nonSequencedDependenciesLoaded ) {
                        SeLiteExtensionSequencer.popup( window, "Add-on(s) for Firefox and Selenium IDE expected the following non-sequenced dependencies, which are present, but not registered with Selenium IDE: " +expectedNonSequencedDependencies.join(', ') );
                    }
                }, 3000 );
        }
        else {
            registerAddOns();
        }
    });
    SeLiteExtensionSequencer.processedAlready= true;
}