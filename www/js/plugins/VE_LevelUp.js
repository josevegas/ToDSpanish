//=============================================================================
//                      VE_LevelUp.js - 1.00
//=============================================================================

/*:
 * @plugindesc VE_LevelUp
 * @author Ventiqu - 2016.

 * @param Enabled
 * @desc Set this to true, if you want to play levelup sound.
 * @default true
 *

 * @param levelUpSe
 * @desc Plays SE soundfile. Just change name to sound, which exists inside SE folder.
 * @default Saint5
 *
 * @param SE_Volume
 * @desc Change levelup sound volume.
 * @default 80
 *
 * @param SE_Pitch
 * @desc Change levelup sound pitch.
 * @default 100
 *
 * @help None.
 */

 (function() {
    var parametri = PluginManager.parameters('VE_LevelUp');

    var allowSound   =   String(parametri['Enabled']);
    var levelUp     =   String(parametri['levelUpSe']);
    var seVolume   =   Number(parametri['SE_Volume']);
    var sePitch   =   Number(parametri['SE_Pitch']);

    var audioLevelUp = {
        name: levelUp,
        volume: seVolume,
        pitch: sePitch,
        pan: 0
    }

    Game_Actor.prototype.displayLevelUp = function(newSkills) {
        if (allowSound == 'true') {
            var text = TextManager.levelUp.format(this._name, TextManager.level, this._level);
            $gameMessage.newPage();
            AudioManager.stopSe();
            AudioManager.playSe(audioLevelUp);
            $gameMessage.add(text);
            newSkills.forEach(function(skill) {
                $gameMessage.add(TextManager.obtainSkill.format(skill.name));
            });
        }
        else {
            var text = TextManager.levelUp.format(this._name, TextManager.level, this._level);
            $gameMessage.newPage();
            $gameMessage.add(text);
            newSkills.forEach(function(skill) {
                $gameMessage.add(TextManager.obtainSkill.format(skill.name));
            });
        }
};

Bitmap.prototype.blur = function() {
    for (var i = 0; i < 2; i++) {
        var w = this.width;
        var h = this.height;
        var canvas = this._canvas;
        var context = this._context;
        var tempCanvas = document.createElement('canvas');
        var tempContext = tempCanvas.getContext('2d');
        tempCanvas.width = w + 2;
        tempCanvas.height = h + 2;
        tempContext.drawImage(canvas, 0, 0, w, h, 1, 1, w, h);
        tempContext.drawImage(canvas, 0, 0, w, 1, 1, 0, w, 1);
        tempContext.drawImage(canvas, 0, 0, 1, h, 0, 1, 1, h);
        tempContext.drawImage(canvas, 0, h - 1, w, 1, 1, h + 1, w, 1);
        tempContext.drawImage(canvas, w - 1, 0, 1, h, w + 1, 1, 1, h);
        context.save();
        context.fillStyle = 'black';
        context.fillRect(0, 0, w, h);
        context.globalCompositeOperation = 'saturation';
        context.globalAlpha = 1 / 9;
        for (var y = 0; y < 3; y++) {
            for (var x = 0; x < 3; x++) {
                context.drawImage(tempCanvas, x, y, w, h, 0, 0, w, h);
            }
        }
        context.restore();
    }
    this._setDirty();
};

})();
