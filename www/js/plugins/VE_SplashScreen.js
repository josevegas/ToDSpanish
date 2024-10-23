//=============================================================================
//                      VE_SplashScreen.js - 0.90
//=============================================================================

/*:
 * @plugindesc VE_SplashScreen
 * @author Ventiqu - 2016.
 *	
 * @param SplashPicturee
 * @desc Picture, which will display as splash. 
 * @default Splash
 * @help Picture's location is at img/system.
 */

 (function() {

 	var parametri = PluginManager.parameters('VE_SplashScreen');
 	var splash_picturee = String(parametri['SplashPicturee'] || "String");

	function Scene_SplashScreen() {
	    this.initialize.apply(this, arguments);
	};

	Scene_Boot.prototype.start = function() {
	    Scene_Base.prototype.start.call(this);
	    SoundManager.preloadImportantSounds();
	    if (DataManager.isBattleTest()) {
	        DataManager.setupBattleTest();
	        SceneManager.goto(Scene_Battle);
	    } else if (DataManager.isEventTest()) {
	        DataManager.setupEventTest();
	        SceneManager.goto(Scene_Map);
	    } else {
	        this.checkPlayerLocation();
	        DataManager.setupNewGame();
	        SceneManager.goto(Scene_SplashScreen);
	        Window_TitleCommand.initCommandPosition();
	    }
	    this.updateDocumentTitle();
	};

	Scene_SplashScreen.prototype = Object.create(Scene_Base.prototype);
	Scene_SplashScreen.prototype.constructor = Scene_SplashScreen;

	Scene_SplashScreen.prototype.initialize = function() {
		Scene_Base.prototype.initialize.call(this);
	};

	Scene_SplashScreen.prototype.create = function() {
		Scene_Base.prototype.create.call(this);
		this.splashAudio();
		this.makeSplashScreen();
	};

	Scene_SplashScreen.prototype.splashAudio = function() {
		AudioManager.stopBgm();
		AudioManager.stopBgs();
		AudioManager.stopMe();
	};

	Scene_SplashScreen.prototype.makeSplashScreen = function() {
		this.splashKuva = new Sprite();
		this.splashKuva.bitmap = ImageManager.loadSystem(splash_picturee);
		this.addChild(this.splashKuva);
	};

	Scene_SplashScreen.prototype.start = function() {
		Scene_Base.prototype.start.call(this);
	    this.startFadeIn(this.slowFadeSpeed(), false);
	};

	Scene_SplashScreen.prototype.update = function() {
		Scene_Base.prototype.update.call(this);
		if (this.isActive() && !this.isBusy() && this.isTriggered()) {
        	SceneManager.goto(Scene_Title);
    	}
	};

	Scene_SplashScreen.prototype.isTriggered = function() {
	 return Input.isTriggered('ok') || TouchInput.isTriggered();
	};

	Scene_SplashScreen.prototype.stop = function() {
		Scene_Base.prototype.stop.call(this);
		this.fadeOutAll();
		AudioManager.stopAll();
	};

	Scene_SplashScreen.prototype.terminate = function() {
		Scene_Base.prototype.terminate.call(this);
	};

})();