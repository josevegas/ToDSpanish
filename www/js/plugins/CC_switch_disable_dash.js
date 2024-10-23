/*:
@plugindesc Disable dashing from events using a switch
@author Coelocanth
@help
This plugin allows you to configure a switch that disables dashing.
Whenever that switch is ON, the player will be unable to dash,
in the same way as a map with the "disable dash" option set.

This plugin can be used for any purpose permitted by the RPGMaker MV.

@param switch
@desc Switch ID used to disable dash
@type number
@default 0
*/

(function() {
	var switch_id = Number(PluginManager.parameters('CC_switch_disable_dash')['switch']);
	
	var CC_switch_disable_dash_isDashDisabled = Game_Map.prototype.isDashDisabled;
	Game_Map.prototype.isDashDisabled = function() {
		if( $gameSwitches.value(switch_id) ) {
			return true;
		}
		return CC_switch_disable_dash_isDashDisabled.call(this);
	}
})();