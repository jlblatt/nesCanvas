
var canvas;
var ctx;

var WIN_WIDTH = 800;  //Size of the canvas element (so we know our bounds)
var WIN_HEIGHT = 600;

var DRAW_SPEED = 30;  //Attempt to redraw after this many milliseconds
var NET_SPEED = 500;   //Attempt to update data after this many milliseconds
var INPUT_SPEED = 30; //Check update keys/mouse after this many milliseconds
var CLEANUP_SPEED = 30000;  //Call cleanup function after this many milliseconds
var DRAWING = false;

var SPRITES = new Array();  //Holds all active sprites on the screen

var KEYS = new Array();     //Holds the current status of the keyboard
var M_CLICK;                //Hold current status of mouse (click and position)
var M_X;
var M_Y;

var CHATTING = false;      //True if chat box has focus
var CHATS = new Array();   //CHATS array operates like a queue
function chat(s,o) {       //Create a simple chat object to hold a message, who said it, and timing info
    this.text = s;
    this.owner = o;
    this.time = (new Date()).getTime();
    this.lifespan = s.length * 50 + 5000;  //Chat bubbles show for 4 seconds + 1 second for every 5 characters
}
var CHANNEL;  //Name of the current channel

var REFRESH = true;               //Allow refresh to be turned off manually
var PENDING_STATUS_CALL = false;  //Keep a lock on the refresh call

//Avatar/channel/nick select vars
var sel_NICK;
var sel_CHAN;
var sel_CHAR;
var READY = false;

//Default sprite actions
var NONE = 0;
var FACE_LEFT = 1;
var FACE_RIGHT = 2;
var FACE_UP = 3;
var FACE_DOWN = 4;
var WALK_LEFT = 5;
var WALK_RIGHT = 6;
var WALK_UP = 7;
var WALK_DOWN = 8;

//FFVI Sprites
var LAUGH = 9;
var CHEER = 10;
var SCOLD = 11;
var WAVE = 12;
var SAD = 13;
var ANGRY = 14;
var SURPRISED = 15;
var PORTRAIT = 16;  //Not actually a sprite action, but last element holds and larger portrait of the character



////////////////////////////////////////////////////////////
//Sprite Object ////////////////////////////////////////////
////////////////////////////////////////////////////////////

function sprite(spr, name) {
    this.spr = spr;       //This is the name of the sprite to draw
    this.name = name;     //This is the user's nickname
    this.width;
    this.height;
    this.x=0;             //Location
    this.y=0;
    this.dx=0;            //Velocity (delta-location)
    this.dy=0;
    this.ax=0;            //Acceleration (in case we actually need it)
    this.ay=0;
    this.sx=1;            //Size
    this.sy=1;
    this.rot=0;           //Rotation
    this.facing;          //What direction is our sprite facing?
    this.currAction;      //What is our sprite currently doing?
    this.visible = false;

    this.framesLoaded = 0;  //Two varibles to preload our images before drawing
    this.framesTotal = 0;

    this.frames = new Array();       //Array of different sprites

    this.loadFrames = loadFrames;
    this.getCurrentFrame = getCurrentFrame;
    this.updateLocation = updateLocation;
    this.stillHere = true;;
}

//Preload all frames for this object
//Takes an array of urls
function loadFrames(fms) {

    this.framesTotal = fms.length;

    for(var i = 0; i < fms.length; i++) {
	this.frames[i] = new Image();

	//Set functons for results of image loading
	this.frames[i].onload = onFrameLoad;
	this.frames[i].onerror = onFrameError;
	this.frames[i].onabort = onFrameAbort;	
	this.frames[i].sprite = this;
	
	this.frames[i].src = fms[i];
    }
}

function onFrameLoad() {
    //Once an image is successfully loaded, increment the counter and check if it is the last for this sprite
    this.sprite.framesLoaded++;
    if(this.sprite.framesLoaded = this.sprite.framesTotal)
	this.sprite.visible = true;  //If all of the sprite's images are loaded, begin drawing
}

function onFrameError() {
    writeToConsole(" frameLoadError : " + this.name);
}

function onFrameAbort() {
    writeToConsole(" frameLoadAbort : " + this.name);
}

//Return an image to draw based on this sprites' current action and where in the animation loop it is
function getCurrentFrame() {
    return this.frames[this.currAction];
}

//Do some physics to change location and velocity
function updateLocation() {
    if(this.x + this.dx > 0 && this.x + this.width + this.dx < WIN_WIDTH)
	this.x += this.dx;
    if(this.y + this.dy > 0 && this.y + this.height + this.dy < WIN_HEIGHT)
	this.y += this.dy;
    //Haven't figured out why this is catting, so typecast for now - something in JSON
    this.dx += this.ax;
    this.dy += this.ay;
}


////////////////////////////////////////////////////////////
//Onload ///////////////////////////////////////////////////
////////////////////////////////////////////////////////////

$(document).ready(function() {

    //Check browser and warn if its not going to work
    if(jQuery.browser.version.substr(0,5) != "1.9.1") {
	alert("Gecko 1.9.1 REQUIRED! (this means Firefox 3.5b4 or higher)");
    }
    
    //Setup canvas elements
    canvas = document.getElementById('myCanvas');
    ctx = canvas.getContext('2d');

    //Bind login function
    $("#login").click( function() {
	login();
    });

    //Setup select screen
    $(".char").click( function() {
	$(".char").css( { background: "#000000" });
	$("#" + $(this).attr("id") ).css( { background: "#444444" });
	sel_CHAR = $(this).attr("id");
    });

    $(".chan").click( function() {
	$(".chan").css( { background: "#000000" });
	$("#" + $(this).attr("id") ).css( { background: "#444444" });
	sel_CHAN = $(this).attr("id");
    });

    //Attach event listeners for input
    $(document)
	.keydown( function(e) {
	    KEYS[e.keyCode] = true;
	})

	.keyup( function(e) {
	    KEYS[e.keyCode] = false;
	})

	.mousedown( function(e) {
	    M_CLICK = true;
	})
    
	.mouseup( function(e) {
	    M_CLICK = false;
	})
    
	.mousemove ( function(e) {
	    M_X = e.pageX - document.getElementById('myCanvas').offsetLeft;
	    M_Y = e.pageY - document.getElementById('myCanvas').offsetTop;
	})

	.keypress ( function(e) {
	    if(e.keyCode == 13) {  //Start chatting if user hits enter
		if(!READY) $("#login").click();
		else $("#chat").focus();
	    }
	});

    $("#chat").keypress ( processChat );
    $("#chat").focus( function() {
	CHATTING = true;
	$("#chat").css({ background: "#555555" });
    });
    $("#chat").blur( function() {
	CHATTING = false;
	$("#chat").css({ background: "#222222" });
    });

    //login();
    
});



function login() {

    //validate
    sel_NICK = $("#nick_sel").val();
    if(!sel_NICK || !sel_CHAN || !sel_CHAR) {
	var s = '';
	if(!sel_NICK) s += " nickname";
	else if(!sel_CHAN) s += " channel";
	else if(!sel_CHAR) s += " avatar";
	alert("Please select a" + s + "!");
    }

    else {
	//Create a demo sprite to start
	SPRITES[0] = createAvatar(sel_CHAR, sel_NICK);
	$("#portrait").css({ background: "url(" + SPRITES[0].frames[SPRITES[0].frames.length - 1].src + ") top left no-repeat" });
	writeToConsole("sprite " + SPRITES[0].spr + " loaded");

	//Join demo channel
	joinChannel(sel_CHAN);

	//Start input/redraw/refresh/cleanup loops
	setTimeout("delayDraw()",3000);
	setInterval("refresh()", NET_SPEED);
	setInterval("input()", INPUT_SPEED);
	cleanup();
	setInterval("cleanup()", CLEANUP_SPEED);
	
	//Show/hide nessesary elements
	$("#chat").show();
	$("#music").show();
	$("#select").hide();

	READY = true;

    }
}


function delayDraw() {
    setInterval("redraw()", DRAW_SPEED);
}


//Load a character
function createAvatar(spr, name) {
    var s = new sprite(spr, name);
    s.loadFrames( ["sprites/" + spr + "/" + spr + "_face_down.gif" ,
		   "sprites/" + spr + "/" + spr + "_face_left.gif" ,
		   "sprites/" + spr + "/" + spr + "_face_right.gif" ,
		   "sprites/" + spr + "/" + spr + "_face_up.gif" ,
		   "sprites/" + spr + "/" + spr + "_face_down.gif" ,
		   "sprites/" + spr + "/" + spr + "_walk_left.gif" ,
		   "sprites/" + spr + "/" + spr + "_walk_right.gif" ,
		   "sprites/" + spr + "/" + spr + "_walk_up.gif" ,
		   "sprites/" + spr + "/" + spr + "_walk_down.gif" ,
		   "sprites/" + spr + "/" + spr + "_laugh.gif" , 
		   "sprites/" + spr + "/" + spr + "_cheer.gif" ,
		   "sprites/" + spr + "/" + spr + "_scold.gif" ,
		   "sprites/" + spr + "/" + spr + "_wave.gif" ,
		   "sprites/" + spr + "/" + spr + "_sad.gif" ,
		   "sprites/" + spr + "/" + spr + "_angry.gif" ,
		   "sprites/" + spr + "/" + spr + "_surprised.gif" ,
		   "sprites/" + spr + "/" + spr + "_portrait.gif" ]);
    s.x = 385;
    s.y = 276;
    s.width = 32;
    s.height = 48;
    s.currAction = 0;  //start doing nothing and
    s.facing = 4;      //facing down

    return s;
}

//Self contained function to change channels
function joinChannel(chan) {
    CHANNEL = chan;
    $("#background").css({ background: "url(channels/" + chan + "/" + chan + ".png) top center no-repeat" });
    writeToConsole("chatting in <b>#" + chan + "</b>");
}

////////////////////////////////////////////////////////////
//Input  ///////////////////////////////////////////////////
////////////////////////////////////////////////////////////

//The keyboard and mouse state is saved in the KEYS[] array and M_ variables
//Check these peroidically to update sprite's action
function input() {

    //Check user input on a timer, update sprite
    //By convention, SPRITES[0] is always the user's sprite

    if(CHATTING) { //Don't precess keypresses if user is entering text input
	SPRITES[0].dx = 0;
	SPRITES[0].dy = 0;
	SPRITES[0].currAction = NONE;
	SPRITES[0].currAction = SPRITES[0].facing;	
    }

    else { //Not chatting, proceed

	if(KEYS[38] || KEYS[87]) {
	    SPRITES[0].currAction = WALK_UP;
	    SPRITES[0].facing = FACE_UP;
	    SPRITES[0].dy = -4;
	    
	    if(KEYS[37] || KEYS[65]) SPRITES[0].dx = -4;       //Up-left
	    else if(KEYS[39]  || KEYS[68]) SPRITES[0].dx = 4;  //Up-right
	    else SPRITES[0].dx = 0;                            //Up	    
	}
	
	else if(KEYS[40] || KEYS[83]) {
	    SPRITES[0].currAction = WALK_DOWN;
	    SPRITES[0].facing = FACE_DOWN;
	    SPRITES[0].dy = 4;
	    
	    if(KEYS[37] || KEYS[65]) SPRITES[0].dx = -4;       //Down-left
	    else if(KEYS[39]  || KEYS[68]) SPRITES[0].dx = 4;  //Down-right
	    else SPRITES[0].dx = 0;                            //Down
	}    
	
	else if(KEYS[37] || KEYS[65]) {  //Left
	    SPRITES[0].currAction = WALK_LEFT;
	    SPRITES[0].facing = FACE_LEFT;
	    SPRITES[0].dx = -4;
	    SPRITES[0].dy = 0;
	}
	
	else if(KEYS[39]  || KEYS[68]) {  //Right
	    SPRITES[0].currAction = WALK_RIGHT;
	    SPRITES[0].facing = FACE_RIGHT;
	    SPRITES[0].dx = 4;
	    SPRITES[0].dy = 0;
	}
	
	else {  //No direction keys are pressed - check for special buttons
	    SPRITES[0].dx = 0;
	    SPRITES[0].dy = 0;	    
	    
	    if(KEYS[49]) SPRITES[0].currAction = LAUGH;          //'1'
	    else if(KEYS[50]) SPRITES[0].currAction = CHEER;     //'2'
	    else if(KEYS[51]) SPRITES[0].currAction = SCOLD;     //'3'
	    else if(KEYS[52]) SPRITES[0].currAction = WAVE;      //'4'
	    else if(KEYS[53]) SPRITES[0].currAction = SAD;       //'5'
	    else if(KEYS[54]) SPRITES[0].currAction = ANGRY      //'6'
	    else if(KEYS[55]) SPRITES[0].currAction = SURPRISED; //'7'
	    
	    else  //No special buttons pressed - face last direction traveled and stop moving
		SPRITES[0].currAction = SPRITES[0].facing;
	    
	}
	
	//Now do the mouse
	if(M_CLICK) {
	    if(SPRITES[0].y > M_Y + 5) {
		SPRITES[0].dy = -4;
		SPRITES[0].currAction = WALK_UP;
		if(SPRITES[0].x > M_X + 5) SPRITES[0].dx = -4;
		else if(SPRITES[0].x < M_X - 5) SPRITES[0].dx = 4;
	    }
	    else if (SPRITES[0].y < M_Y - 5) {
		SPRITES[0].dy = 4;
		SPRITES[0].currAction = WALK_DOWN;
		if(SPRITES[0].x > M_X + 5) SPRITES[0].dx = -4;
		else if(SPRITES[0].x < M_X - 5) SPRITES[0].dx = 4;
	    }
	    else {
		if(SPRITES[0].x > M_X + 5) {
		    SPRITES[0].dx = -4;
		    SPRITES[0].currAction = WALK_LEFT;
		}
		else if(SPRITES[0].x < M_X - 5) {
		    SPRITES[0].dx = 4;
		    SPRITES[0].currAction = WALK_RIGHT;
		}
	    }

	}  //end if mouseclick


    } //end else not chatting


} //end input


//Chat functions
function processChat(e) {

    //If the user hits enter
    if(e.keyCode == 13) {
	var s = $("#chat").val();  //Store text
	$("#chat").val("").blur(); //Empty buffer and blur
	if(s.charAt(0) == '/') processCommand(s);  //Allow user to enter text commands
	else {
	    CHATS.push(new chat(SPRITES[0].name + ": "+ s , SPRITES[0]));  //Create a chat object and push it on stack of active chat bubbles
	    writeToConsole("<span class=\"me\">" + SPRITES[0].name + ": "+ s + "</span>");

	    action("msg=" + s);

	}
	return false;  //this needs to return false here to suppress default behavor of the 'enter' key in text inputs
    }

}

//Text command
function processCommand(s) {
    s = s.substring(1);  //get rid of the leading slash
    
    //sleep [msg]
    if(s.substr(0,5) == "sleep" || s.substr(0,4) == "away" || s.substr(0,3) == "brb" || s.substr(0,3) == "afk") {
	REFRESH = false;
	writeToConsole("<span class=\"action\">" + SPRITES[0].name + " is AFK : " + s.substring(s.indexOf(" ")) );
    }
    else if(s.substr(0,4) == "wake") {
	REFRESH = true;
	writeToConsole("<span class=\"action\">" + SPRITES[0].name + " is back");
    }
}

////////////////////////////////////////////////////////////
//Redraw ///////////////////////////////////////////////////
////////////////////////////////////////////////////////////

//Canvas drawing all happens here

function redraw() {

//    if(!DRAWING) {
//	DRAWING = true;
    try{
	ctx.clearRect(0,0,WIN_WIDTH,WIN_HEIGHT);
	
	ctx.font = "12px System, Arial Rounded MT Bold, Gadget, monospace, sans-serif";
	ctx.textAlign = "center";
	ctx.fillStyle = "white";
	
	ctx.shadowOffsetX = 1;
	ctx.shadowOffsetY = 1;
	ctx.shadowBlur = 1;
	ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
	
	//Draw all objects, increment frame, and update location
	//writeToConsole("drawing char " + SPRITES[0].x + "x *** " + SPRITES[0].y + "y");
	for(var i = 0; i < SPRITES.length; i++) {
	    if(SPRITES[i].visible) {
		ctx.save();
		ctx.translate( SPRITES[i].x , SPRITES[i].y );
		ctx.scale( SPRITES[i].sx , SPRITES[i].sy );
		ctx.rotate( SPRITES[i].rot );
		ctx.drawImage( SPRITES[i].getCurrentFrame() , 0 , 0 );
		//Write nickname
		ctx.shadowOffsetX = 2;
		ctx.shadowOffsetY = 2;
		ctx.fillText( SPRITES[i].name , SPRITES[i].width/2, SPRITES[i].height + 25 );
		SPRITES[i].updateLocation();
		ctx.restore();
	    }
	}
	
	ctx.shadowOffsetX = 2;
	ctx.shadowOffsetY = 2;
	ctx.lineWidth = 2;
	ctx.strokeStyle = "#dddddd";
	
	//Draw all active chat bubbles (and remove them if too old)
	for(var i = 0; i < CHATS.length; i++) {
	    if( (new Date()).getTime() < CHATS[i].time + CHATS[i].lifespan ) {
		var wid = ctx.measureText(CHATS[i].text).width + 40;
		var hig = 50;
		ctx.fillStyle = "#0000aa";
		//writeToConsole(parseInt(SPRITES[i].x - wid/2 + CHATS[i].owner.width/2) + 2 + " *** " + SPRITES[i].y - 75);
		//writeToConsole(CHATS[i].owner.width/2);
		fillRoundedRect(ctx , parseInt(CHATS[i].owner.x - wid/2 + CHATS[i].owner.width/2) + 2 , CHATS[i].owner.y - 75 , wid , hig , 5);
		strokeRoundedRect(ctx , parseInt(CHATS[i].owner.x - wid/2 + CHATS[i].owner.width/2) + 2 , CHATS[i].owner.y - 75 , wid , hig , 5);
		ctx.fillStyle = "white";
		ctx.fillText( CHATS[i].text , parseInt(CHATS[i].owner.x + CHATS[i].owner.width/2), parseInt(CHATS[i].owner.y - 45) );
	    }
	    
	    else {
		CHATS.shift();
		i--;
	    }
	}

//	DRAWING = false;
//    }
    }
    catch(e) {
	writeToConole('redraw() Error');
    }
}

////////////////////////////////////////////////////////////
//Refresh //////////////////////////////////////////////////
////////////////////////////////////////////////////////////

//Refresh is your standard AJAX get function
function refresh() {

    //Only keep one ajax call open at a time
    if(REFRESH && !PENDING_STATUS_CALL) {
	PENDING_STATUS_CALL = true;
	
	var args = "chan=" + CHANNEL + "&" +
	           "name=" + SPRITES[0].name + "&" +
	           "spr=" + SPRITES[0].spr + "&" +
	           "x=" + SPRITES[0].x + "&" +
	           "y=" + SPRITES[0].y + "&" +
	           "dx=" + SPRITES[0].dx + "&" +
	           "dy=" + SPRITES[0].dy + "&" +
	           "ax=" + SPRITES[0].ax + "&" +
	           "ay=" + SPRITES[0].ay + "&" +
	           "sx=" + SPRITES[0].sx + "&" +
	           "sy=" + SPRITES[0].sy + "&" +
	           "rot=" + SPRITES[0].rot + "&" +
	           "facing=" + SPRITES[0].facing + "&" +
	           "currAction=" + SPRITES[0].currAction + "&";


	$.ajax({ 
	    url : "refresh.cgi?" + args,
	    success : function(res) {
		PENDING_STATUS_CALL = false;
		//eval(res);
		refreshCallback(res);
	    } , 
	    error : errorOut
	});
    }

}

function refreshCallback(jsResponse) {
    
    //Responses are in JSON format
    var jsr = JSON.parse(jsResponse);
    var numSprites = jsr.Sprite.length;

    //Set stillHere variable to false for all sprites (except this user)
    //We must mark them as stillHere during the update process, otherwise we assume they have logged off
    //Don't do this for SPRITES[0] - this user is always considered still here
    for(var i = 1 ; i < SPRITES.length; i++) {
	SPRITES[i].stillHere = false;
    }


    //if we have sprites to draw
    if(numSprites > 0) {
	
	//loop thru all returned sprites
	for(var i = 0 ; i < numSprites; i++) {

	    //see if we have already loaded this sprite
	    var which = isSpriteLoaded(jsr.Sprite[i].name);

	    //if we have not seen this user before, set them up with a new slot in the SPRITES array;
	    if( which == -1 ) {
		//push onto array and set 'which' to hold its index
		which = SPRITES.length;
		SPRITES[SPRITES.length] = createAvatar(jsr.Sprite[i].spr , jsr.Sprite[i].name);
	    }
	    else if (which != 0) {
		//user is still here
		SPRITES[which].stillHere = true;
	    }

	    //yes, if .spr has changed reload this sprites graphics
	    if(SPRITES[which].spr !== jsr.Sprite[i].spr) {
		SPRITES[which] = createAvatar(jsr.Sprite[i].spr , jsr.Sprite[i].name); 
	    }

	    //update position/actions
	    loadSpriteData(which, jsr.Sprite[i]);
	    
	}
	
    }

    //remove sprites that are no longer here
    for(var i = 1 ; i < SPRITES.length; i++) {
	if(SPRITES[i].stillHere == false) {
	    SPRITES.splice(i,1);
	    i--;
	}
    }

    //check for new messages
    if(jsr.Messages) {
	var numMsgs = jsr.Messages.length;
	if(numMsgs  > 0) {
	    for(var i = 0; i < numMsgs; i++) {
		//Create a chat object and push it on stack of active chat bubbles
		var which = isSpriteLoaded( jsr.Messages[i].name );
		if(which != -1) {
		    CHATS.push(new chat(jsr.Messages[i].name + ": "+  jsr.Messages[i].msg, SPRITES[which]));
		    writeToConsole("<span class=\"chat\">" + jsr.Messages[i].name + ": "+ jsr.Messages[i].msg + "</span>");
		}
	    }
	}
    }

}

function isSpriteLoaded(n) {
    if(SPRITES.length > 1) {
	for(var i = 1 ; i < SPRITES.length; i++) {
	    if(SPRITES[i].name == n) return i;
	}
    }
    return -1;
}

function loadSpriteData(w, newData) {
    //writeToConsole(SPRITES[w].name + " " + SPRITES[w].x + "," + SPRITES[w].y + "," + SPRITES[w].dx + "," + SPRITES[w].dy);
    SPRITES[w].x = newData.x;
    SPRITES[w].y = newData.y;
    SPRITES[w].dx = newData.dx;
    SPRITES[w].dy = newData.dy;
    SPRITES[w].ax = newData.ax;
    SPRITES[w].ay = newData.ay;
    SPRITES[w].sx = newData.sx;
    SPRITES[w].sy = newData.sy;
    SPRITES[w].rot = newData.rot;
    SPRITES[w].facing = newData.facing;
    SPRITES[w].currAction = newData.currAction;
}


//Execute actions regardless of refreshing status
//Takes an optional callback on complete
function action(a, f) {
    
    if(!f || f == null || typeof f != 'function') f = function() { }  //dummy function if none passed

    	$.ajax({ 
	    url : "action.cgi?chan=" + CHANNEL + "&" +
                             "name=" + SPRITES[0].name + "&" + a,
	    success : function(data, textStatus) {
		f(data, textStatus);
	    } , 
	    error : errorOut
	});
}


//Cleanup function
//Called periodically by all users to remove avatars that have logged off
function cleanup() {

    	$.ajax({ 
	    url : "cleanup.cgi?chan=" + CHANNEL,
	    error : errorOut
	});

}


////////////////////////////////////////////////////////////
//Utils ////////////////////////////////////////////////////
////////////////////////////////////////////////////////////

//These lifted form https://developer.mozilla.org/en/Canvas_tutorial/Drawing_shapes
//Thanks Mozilla!
function strokeRoundedRect(ctx,x,y,width,height,radius){
    ctx.beginPath();
    ctx.moveTo(x,y+radius);
    ctx.lineTo(x,y+height-radius);
    ctx.quadraticCurveTo(x,y+height,x+radius,y+height);
    ctx.lineTo(x+width-radius,y+height);
    ctx.quadraticCurveTo(x+width,y+height,x+width,y+height-radius);
    ctx.lineTo(x+width,y+radius);
    ctx.quadraticCurveTo(x+width,y,x+width-radius,y);
    ctx.lineTo(x+radius,y);
    ctx.quadraticCurveTo(x,y,x,y+radius);
    ctx.stroke();
}

function fillRoundedRect(ctx,x,y,width,height,radius){
    ctx.beginPath();
    ctx.moveTo(x,y+radius);
    ctx.lineTo(x,y+height-radius);
    ctx.quadraticCurveTo(x,y+height,x+radius,y+height);
    ctx.lineTo(x+width-radius,y+height);
    ctx.quadraticCurveTo(x+width,y+height,x+width,y+height-radius);
    ctx.lineTo(x+width,y+radius);
    ctx.quadraticCurveTo(x+width,y,x+width-radius,y);
    ctx.lineTo(x+radius,y);
    ctx.quadraticCurveTo(x,y,x,y+radius);
    ctx.fill();
}

function writeToConsole(s) {
    $("#console").prepend(s + "<br />");
}

function errorOut(x, s, e) {
    $("#console").prepend("<span class=\"error\">" + s + " *** " + e + "</span><br />");
}
