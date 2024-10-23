//=============================================================================
// Filter.js
//=============================================================================

/*:
 * @plugindesc Scene_Map and Scene_Battle screen-space Filters.
 * @author Felix "Xilefian" Jones
 * 
 * @param Menu Filter
 * @desc The filter to be applied to the menu background.
 * @default blur { "blur" : 0 } { "blur" : 5 } { "blur" : 0 }
 * 
 * @param Menu Speed
 * @desc The transition speed in frames for the menu filter.
 * @default 10
 * 
 * @param Options Enabled
 * @desc Toggles the filter section of the options menu (false disables).
 * @default true
 * 
 * @param Options JSON
 * @desc Space-separated JSON entries in format; {"name":"","filter":"","prepare":{}}. "null" name is reserved.
 * @default {"name":"2x Pixelate","filter":"pixelate","prepare":{"size":{"x":2,"y":2 }}} {"name":"54 Colours","filter":"color_step","prepare":{"step":3.779}}
 * 
 * @param Options Default
 * @desc Name of the default filter from the Options JSON list. null == disabled.
 * @default null
 * 
 * @param Global Filter
 * @desc Default applied to the entire game screen. Format; filter {"setting":value}
 * @default null
 * 
 * @help
 * 
 * Version 1.24
 * Website http://www.hbgames.org
 * !!! Requires WebGL
 * 
 * "prepare" immediately overrides any instance with the same name.
 * "execute" immediately overrides the current execution.
 * "complete" waits until the current execution is finished and prevents further "execute" or "complete" commands.
 * 
 * Plugin Command:
 *   Filter prepare pixelate filter_a { "size":{ "x":4, "y":4 } }   # Prepare pixelate filter called "filter_a" with size 4, 4
 *   Filter execute filter_a                                        # Display "filter_a"
 *   Filter complete filter_a                                       # Remove "filter_a"
 *   
 *   Filter prepare pixelate filter_b { "size":{ "x":0, "y":0 } }   # Prepare pixelate filter called "filter_b" with size 0, 0
 *   Filter execute filter_b { "size":{ "x":4, "y":4 } } 120        # Transition size of "filter_b" to 4, 4 over 120 frames
 *   Filter execute filter_b { "size":{ "x":8, "y":8 } }            # Transition size of "filter_b" to 8, 8 instantly
 *   Filter complete filter_b { "size":{ "x":0, "y":0 } } 60        # Transition size of "filter_b" to 0, 0 over 60 frames, then remove
 * 
 * Scripting API:
 *   Filter.add( "custom_filter", CustomFilterClass ); // See PIXI.AbstractFilter for custom filter examples
 *   var instance = Filter.prepare( "custom_filter", { key : value } );
 *   instance.execute( { key : value }, 60 );
 *   instance.complete( { key : value }, 60 ); 
 *   instance.prepare( "custom_filter", { key : value } );
 * 
 * Inbuilt Filters:
 *   color_matrix   { "matrix":[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] }
 *   gray           { "gray":1 }
 *   pixelate       { "size":{ "x":10, "y":10 } }
 *   blur_x         { "blur":2 }
 *   blur_y         { "blur":2 }
 *   blur           { "blur":2, "blurX":2, "blurY":2 }
 *   invert         { "invert":1 }
 *   sepia          { "sepia":1 }
 *   twist          { "offset":{ "x":0.5, "y":0.5 }, "radius":0.5, "angle":5 }
 *   color_step     { "step":5 }
 *   dot_screen     { "scale":1, "angle":5 }
 *   cross_hatch    { "blur":2 }
 *   rgb_split      { "red":{ "x":20, "y":20 }, "green":{ "x":-20, "y":20 }, "blue":{ "x":20, "y":-20 } }
 * 
 * Known issues:
 *   Filters require WebGL. This cannot be avoided.
 * 
 * Change log:
 *   Version 1.24:
 *     Global filter (effects entire game) added as Plugin option.
 *   Version 1.23:
 *     Filter Option is now saved in configuration manager.
 *   Version 1.22:
 *     Rearranged source code.
 *     Added global Options filter (configurable in Plugin parameters).
 *   Version 1.21:
 *     Added uTime shader uniform for tracking filter life time.
 *     Added support for additional uniform types.
 *     Fixed Menu background bitmaps reverting/changing to black in some scenes.
 *     Fixed actors not appearing with side-view battle system.
 *     Battle animations are now affected by Filters.
 *   Version 1.2:
 *     Added menu filter (configurable in Plugin parameters).
 *     Added additional scripting APIs for filters via JS.
 *     JS filters are not stored with the save game.
 *     Refactored the save system.
 *     Renamed internal object to hide Filter JS APIs.
 *   Version 1.11:
 *     Filters in battles now only apply to backgrounds, actors and enemies.
 *     Fixed skipping variables in execute breaking transition for complete.
 *   Version 1.1:
 *     Fixed save/load only storing prepared variables.
 *   Version 1.0:
 *     Initial version.
 * 
 */

var Filter = {};

(function() {
    
/*
*  ====================
*  
*  Plugin params
*  
*  ====================
*/
    var parameters = PluginManager.parameters( 'Filter' );
    
    var menuParam = {
        filter  : String( parameters['Menu Filter'] || 'blur { "blur" : 0 } { "blur" : 5 } { "blur" : 0 }' ),
        speed   : Number( parameters['Menu Speed'] ) || 10
    };
    
    var optionsParam = {
        enabled : !( String( parameters['Options Enabled'] || 'false' ) == 'false' ),
        json    : String( parameters['Options JSON'] || '' ),
        default : String( parameters['Options Default'] || 'null' )
    };
    
    var globalParam = {
        filter : String( parameters['Global Filter'] || 'null' )
    };
    
/*
*  ====================
*  
*  FilterInstance JS class
*  
*  ====================
*/

    FilterInstance = function() {
        var d = new Date().getTime();
        
        this._uid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = (d + Math.random()*16)%16 | 0;
            d = Math.floor(d/16);
            return (c=='x' ? r : (r&0x3|0x8)).toString(16);
        });
    };

    FilterInstance.prototype.constructor = FilterInstance;
    
    FilterInstance.prototype.prepare = function( filterName, filterData ) {
        if ( filterData === undefined ) {
            filterData = null;
        }
        if ( filterName in XI_Filter._filters ) {
            XI_Filter.prepare( XI_Filter._filters[filterName], this._uid, filterData );
        }
        
        if ( this._uid in XI_Filter._instances ) {
            XI_Filter._instances[this._uid].noSave = true;
        }
    };

    FilterInstance.prototype.execute = function( filterData, frames ) {
        if ( filterData === undefined ) {
            filterData = null;
        }
        if ( frames === undefined ) {
            y = 0;
        } 
        XI_Filter.execute( this._uid, filterData, frames );
    };

    FilterInstance.prototype.complete = function( filterData, frames ) {
        if ( filterData === undefined ) {
            filterData = null;
        } 
        if ( frames === undefined ) {
            y = 0;
        } 
        XI_Filter.complete( this._uid, filterData, frames );
    };

/*
*  ====================
*  
*  Filter JS API namespace
*  
*  ====================
*/

    Filter.prepare = function( filterName, filterData ) {
        if ( filterName in XI_Filter._filters ) {
            var filterInstance = new FilterInstance();
            // register filterInstance
            filterInstance.prepare( filterName, filterData );
            return filterInstance;
        }
        return null;        
    };

    Filter.add = function( key, filter ) {
        if ( filter && filter.prototype ) {
            XI_Filter._filters[key] = filter;
        }
    };
    
/*
*  ====================
*  
*  XI_Filter namespace
*  
*  ====================
*/

    var XI_Filter = {
        _filters        : {},
        _instances      : {},
        _active         : [],
        _animating      : [],
        _isDirty        : true,
        _background     : null,
        _menuFilter     : null,
        _globalFilter   : null
    };
        
    XI_Filter.instanceType = function( instance ) {
        for ( var key in XI_Filter._filters ) {
            if ( XI_Filter._filters[key] === instance.filter.constructor ) {
                return key;
            }
        }
        return null;
    };
    
    XI_Filter.saveContents = function() {
        var contents = {};
        
        contents.instances = [];
        contents.active = [];
        for ( var filterName in XI_Filter._instances ) {
            var instance = { name : filterName };
            instance.type = XI_Filter.instanceType( XI_Filter._instances[filterName] );
            if ( !instance.type || XI_Filter._instances[filterName].noSave ) {
                // Skip nosaves
                continue;
            }
                        
            instance.uniform = {};
            for ( var ii = 0, length = XI_Filter._instances[filterName].keys.length; ii < length; ii++ ) {
                var key = XI_Filter._instances[filterName].keys[ii];
                instance.uniform[key] = XI_Filter._instances[filterName].filter[key];
            }
                        
            if ( XI_Filter._active.contains( XI_Filter._instances[filterName].filter ) ) {
                contents.active.push( filterName );
            }
            
            contents.instances.push( instance );
        }
        
        return contents;
    };
    
    XI_Filter.loadContents = function( contents ) {
        for ( var ii = 0, length = contents.instances.length; ii < length; ii++ ) {
            var filterType = XI_Filter._filters[contents.instances[ii].type];
            XI_Filter.prepare( filterType, contents.instances[ii].name, contents.instances[ii].uniform )
        }
        for ( var ii = 0, length = contents.active.length; ii < length; ii++ ) {
            XI_Filter.addInstance( XI_Filter._instances[contents.active[ii]] );
        }
    };
    
    XI_Filter.prepare = function( FilterType, filterName, filterData ) {
        XI_Filter.removeInstance( XI_Filter._instances[filterName] );
        
        if ( FilterType ) {
            var instance =  { 
                filter : new FilterType(), 
                keys : [], 
                startData : {}, 
                endData : {}, 
                completeData : {},
                frames : null,
                completeFrames : null,
                time : null,
                noSave : false,
                isPaused : false,
                animate : 0
            };
            
            if ( "uTime" in instance.filter ) {
                instance.filter.uTime = 0;
                XI_Filter._animating.push( instance );
            }
            
            for ( var key in filterData ) {
                if ( key in instance.filter ) {
                    instance.keys.push( key );
                    instance.filter[key] = filterData[key];
                }
            }
            
            XI_Filter._instances[filterName] = instance;
        }
    };
    
    XI_Filter.execute = function( filterName, filterData, filterFrames ) {
        var instance = XI_Filter._instances[filterName];
        if ( instance ) {
            if ( instance.completeFrames !== null ) {
                return;
            } else if ( instance.frames === null ) {
                XI_Filter.addInstance( instance );
            }
            
            instance.endData = {};
                    
            for ( var key in filterData ) {
                if ( key in instance.filter ) {
                    if ( !instance.keys.contains( key ) ) {
                        instance.keys.push( key );
                    }
                    
                    switch ( typeof instance.filter[key] ) {
                    case 'object':
                        if ( instance.filter[key] === null ) {
                             instance.startData[key] = null;
                        } else {
                            instance.startData[key] = instance.filter[key].constructor();
                            for ( var property in instance.filter[key] ) {
                                instance.startData[key][property] = instance.filter[key][property];
                            }
                        }
                        break;
                    default:
                        instance.startData[key] = instance.filter[key];
                        break;
                    }
                    
                    instance.endData[key] = filterData[key];
                }
            }
            
            instance.frames = filterFrames;
            instance.time = 0;
        }
    };
    
    XI_Filter.complete = function( filterName, filterData, filterFrames ) {
        var instance = XI_Filter._instances[filterName];
        if ( instance ) {
            if ( instance.completeFrames !== null ) {
                return;
            }
            
            instance.noSave = true;
            
            if ( instance.frames === null ) {
                XI_Filter.execute( filterName, filterData, filterFrames );
                
                // We never executed, so dummy an execution so completion begins
                instance.completeData = instance.endData;
                instance.completeFrames = 0;
            } else {
                for ( var key in filterData ) {
                    if ( key in instance.filter ) {
                        instance.completeData[key] = filterData[key];
                    }
                }
                
                instance.completeFrames = filterFrames;
                if ( instance.time === null ) {
                    instance.startData = instance.endData;
                    instance.endData = instance.completeData;
                    instance.frames = instance.completeFrames;
                    instance.time = 0;
                    XI_Filter.checkInstanceStartEnd( instance );
                }
            }            
        }
    };
    
    XI_Filter.update = function() {
        for ( var ii = 0, length = XI_Filter._animating.length; ii < length; ii++  ){
            if ( XI_Filter._animating[ii].isPaused ) {
                continue;
            }            
            XI_Filter._animating[ii].filter.uTime = XI_Filter._animating[ii].animate++;
        }
        
        for ( var instanceKey in XI_Filter._instances ) {
            var instance = XI_Filter._instances[instanceKey];
            if ( instance.time === null || instance.isPaused ) {
                continue;
            }
            
            instance.time++;
            if ( instance.time < instance.frames ) {
                XI_Filter.blend( instance.startData, instance.endData, instance.filter, instance.time / instance.frames );
            } else {
                XI_Filter.blendFinal( instance.endData, instance.filter );
                if ( instance.endData === instance.completeData ) {
                    XI_Filter.removeInstance( instance );
                    delete XI_Filter._instances[instanceKey];
                    continue;
                } else if ( instance.completeFrames !== null ) {
                    instance.startData = instance.endData;
                    instance.endData = instance.completeData;
                    instance.frames = instance.completeFrames;
                    instance.time = 0;
                    XI_Filter.checkInstanceStartEnd( instance );
                } else {
                    instance.time = null;
                }
            }
        }
        
        if ( XI_Filter._isDirty ) {
            var activeFilters = ( XI_Filter._active.length ? XI_Filter._active : null );
            switch ( SceneManager._scene.constructor ) {
            case Scene_Map:
                SceneManager._scene._spriteset.filters = activeFilters;
                break;
            case Scene_Battle:
                SceneManager._scene._spriteset._back1Sprite.filters = activeFilters;
                SceneManager._scene._spriteset._back2Sprite.filters = activeFilters;
                for ( var ii = 0, length = SceneManager._scene._spriteset._enemySprites.length; ii < length; ii++  ){
                    SceneManager._scene._spriteset._enemySprites[ii].filters = activeFilters;
                }
                for ( var ii = 0, length = SceneManager._scene._spriteset._actorSprites.length; ii < length; ii++  ){
                    SceneManager._scene._spriteset._actorSprites[ii]._mainSprite.filters = activeFilters;
                    SceneManager._scene._spriteset._actorSprites[ii]._weaponSprite.filters = activeFilters;
                }
                break;
            }
            XI_Filter._isDirty = false;
        }
    };
    
    XI_Filter.checkInstanceStartEnd = function( instance ) {
        for ( var key in instance.endData ) {
            if ( !( key in instance.startData ) ) {
                switch ( typeof instance.filter[key] ) {
                case 'object':
                    instance.startData[key] = instance.filter[key].constructor();
                    for ( var property in instance.filter[key] ) {
                        instance.startData[key][property] = instance.filter[key][property];
                    }
                    break;
                default:
                    instance.startData[key] = instance.filter[key];
                    break;
                }
            }
        }
    };
    
    XI_Filter.blend = function( startData, endData, targetData, delta ) {
        for ( var key in endData ) {
            if ( targetData[key] === null ) {
                targetData[key] = ( delta < 0.5 ? startData[key] : endData[key] );                
            } else {
                switch ( typeof targetData[key] ) {
                case 'object':
                    for ( var comp in targetData[key] ) {
                        targetData[key][comp] = startData[key][comp] * ( 1.0 - delta ) + endData[key][comp] * delta;
                    }
                    break;
                case 'number':
                    targetData[key] = startData[key] * ( 1.0 - delta ) + endData[key] * delta;
                    break;
                default:
                    targetData[key] = ( delta < 0.5 ? startData[key] : endData[key] );
                    break;
                }
            }
        }
    }
    
    XI_Filter.blendFinal = function( endData, targetData ) {
        for ( var key in endData ) {
            if ( targetData[key] === null ) {
                targetData[key] = endData[key];       
            } else {
                switch ( typeof targetData[key] ) {
                case 'object':
                    for ( var comp in targetData[key] ) {
                        targetData[key][comp] = endData[key][comp];
                    }
                    break;
                default:
                    targetData[key] = endData[key];
                    break;
                }
            }
        }
    }
    
    XI_Filter.addInstance = function( instance ) {
        if ( !Graphics.hasWebGL() ) {
            console.error( 'Plugin Filters disabled : WebGL not supported.' );
        } else if ( !XI_Filter._active.contains( instance.filter ) ) {
            XI_Filter._active.push( instance.filter );
            XI_Filter._isDirty = true;
        }
    };
    
    XI_Filter.removeInstance = function( instance ) {
        if ( !instance ) {
            return;
        }
        XI_Filter._animating = XI_Filter._animating.filter( function ( item ) {
            return !( item === instance );
        } );
        XI_Filter._active = XI_Filter._active.filter( function ( item ) {
            if ( item === instance.filter ) {
                XI_Filter._isDirty = true;
                return false;
            }
            return true;
        } );
    };
    
    XI_Filter.parseArgs = function( inArgs ) {
        inArgs = inArgs.join( " " );
        for ( var args = [], argBuild = "", depth = 0, apo = 0, quot = 0, nonWhiteSpace = 0, ii = 0, argStrLen = inArgs.length; ii < argStrLen; ii++ ) {
            switch ( inArgs[ii] ) {
            case "'":
                depth && ( apo = 1 - apo );
                break;
            case '"':
                depth && ( quot = 1 - quot );
                break;
            case "{":
                nonWhiteSpace || quot + apo || depth++;
                break;
            case "}":
                0 < depth && !( quot + apo ) && depth--;
                break;
            default:
                if ( !depth && /\s/.test( inArgs[ii] ) ) {
                    args.push( argBuild );
                    argBuild = "";
                    nonWhiteSpace = 0;
                    continue;
                }
            }
            argBuild += inArgs[ii];
            depth || nonWhiteSpace++;
        }
        0 < argBuild.length && args.push( argBuild );
        return args;
    };
    
    XI_Filter.snap = function( stage ) {
        var tmpFilters = stage.filters;
        stage.filters = null;
        var bitmap = Bitmap.snap( stage );
        stage.filters = tmpFilters;
        return bitmap;
    };
    
/*
*  ====================
*  
*  Class prototype overrides
*  
*  ====================
*/

    var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function( command, inArgs ) {
        _Game_Interpreter_pluginCommand.call( this, command, inArgs );
        if ( command == "Filter" ) {
            var args = XI_Filter.parseArgs( inArgs );
            if ( args.length >= 2 ) {
                switch ( args[0] ) {
                case "prepare": // prepare type name !{data}
                    var prepType = XI_Filter._filters[args[1]];
                    var prepName = args[2];
                    var prepData = ( args[3] ? JSON.parse( args[3] ) : null );
                    XI_Filter.prepare( prepType, prepName, prepData );
                    break;
                case "execute": // execute name !{data} !frames:60
                    var execName = args[1];
                    var execData = ( args[2] && args[2][0] == '{' ? JSON.parse( args[2] ) : null );
                    var execFrames = parseInt( execData ? args[3] : args[2] );
                    XI_Filter.execute( execName, execData, ( execFrames ? execFrames : 0 ) );
                    break;
                case "complete": // complete name !{data} !frames
                    var compName = args[1];
                    var compData = ( args[2] && args[2][0] == '{' ? JSON.parse( args[2] ) : null );
                    var compFrames = parseInt( compData ? args[3] : args[2] );
                    XI_Filter.complete( compName, compData, ( compFrames ? compFrames : 0 ) );
                    break;
                }
            }
        }
    };
    
    var _Sprite_Animation_Setup = Sprite_Animation.prototype.setup;
    Sprite_Animation.prototype.setup = function( target, animation, mirror, delay ) {
        _Sprite_Animation_Setup.call( this, target, animation, mirror, delay );
        if ( SceneManager._scene.constructor == Scene_Battle ) {
            var animFilters = ( XI_Filter._active.length ? XI_Filter._active : null );
            if ( animFilters ) {
                for ( var ii = 0, length = this._cellSprites.length; ii < length; ii++ ) {
                    this._cellSprites[ii].filters = animFilters;
                }
            }
        }
    };
    
    var _Scene_Save_OnSavefileOk = Scene_Save.prototype.onSavefileOk;
    Scene_Save.prototype.onSavefileOk = function() {
        $gameSystem.xi_filter = XI_Filter.saveContents();
        _Scene_Save_OnSavefileOk.call( this );
    };
    
    var _Scene_Load_OnLoadSuccess = Scene_Load.prototype.onLoadSuccess;   
    Scene_Load.prototype.onLoadSuccess = function() {
        _Scene_Load_OnLoadSuccess.call( this );
        
        if ( $gameSystem.xi_filter ) {
            XI_Filter.loadContents( $gameSystem.xi_filter );
        } else {
            XI_Filter._active = [];
            XI_Filter._instances = {};
            XI_Filter._isDirty = true;
        }        
    };
    
    var _Scene_Title_Create = Scene_Title.prototype.create;
    Scene_Title.prototype.create = function() {
        _Scene_Title_Create.call( this );
        XI_Filter._active = [];
        XI_Filter._animating = [];
        XI_Filter._instances = {};
        XI_Filter._isDirty = true;
        
        delete XI_Filter._background;
        
        if ( !XI_Filter._menuFilter ) {
            var args = XI_Filter.parseArgs( [menuParam.filter] );
            var mfData = ( args[1] ? JSON.parse( args[1] ) : null );
            XI_Filter._menuFilter = Filter.prepare( args[0], mfData );
        }
        
        // TODO: Title screen Filters
    };
        
    var _Scene_MenuBase_CreateBackground = Scene_MenuBase.prototype.createBackground;
    Scene_MenuBase.prototype.createBackground = function() {
        for ( var key in XI_Filter._instances ) {
            XI_Filter._instances[key].isPaused = true;
        }
        
        _Scene_MenuBase_CreateBackground.call( this );
        
        var menuFilters = XI_Filter._active.clone();
        if ( XI_Filter._menuFilter && SceneManager.isPreviousScene( Scene_Map ) ) {
            var args = XI_Filter.parseArgs( [menuParam.filter] );
            var mfData = ( args[1] ? JSON.parse( args[1] ) : null );
            XI_Filter._menuFilter.prepare( args[0], mfData );
            menuFilters.push( XI_Filter._instances[XI_Filter._menuFilter._uid].filter );
        }
        
        if ( menuFilters.length > 0 ) {
            this._backgroundSprite.bitmap = XI_Filter._background;
            this._backgroundSprite.filters = menuFilters;
        }
    };
    
    var _Scene_Menu_Start = Scene_Menu.prototype.start;
    Scene_Menu.prototype.start = function() {
        if ( XI_Filter._menuFilter && SceneManager.isPreviousScene( Scene_Map ) ) {
            var args = XI_Filter.parseArgs( [menuParam.filter] );
            var mfData = ( args[2] ? JSON.parse( args[2] ) : null );
            XI_Filter._menuFilter.execute( mfData, menuParam.speed );
        }
        _Scene_Menu_Start.call( this );
    };
    
    var _Scene_Menu_Terminate = Scene_Menu.prototype.terminate;
    Scene_Menu.prototype.terminate = function() {
        _Scene_Menu_Terminate.call( this );
        if ( SceneManager.isNextScene( Scene_Map ) ) {
            if ( XI_Filter._menuFilter ) {
                var args = XI_Filter.parseArgs( [menuParam.filter] );
                var mfData = ( args[3] ? JSON.parse( args[3] ) : null );
                XI_Filter._menuFilter.complete( mfData, menuParam.speed / 2 );
            }
            
            for ( var key in XI_Filter._instances ) {
                XI_Filter._instances[key].isPaused = false;
            }
        }
    };
    
    var _Scene_Map_Terminate = Scene_Map.prototype.terminate;
    Scene_Map.prototype.terminate = function() {
        _Scene_Map_Terminate.call( this );
        
        if ( !SceneManager.isNextScene( Scene_Battle ) ) {
            SceneManager._scene._spriteset.filters = null;            
            XI_Filter._background = XI_Filter.snap( SceneManager._scene );
        }
    };
    
    var _Scene_Menu_Update = Scene_Menu.prototype.update;
    Scene_Menu.prototype.update = function() {
        // Update filters
        XI_Filter.update();
        _Scene_Menu_Update.call( this );
    };
    
    var _Scene_Battle_Update = Scene_Battle.prototype.update;
    Scene_Battle.prototype.update = function() {
        // Update filters
        XI_Filter.update();
        _Scene_Battle_Update.call( this );
    };
    
    var _Scene_Map_Update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        // Update filters
        XI_Filter.update();
        _Scene_Map_Update.call( this );
    };
    
    var _Scene_Map_CreateSpriteset = Scene_Map.prototype.createSpriteset;
    Scene_Map.prototype.createSpriteset = function() {
        _Scene_Map_CreateSpriteset.call( this );
        XI_Filter._isDirty = true;
        XI_Filter.update();
    };
    
    var _Scene_Battle_CreateSpriteset = Scene_Battle.prototype.createSpriteset;
    Scene_Battle.prototype.createSpriteset = function() {
        _Scene_Battle_CreateSpriteset.call( this );
        XI_Filter._isDirty = true;
        XI_Filter.update();
    };
    
/*
*  ====================
*  
*  Options menu
*  
*  ====================
*/
if ( optionsParam.enabled == true ) {
    
    var globalFilter = {
        name    : optionsParam.default,
        filters : {},
        names   : [],
        active  : null
    };

    var jsonStrings = XI_Filter.parseArgs( [optionsParam.json] );
    if ( jsonStrings.length > 0 ) {

        var _Scene_Boot_Start = Scene_Boot.prototype.start;
        Scene_Boot.prototype.start = function() {
            _Scene_Boot_Start.call( this );
            
            for ( var ii = 0, length = jsonStrings.length; ii < length; ii++ ) {
                var jsonData = JSON.parse( jsonStrings[ii] );
                globalFilter.names[ii] = jsonData.name;
                globalFilter.filters[jsonData.name] = {
                    filter : jsonData.filter,
                    prepare : jsonData.prepare
                };
            }
        };
        
        var applyGlobalFilter = function() {
            if ( globalFilter.active ) {
                if ( globalFilter.name == 'null' ) {
                    globalFilter.active.complete();
                    globalFilter.active = null;
                } else {
                    var globalData = globalFilter.filters[globalFilter.name];
                    globalFilter.active.complete();
                    globalFilter.active = Filter.prepare( globalData.filter, globalData.prepare );
                    globalFilter.active.execute();                    
                }
            } else if ( globalFilter.name != 'null' ) {
                var globalData = globalFilter.filters[globalFilter.name];
                globalFilter.active = Filter.prepare( globalData.filter, globalData.prepare );
                globalFilter.active.execute();                    
            }  
        };
        
        var _Filter_Scene_Map_CreateSpriteset = Scene_Map.prototype.createSpriteset;
        Scene_Map.prototype.createSpriteset = function() {
            applyGlobalFilter();
            _Filter_Scene_Map_CreateSpriteset.call( this );
        };
        
        var _Filter_Scene_Battle_CreateSpriteset = Scene_Battle.prototype.createSpriteset;
        Scene_Battle.prototype.createSpriteset = function() {
            applyGlobalFilter();
            _Filter_Scene_Battle_CreateSpriteset.call( this );
        };
        
        var _Window_Options_MakeCommandList = Window_Options.prototype.makeCommandList;
        Window_Options.prototype.makeCommandList = function() {
            _Window_Options_MakeCommandList.call( this );
            this.addCommand( 'Filter', 'filter' );
        };
        
        var _Window_Options_StatusText = Window_Options.prototype.statusText;
        Window_Options.prototype.statusText = function( index ) {
            var symbol = this.commandSymbol( index );
            if ( symbol == 'filter' ) {
                return ( globalFilter.name == 'null' ? 'Off' : globalFilter.name );
            }
            return _Window_Options_StatusText.call( this, index );
        };
        
        var _Window_Options_ProcessOk = Window_Options.prototype.processOk;
        Window_Options.prototype.processOk = function() {
            var index = this.index();
            var symbol = this.commandSymbol( index );
            if ( symbol == 'filter' ) {
                this.cursorRight( true );
            } else {
                _Window_Options_ProcessOk.call( this );
            }
        };
        
        var _Window_Options_CursorRight = Window_Options.prototype.cursorRight;
        Window_Options.prototype.cursorRight = function( wrap ) {
            var index = this.index();
            var symbol = this.commandSymbol( index );
            if ( symbol == 'filter' ) {
                var currentIndex = globalFilter.names.indexOf( globalFilter.name ) + 1;
                if ( currentIndex >= globalFilter.names.length ) {
                    if ( wrap ) {
                        this.changeValue( symbol, 'null' );
                    }
                } else {
                    this.changeValue( symbol, globalFilter.names[currentIndex] );
                }
            } else {
                _Window_Options_CursorRight.call( this );
            }
        };

        var _Window_Options_CursorLeft = Window_Options.prototype.cursorLeft;
        Window_Options.prototype.cursorLeft = function( wrap ) {
            var index = this.index();
            var symbol = this.commandSymbol( index );
            if ( symbol == 'filter' ) {
                var currentIndex = globalFilter.names.indexOf( globalFilter.name ) - 1;
                if ( currentIndex < -1 ) {
                    if ( wrap ) {
                        this.changeValue( symbol, globalFilter.names[globalFilter.names.length - 1] );
                    }
                } else if ( currentIndex < 0 ) {
                    this.changeValue( symbol, 'null' );
                } else {
                    this.changeValue( symbol, globalFilter.names[currentIndex] );
                }                
            } else {
                _Window_Options_CursorLeft.call( this );
            }
        };

        var _Window_Options_ChangeValue = Window_Options.prototype.changeValue;
        Window_Options.prototype.changeValue = function( symbol, value ) {
            if ( symbol == 'filter' ) {
                globalFilter.name = value;
                applyGlobalFilter();
            }
            _Window_Options_ChangeValue.call( this, symbol, value );
        };
        
        var _ConfigManager_MakeData = ConfigManager.makeData;
        ConfigManager.makeData = function() {
            var config = _ConfigManager_MakeData.call( this );
            config.filter = globalFilter.name;
            return config;
        };
        
        var _ConfigManager_ApplyData = ConfigManager.applyData;
        ConfigManager.applyData = function( config ) {
            _ConfigManager_ApplyData.call( this, config );
            
            globalFilter.name = config['filter'];
            if ( globalFilter.name === undefined ) {
                globalFilter.name = 'null';
            }
        };

    }
} // if ( optionsParam.enabled == true )

if ( !Graphics.hasWebGL() ) {
    console.error( 'Plugin Filters disabled : WebGL not supported.' );
} else {                    
    var gloFilStr = XI_Filter.parseArgs( [globalParam.filter] );
    if ( gloFilStr[0] != 'null' ) {
        var filterData = ( gloFilStr[1] ? JSON.parse( gloFilStr[1] ) : null );
        
        var _SceneManager_Goto = SceneManager.goto;
        SceneManager.goto = function( sceneClass ) {            
            if ( XI_Filter._globalFilter == null ) {                    
                var GlobalFilterType = XI_Filter._filters[gloFilStr[0]];        
                XI_Filter._globalFilter = new GlobalFilterType();            
                for ( var key in filterData ) {
                    if ( key in XI_Filter._globalFilter ) {
                        XI_Filter._globalFilter[key] = filterData[key];
                    }
                }                
            }
            
            _SceneManager_Goto.call( this, sceneClass );        
            
            this._nextScene.filters = [XI_Filter._globalFilter];
        };
        
    } else {
        XI_Filter._globalFilter = null;
    }
}    

/*
*  ====================
*  
*  Initialise default filters
*  
*  ====================
*/
    Filter.add( "color_matrix", PIXI.ColorMatrixFilter );
    Filter.add( "gray", PIXI.GrayFilter );
    Filter.add( "pixelate", PIXI.PixelateFilter );
    Filter.add( "blur_x", PIXI.BlurXFilter );
    Filter.add( "blur_y", PIXI.BlurYFilter );
    Filter.add( "blur", PIXI.BlurFilter );
    Filter.add( "invert", PIXI.InvertFilter );
    Filter.add( "sepia", PIXI.SepiaFilter );
    Filter.add( "twist", PIXI.TwistFilter );
    Filter.add( "color_step", PIXI.ColorStepFilter );
    Filter.add( "dot_screen", PIXI.DotScreenFilter );
    Filter.add( "cross_hatch", PIXI.CrossHatchFilter );
    Filter.add( "rgb_split", PIXI.RGBSplitFilter );
    
})();
