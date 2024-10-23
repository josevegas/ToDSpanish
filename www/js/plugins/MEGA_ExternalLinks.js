//=============================================================================
/*:
* @plugindesc Add link to menu
*
* @param URL
* @default https://www.google.com/
*
* @param Text
* @default link
*/
//=============================================================================
var Imported = Imported || {};
Imported.MEGA_ExternalLinks = true;

var megaEL = megaEL || {};
megaEL.Parameters = PluginManager.parameters('MEGA_ExternalLinks');

megaEL.url = String(megaEL.Parameters['URL']);
megaEL.text = String(megaEL.Parameters['Text']);

megaEL.default_makeCommandList = Window_TitleCommand.prototype.makeCommandList;
Window_TitleCommand.prototype.makeCommandList = function () {
	megaEL.default_makeCommandList.call(this);
	this.goToLink();
}

Window_TitleCommand.prototype.goToLink = function () {
	if (megaEL.url.length <= 0) return;
	this.addCommand(megaEL.text, 'goToLink');
}

megaEL.default_createCommandWindow = Scene_Title.prototype.createCommandWindow;
Scene_Title.prototype.createCommandWindow = function () {
	megaEL.default_createCommandWindow.call(this);
	this._commandWindow.setHandler('goToLink', this.commandHomePage.bind(this));
}

Scene_Title.prototype.commandHomePage = function () {
	require('nw.gui').Shell.openExternal(megaEL.url);
	TouchInput.clear();
	Input.clear();
	this._commandWindow.activate();
}

/*
  if (Utils.isNwjs() && Utils.isOptionValid('test')) {
    var _debugWindow = require('nw.gui').Window.get().showDevTools();
    //_debugWindow.moveTo(0, 0);
    window.focus();
  }
*/