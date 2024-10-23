
let alias_sp_TitleCommand_makeCommandList = Window_TitleCommand.prototype.makeCommandList
Window_TitleCommand.prototype.makeCommandList = function(){
    alias_sp_TitleCommand_makeCommandList.call(this)
    this.clearCommandList();
    this.addCommand(TextManager.newGame,   'newGame');
    this.addCommand(TextManager.continue_, 'continue', this.isContinueEnabled());
    this.addCommand(Yanfly.Param.HomePageText, 'homePage');
}