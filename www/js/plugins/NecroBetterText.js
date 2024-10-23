var Imported = Imported || {};
var NecroTheif = NecroTheif || {};
NecroTheif.BetterText = {};

/*:
 * @plugindesc Adds more text features! <pluginID Necro Better Text>
 * @author NecroTheif
 *
 * @param Wrap On
 * @desc If the word wrap is by default on or not
 * @default false
 * 
 * @param Alignment
 * @desc The default alignment for all text messages (left, right, or center)
 * @default left
 * 
 * @help 
 * ==============================================================================
 *    Support
 * ==============================================================================
 *
 * Issues? Best way is to comment on my topic on RMW fourms that relates or you can
 * try and PM and if non of that works you can try email.
 *
 * email: Alwaygetgo at gmail.com
 *
 * ==============================================================================
 *    Help
 * ==============================================================================
 *
 * This plugin adds the follow text codes to all messages!
 * 
 * \space[x]                              
 *     Force number of spaces (i.e. when whitespace is ignored for word wrap)
 *                                    
 * \wrap                              
 *     Make the current text use word wrap (or not use, opposite of your default
 *     setting) (Only put once in message and applies for whole message)
 *                                    
 * \br                                
 *     Force a newline (i.e. when newlines are ignored for word wrap)
 *     
 * \center
 *     Centers all new text including current line
 *     
 * \left
 *     Left aligns all new text including current line
 *     
 * \right
 *     Right aligns all new text including current line
 *                                    
 * \pic[image][width][height][hue][smooth]
 *     Display an image in the message with the given size (i.e. 
 *     \pic[img/enemies/][Actor1_3][125][125] would display the image of 
 *     img/enemies/Actor1_3.png at a size of 125 by 125) (Hue and smooth 
 *     are optional parameters)
 *                                    
 * \face[x][width][height]
 *     Display the face of the actor of the given index with the given size. (i.e. 
 *     \face[2][100][100] would draw the 2nd actor's face at a size of 100 by 100)
 *     
 * * Note, for anytime you need both a height and width (i.e. \pic) you can give just a
 * 	 width and it will set the height to that as well aka make it a square (i.e.
 *   \face[1][75] would draw the 1st actor's face at a size of 75 by 75)
 * 
 */

//-----------------------------------------------------------------------------
// MVCommons
//
// Add this to the MVC

(function(){
  if(Imported["MVCommons"]) {
    var author = [{
      email: "Alwaygetgo@gmail.com",
      name: "NecroTheif",
      website: "http://http://necro-theif.appspot.com"
    }];
    PluginManager.register("Necro Better Text", "1.0.0", PluginManager.getBasicPlugin("Necro Better Text").description, author, "2016-27-04");
  }
})();


//-----------------------------------------------------------------------------
// Global values
//
// Add all the properties to this plugin for easy access

(function($){
	
	$.parameters = $plugins.filter(function(plugin) { return plugin.description.contains('<pluginID Necro Better Text>'); });
	if($.parameters.length === 0)
		console.warn("Couldn't find parameters for Necro Better Text. Defaults will be used.");
	else
		$.parameters = $.parameters[0].parameters;
	
})(NecroTheif.BetterText);


//-----------------------------------------------------------------------------
// Window_Base
//
// Add text codes to all windows

(function($){	
	
	var wrap = eval(NecroTheif.BetterText.parameters['Wrap On']),
		defaultAlign = NecroTheif.BetterText.parameters['Alignment'];
	
	var oldCreateContents = $.prototype.createContents;
	$.prototype.createContents = function() {
	    oldCreateContents.call(this);
	    this.contents.alignment = defaultAlign;
	};
	
	var oldOpen = $.prototype.open;
	$.prototype.open = function() {
		oldOpen.call(this);
	    this.contents.alignment = defaultAlign;
	};

	var oldConvertEscapeCharacters = $.prototype.convertEscapeCharacters;
	$.prototype.convertEscapeCharacters = function(text, measure) {
	    text = oldConvertEscapeCharacters.call(this, text);

	    if(!measure && ((wrap && !text.match(/\x1bwrap/gi)) || !wrap))
	    	text = this.wrapText(0, text);
	    text = text.replace(/\x1bwrap/gi, '');

	    return text;
	};
	
	var oldProcessNewLine =  $.prototype.processNewLine;
	$.prototype.processNewLine = function(textState) {
		var added = false;
		if (textState.text[textState.index] === '\n') {
	        textState.index++;
	        added = true;
	    }
		
		oldProcessNewLine.call(this, textState);
		
		if(added)
			textState.index--;
		
		this.updateAlignment(textState);
	};
	
	$.prototype.wrapText = function(startX, text){
		
		if(!text)
			return '';
		
		// Remove whitespace
        while(text.indexOf('  ')!=-1)
        	text = text.replace(/  /g, ' ');
        text = text.replace(/\n/g, '');
	    
	    // Add forced whitespace
    	while(text.match(/\x1bspace\[(\d+)\]/i)){
        	var space = '';
        	for(var numSpaces = Number(text.match(/\x1bspace\[(\d+)\]/i)[1]); numSpaces > 0; numSpaces--)
        		space += ' ';
        	text = text.replace(/\x1bspace\[(\d+)\]/i, space);
        }
    	text = text.replace(/\x1bbr/gi, '\n');
    	
    	// Get the lines
    	var lines = [];
    	var textLength = text.length;
    	for(var next = text.indexOf('\n'); next != -1; next = text.indexOf('\n')){
    		lines.push(text.substr(0, text.indexOf('\n')));
    		text = text.substr(next+'\n'.length, textLength);
    	}
    	lines.push(text);

    	// Word wrap the text
    	text = '';
    	var textWidth = this.width-this.textPadding()*2-(this.newLineX ? this.newLineX() : 0);
    	for(var i=0, leftOvers = ''; i<lines.length || leftOvers != ''; text+='\n'){
    		var curText = leftOvers == '' ? lines[i++].trim() : leftOvers;
    		leftOvers = '';
    		while(this.textWidthEx(curText)>textWidth){
    			if(curText.lastIndexOf(' ')==-1)
    				break;
    			leftOvers = curText.substr(curText.lastIndexOf(' ')) + leftOvers;
    			curText = curText.substr(0, curText.lastIndexOf(' '));
    		}
    		curText = curText.trim();
    		text += curText;
    	}
		
    	// Return the new word wrapped text
    	return text;
    	
	};

	var oldDrawTextEx = $.prototype.drawTextEx;
	$.prototype.drawTextEx = function(text, x, y) {
		
	    var currentline = text.split('\n')[0];
		if(currentline.match(/\x1bleft/gi))
			this.contents.alignment = 'left';
		if(currentline.match(/\x1bright/gi))
			this.contents.alignment = 'right';
		if(currentline.match(/\x1bcenter/gi))
			this.contents.alignment = 'center';

    	var textWidth = this.width-(this.newLineX ? this.newLineX() : 0);
		if(this.contents.alignment === 'right')
			x = textWidth-this.textWidthEx(currentline);
		else if(this.contents.alignment === 'center')
			x = (textWidth-this.textWidthEx(currentline))/2 + (this.newLineX ? this.newLineX() : 0);
		
		oldDrawTextEx.call(this, text, x, y);
		
	};
	
	$.prototype.updateAlignment = function(textState){
		
		// Get if the current line has an alignment change
		var currentline = textState.text.slice(textState.index).split('\n')[0];
		if(currentline.match(/\x1bleft/gi))
			this.contents.alignment = 'left';
		if(currentline.match(/\x1bright/gi))
			this.contents.alignment = 'right';
		if(currentline.match(/\x1bcenter/gi))
			this.contents.alignment = 'center';
		currentline = currentline.replace(/\x1bleft/gi,'').replace(/\x1bright/gi, '').replace(/\x1bcenter/gi, '');
		
    	var textWidth = this.width-(this.newLineX ? this.newLineX() : 0);
		if(this.contents.alignment === 'right')
			textState.x = textWidth-this.textWidthEx(currentline);
		else if(this.contents.alignment === 'center')
			textState.x = (textWidth-this.textWidthEx(currentline))/2 + (this.newLineX ? this.newLineX() : 0);
	}
	
	$.prototype.textWidthEx = function(text) {
		
	    var textWidth = this.textWidth(text);
	    
	    var regExp = /\x1bpic\[.+?\]\[(\d+)\]/gi;
        var array = regExp.exec(text);
        while(array){
            textWidth += Number(array[1]) - this.textWidth(array[0]) + this.textPadding()*2 + 8;
            array = regExp.exec(text);
        }
        
        regExp = /\x1bface\[\d+\]\[(\d+)\]/gi;
        array = regExp.exec(text);
        while(array){
            textWidth += Number(array[1]) - this.textWidth(array[0]) + this.textPadding()*2 + 8;
            array = regExp.exec(text);
        }
        
        return textWidth + this.textPadding()*4;
	};
	
	var oldProcessEscapeCharacter = $.prototype.processEscapeCharacter;
	$.prototype.processEscapeCharacter = function(code, textState) {
		
		switch (code) {
		case 'PIC':
			this.processDrawImage(textState, this.obtainEscapeParams(textState, 5));
			break;
		case 'FACE':
			this.processDrawFace(textState, this.obtainEscapeParams(textState, 3));
			break;
	    default:
	    	oldProcessEscapeCharacter.call(this, code, textState);
	    }
		
	};
	
	$.prototype.processDrawImage = function(textState, params) {
		
		var folder,
		    image = params[0],
			width = Number(params[1]),
		    height = Number(params[2]) || width,
		    hue = Number(params[3]),
		    smooth = params[4]==="true";
		
		if(params.length<2 || !width || !height)
			return;
		
		if(image.indexOf("/")==-1)
			folder = '';
		else{
			folder = image.substr(0, image.lastIndexOf("/")+1);
			image = image.substr(image.lastIndexOf("/")+1);
		}
		
		this.drawImage(folder, image, textState.x, textState.y, width, height, hue, smooth);
		textState.x += width;
	}
	
	$.prototype.processDrawFace = function(textState, params) {
		
		var actor = Number(params[0]),
			width = Number(params[1]),
		    height = Number(params[2]) || width;

		if(params.length<2 || !actor)
			return;
		
		this.drawFaceScaled($gameActors.actor(actor).faceName(), $gameActors.actor(actor).faceIndex(), textState.x, textState.y, width, height);
		textState.x += width;
	}
	
	$.prototype.obtainEscapeParams = function(textState, num) {
		
		var params = [];
		
		for(var i=0;i<num;i++){
			var arr = /^\[(.*?)\]/.exec(textState.text.slice(textState.index));
		    if (arr) {
		        textState.index += arr[0].length;
		        params.push(arr[1]);
		    }
		}
	    
	    return params;
		
	};
	
	$.prototype.calcTextHeight = function(textState, all) {
		var lastFontSize = this.contents.fontSize;
	    var textHeight = 0;
	    var lines = textState.text.slice(textState.index).split('\n');
	    var maxLines = all ? lines.length : 1;
	    
        for (var i = 0; i < maxLines; i++) {
	        var maxLineSize = this.contents.fontSize;
	        var regExp = /\x1b[\{\}]/g;
	        var array = regExp.exec(lines[i]);
	        while(array){
                if (array[0] === '\x1b{') {
                    this.makeFontBigger();
                }
                if (array[0] === '\x1b}') {
                    this.makeFontSmaller();
                }
                if (maxLineSize < this.contents.fontSize) {
                	maxLineSize = this.contents.fontSize;
                }
	            array = regExp.exec(lines[i]);
	        }
	        
	        regExp = /\x1bpic\[.+?\]\[(\d+)\](?:\[(\d+)\])?/gi;
	        array = regExp.exec(lines[i]);
	        while(array){
	        	var match = array[2] ? Number(array[2]) : Number(array[1]);
                if(maxLineSize < match)
                	maxLineSize = match;
	            array = regExp.exec(lines[i]);
	        }
	        
	        regExp = /\x1bface\[\d+\]\[(\d+)\](?:\[(\d+)\])?/gi;
	        array = regExp.exec(lines[i]);
	        while(array){
	        	var match = array[2] ? Number(array[2]) : Number(array[1]);
                if(maxLineSize < match)
                	maxLineSize = match;
	            array = regExp.exec(lines[i]);
	        }
	        textHeight += maxLineSize + 8;
        }

	    this.contents.fontSize = lastFontSize;
	    return textHeight;
	    
	};
	
	$.prototype.drawImage = function(imageFolder, imageFile, x, y, width, height, hue, smooth) {
	    var bitmap = ImageManager.loadBitmap(imageFolder, imageFile, hue, smooth);
	    var window = this;
	    bitmap.addLoadListener(function(){
	    	window.contents.blt(bitmap, 0, 0, bitmap.width, bitmap.height, x, y, width, height);
	    });
	};
	
	$.prototype.drawFaceScaled = function(faceName, faceIndex, x, y, width, height) {
	    var bitmap = ImageManager.loadFace(faceName);
	    var sx = faceIndex % 4 * $._faceWidth;
	    var sy = Math.floor(faceIndex / 4) * $._faceHeight;
	    var window = this;
	    if(bitmap.isReady())
	    	window.contents.blt(bitmap, sx, sy, $._faceWidth, $._faceHeight, x, y, width, height);
	    else
	    	bitmap.addLoadListener(function(){
	    		window.contents.blt(bitmap, sx, sy, $._faceWidth, $._faceHeight, x, y, width, height);
	    	});
	};
	
})(Window_Base);



(function($){
	
	var oldNewPage = $.prototype.newPage;
	$.prototype.newPage = function(textState) {
		oldNewPage.call(this, textState);
		this.updateAlignment(textState);
	};
	
})(Window_Message);