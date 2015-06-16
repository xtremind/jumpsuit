"use strict";

function Planet(x, y, radius, color, enemies) {
	this.box = new Circle(new Point(x, y), radius);
	this.color = color;
	this.player = -1;
	this.enemies = enemies;
}
function Enemy(x, y, appereal){	
	this.x = x;
	this.y = y;
	this.appereal = appereal;
	this.fireRate = 0;
	this.angle = 0
	this.shots = [];
}
var canvas = document.getElementById("canvas"),
	context = canvas.getContext("2d"),
	resources = {},
	meteors = [],
	pause = 0,
	player = {
		health: 10, facesLeft: false, name: "alienGreen",
		velX: 0, velY: 0,
		_walkFrame: "_stand", walkCounter: 0, walkState: 0, fuel: 400,
		set walkFrame(v){
			this._walkFrame = v;
			this.box.width = resources[this.name + this.walkFrame].width;
			this.box.height = resources[this.name + this.walkFrame].height;
		},
		get walkFrame(){
			return this._walkFrame;
		},
		attachedPlanet: 0, leavePlanet: false,
		oldChunkX: 0, oldChunkY: 0
	},
	game = {
		paused: false,
		muted: false,
		dragStartX: 0,
		dragStartY: 0,
		dragX: 0,
		dragY: 0
	},
	offsetX = 0, offsetY = 0,
	controls = {
		jump: 0,
		crouch: 0,
		jetpack: 0,
		moveLeft: 0,
		moveRight: 0
	},
	planets = [
		//emptiness
	],
	planetColours = [
		"rgb(255,51,51)",
		"rgb(220,170,80)",
		"rgb(120, 240,60)",
		"rgb(12,135,242)",
		"rgb(162,191,57)",
		"rgb(221,86,41)",
		"rgb(54,38,127)",
		"rgb(118,33,129)"
	],
	chunks = [
		//emptiness
	],
	chunkSize = 4000;


chunks.chunkExist = function(x, y){
	var result = -1;
	this.forEach(function (element, index){
		if (element.x == x && element.y == y){
			result = index;
			return;
		}
	});
	return result;
}
chunks.removeChunk = function (x, y){
	var c = this.chunkExist(x, y);
	if (c < 0) return;

	for (var i = 0; i < planets.length; i++){
		if (planets[i].box.center.x >= x * chunkSize && planets[i].box.center.x <= (x + 1) * chunkSize && planets[i].box.center.y >= y * chunkSize && planets[i].box.center.y <= (y + 1) * chunkSize){
			planets.splice(i,1);
			i--;			
		}		
	}		

	chunks.splice(c, 1);
}
chunks.addChunk = function (x, y){
	if (this.chunkExist(x, y) >= 0) return;
	var planetsAmount = Math.floor(Math.map(Math.random(), 0, 1, 2, 6));
		
	for (var i = 0; i < planetsAmount; i++){
		var planetRadius = Math.map(Math.random(), 0, 1, 150, (chunkSize - 150) / (3 * planetsAmount)),
			planetColour = planetColours[Math.floor(Math.random() * planetColours.length)],
			enemyAmount = Math.floor(Math.map(Math.random(), 0, 1, 0, (planetRadius < 200) ? 2 : 4)),
			planetPosition = {px: (((i + 1) / planetsAmount) + x) * chunkSize, py: Math.map(Math.random(), 0, 1, y * chunkSize, (y + 1) * chunkSize)}; 		

		var lastEnemyAng = 0, enemies = [];
		for (var j = 0; j < enemyAmount; j++){
			var enemyAng = Math.map(Math.random(), 0, 1, lastEnemyAng + Math.PI / 4, lastEnemyAng + Math.PI * 1.875),
				enemyDistance = Math.floor(Math.map(Math.random(), 0, 1, planetRadius * 1.5, planetRadius * 4)),
				enemyResources = ["Black1", "Black2", "Black3", "Black4", "Black5", "Blue1", "Blue2", "Blue3", "Green1", "Green2", "Red1", "Red2", "Red3"];
			enemies[j] = new Enemy(Math.sin(enemyAng) * enemyDistance, -Math.cos(enemyAng) * enemyDistance, "enemy" + enemyResources[Math.floor(Math.random() * enemyResources.length)]);
			lastEnemyAng = enemyAng;
		}
		planets.push(new Planet(planetPosition.px, planetPosition.py, planetRadius, planetColour, enemies));
	}
	chunks.push({x: x, y: y});
}

function init(){
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;

	init.paths = [
		"background.png",
		"meteorBig1.svg", "meteorBig2.svg", "meteorBig3.svg", "meteorBig4.svg", "meteorMed1.svg", "meteorMed2.svg", "meteorSmall1.svg", "meteorSmall2.svg", "meteorTiny1.svg", "meteorTiny2.svg",
		"shield.png", "pill_red.png", "laserBeam.png", "laserBeamDead.png",
		"alienBlue_badge.svg", "alienBlue_duck.svg", "alienBlue_hurt.svg", "alienBlue_jump.svg", "alienBlue_stand.svg", "alienBlue_walk1.svg", "alienBlue_walk2.svg",
		"alienBeige_badge.svg", "alienBeige_duck.svg", "alienBeige_hurt.svg", "alienBeige_jump.svg", "alienBeige_stand.svg", "alienBeige_walk1.svg", "alienBeige_walk2.svg",
		"alienGreen_badge.svg", "alienGreen_duck.svg", "alienGreen_hurt.svg", "alienGreen_jump.svg", "alienGreen_stand.svg", "alienGreen_walk1.svg", "alienGreen_walk2.svg",
		"alienPink_badge.svg", "alienPink_duck.svg", "alienPink_hurt.svg", "alienPink_jump.svg", "alienPink_stand.svg", "alienPink_walk1.svg", "alienPink_walk2.svg",
		"alienYellow_badge.svg", "alienYellow_duck.svg", "alienYellow_hurt.svg", "alienYellow_jump.svg", "alienYellow_stand.svg", "alienYellow_walk1.svg", "alienYellow_walk2.svg",
		"enemyBlack1.svg", "enemyBlack2.svg", "enemyBlack3.svg", "enemyBlack4.svg", "enemyBlack5.svg",
		"enemyBlue1.svg", "enemyBlue2.svg", "enemyBlue3.svg", "enemyBlue4.svg", "enemyBlue5.svg",
		"enemyGreen1.svg", "enemyGreen2.svg", "enemyGreen3.svg", "enemyGreen4.svg", "enemyGreen5.svg",
		"enemyRed1.svg", "enemyRed2.svg", "enemyRed3.svg", "enemyRed4.svg", "enemyRed5.svg"
	];

	context.canvas.fillStyle = "black";
	context.fillRect(0,0, canvas.width, canvas.height);
  	context.font = "16px Open Sans";
  	context.textBaseline = "top";
  	context.textAlign = "center";

  	for (var y = -1; y <= 1; y++){
  		for (var x = -1; x <= 1; x++){
  			chunks.addChunk(x, y);
  			if (x == 0 && y == 0) player.attachedPlanet = planets.length - 1;
  		}
  	}

	loadProcess();
}

function loadProcess(){
	loadProcess.progress = loadProcess.progress === undefined ? 0 : ++loadProcess.progress;

	context.fillStyle = "#121012";
	context.fillRect(0, 0, canvas.width, canvas.height);

	context.fillStyle = "#007d6c";
	context.fillRect(0, 0, ((loadProcess.progress + 1) / init.paths.length) * canvas.width, 15);

	context.fillStyle = "#eee";
	context.font = "60px Open Sans";
	context.fillText("JumpSuit", canvas.width / 2, canvas.height * 0.35);
	context.font = "28px Open Sans";
	context.fillText("A canvas game by Getkey & Fju", canvas.width / 2, canvas.height * 0.35 + 80);

	console.log("loaded");
	if (loadProcess.progress == init.paths.length) {
		player.box = new Rectangle(new Point(0, 0), resources[player.name + player.walkFrame].width, resources[player.name + player.walkFrame].height);
		setTimeout(loop, 1000);
	} else if (Math.floor(loadProcess.progress / 5) > Math.floor((loadProcess.progress - 1) / 5)){
		console.log((loadProcess.progress + 4 > init.paths.length) ? init.paths.length - loadProcess.progress : 5);
		for (var i = 0; i < 5; i++){
			if (loadProcess.progress + i > init.paths.length - 1) break;
			var r = new Image();
			r.onload = loadProcess;
			r.src = "assets/images/" + init.paths[loadProcess.progress + i];
			resources[init.paths[loadProcess.progress + i].slice(0, init.paths[loadProcess.progress + i].lastIndexOf("."))] = r;
		}		
	}	
}

function loop(){
	handleGamepad();
	function drawRotatedImage(image, x, y, angle, mirror){
		//courtesy of Seb Lee-Delisle
		context.save();
		context.translate(x, y);
		context.rotate(angle);
		if (mirror === true) context.scale(-1, 1);
		context.drawImage(image, -(image.width / 2), -(image.height / 2));
		context.restore();
	}

	function fillCircle(cx, cy, r){
		context.save();

		context.beginPath();
		context.arc(cx, cy, r, 0, 2 * Math.PI, false);
		context.closePath();
		context.fill();

		context.clip();

		context.lineWidth = 12;
		context.shadowColor = "black";
		context.shadowBlur = 30;
		context.shadowOffsetX = -10;
		context.shadowOffsetY = -10;

		context.beginPath();
		context.arc(cx, cy + 1, r + 7, -1/7 * Math.PI, 3/5 * Math.PI);
		context.stroke();

		context.restore();
	}

	function drawCircle(cx, cy, r, sw){
		context.save();
		context.beginPath();
		context.arc(cx, cy, r, 0, 2 * Math.PI, false);
		context.globalAlpha = 0.1;
		context.fill();
		context.globalAlpha = 1;
		context.strokeStyle = context.fillStyle;
		context.lineWidth = sw;
		context.stroke();
		context.restore();
	}

	function drawArrow(fromx, fromy, ang, dist, col){
		var len = (dist > 200) ? 200 : (dist < 70) ? 70 : dist;

		var tox = fromx + Math.sin(Math.PI - ang) * len,
			toy = fromy - Math.cos(Math.PI - ang) * len;
		context.beginPath();
		context.moveTo(fromx, fromy);
		context.lineTo(tox, toy);
		context.lineWidth = 5;
		context.strokeStyle = col;
		context.stroke();
	}

	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	context.globalAlpha = 1;
	context.clearRect(0, 0, canvas.width, canvas.height);


	//layer 0: background
	for (var i = 0; i < Math.floor(canvas.width / 256) + 1; i++){
		for (var j = 0; j < Math.floor(canvas.height / 256) + 1; j++){
			context.drawImage(resources["background"], i * 256, j * 256);
		}
	}


	//layer 1: meteors
	if (Math.random() < 0.01){
		var m_resources = ["meteorBig1", "meteorBig2", "meteorBig3", "meteorBig4", "meteorMed1",	"meteorMed2", "meteorSmall1", "meteorSmall2", "meteorTiny1", "meteorTiny2"],
			m_rand = Math.floor(1 / Math.random()) - 1,
			chosen_img = m_resources[(m_rand > m_resources.length - 1) ? m_resources.length - 1 : m_rand];

		meteors[meteors.length] = {
			x: -resources[chosen_img].width,
			y: Math.map(Math.random(), 0, 1, 50, canvas.height - 50),
			res: chosen_img,
			speed: Math.map(Math.random(), 0, 1, 2, 4),
			ang: Math.map(Math.random(), 0, 1, 0.25 * Math.PI, 0.75 * Math.PI),
			rotAng: Math.map(Math.random(), 0, 1, 0, 2 * Math.PI),
			rotSpeed: Math.map(Math.random(), 0, 1, -0.05, 0.05),
			depth: Math.map(Math.random(), 0, 1, 0.2, 0.6)
		};
	}
	meteors.forEach(function(m, i){
		m.x += Math.sin(m.ang) * m.speed;
		m.y += Math.cos(m.ang) * m.speed;
		context.globalAlpha = m.depth;
		m.rotAng += m.rotSpeed;
		if (m.x > canvas.width + 10 || m.y > canvas.height + 10) meteors.splice(i, 1);
		else drawRotatedImage(resources[m.res], m.x, m.y, m.rotAng);
	});

	context.globalAlpha = 1;


	//layer 2: the game
	offsetX = ((player.box.center.x - canvas.width / 2 + (game.dragStartX - game.dragX)) + 19 * offsetX) / 20;
	offsetY = ((player.box.center.y - canvas.height / 2 + (game.dragStartY - game.dragY)) + 19 * offsetY) / 20;

	planets.forEach(function (planet){
		context.fillStyle = planet.color;
		fillCircle(planet.box.center.x - offsetX, planet.box.center.y - offsetY, planet.box.radius);
		drawCircle(planet.box.center.x - offsetX, planet.box.center.y - offsetY, planet.box.radius * 1.5, 2);
	});
	planets.forEach(function (planet){	
		planet.enemies.forEach(function (enemy, ei){
			var deltaX = planet.box.center.x + enemy.x - player.box.center.x,
				deltaY = planet.box.center.y + enemy.y - player.box.center.y,
				dist = Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2)),
				aimAngle = Math.PI - Math.atan2(planet.box.center.x + enemy.x - player.box.center.x, planet.box.center.y + enemy.y - player.box.center.y);
			if (dist > 400){
				aimAngle = enemy.angle + Math.PI / 150;
				enemy.fireRate = 0;
			} else {
				if (++enemy.fireRate >= 20) {
					enemy.fireRate = 0;
					enemy.shots[enemy.shots.length] = {x: planet.box.center.x + enemy.x, y: planet.box.center.y + enemy.y, a: aimAngle - Math.PI, lt: 200}; //lt = lifetime
					playSound("laser");
				}
			}
			enemy.angle = aimAngle;

			enemy.shots.forEach(function (shot, si){
				shot.x += (shot.lt <= 0) ? 0 : Math.sin(shot.a) * 11;
				shot.y += (shot.lt <= 0) ? 0 : -Math.cos(shot.a) * 11;
				if (shot.x - offsetX < 0 || shot.x - offsetX > canvas.width || shot.y - offsetY < 0 || shot.y - offsetY > canvas.height || --shot.lt <= -20) enemy.shots.splice(si, 1);
				else if ((new Circle(new Point(shot.x, shot.y), resources["laserBeam"].width / 2)).collision(player.box)){//to be replaced with `shot.box.collision()`
					player.health -= (player.health = 0) ? 0 : 1;
					enemy.shots.splice(si, 1);
				}
				drawRotatedImage(resources[(shot.lt <= 0) ? "laserBeamDead" : "laserBeam"], shot.x - offsetX, shot.y - offsetY, shot.a, false);
			});
			context.fillStyle = "#aaa";
			drawCircle(planet.box.center.x + enemy.x - offsetX, planet.box.center.y + enemy.y - offsetY, 350, 4);
			drawRotatedImage(resources[enemy.appereal], planet.box.center.x + enemy.x - offsetX, planet.box.center.y + enemy.y - offsetY, aimAngle, false);
		});
	});

	if (controls["jump"] > 0 && player.leavePlanet === false){
		player.leavePlanet = true;
		player.attachedPlanet = -1;
		player.walkFrame = "_jump";
		player.velX = Math.sin(player.box.angle) * 6;
		player.velY = -Math.cos(player.box.angle) * 6;
	}

	if (player.attachedPlanet >= 0){
		fadeBackground(true);
		var stepSize = Math.PI * 0.007 * (150 / planets[player.attachedPlanet].box.radius);
		if (controls["moveLeft"] > 0){
			stepSize = stepSize * controls["moveLeft"];
			planets[player.attachedPlanet].player += (controls["run"]) ? 1.7 * stepSize : 1 * stepSize;
			player.looksLeft = true;
		}
		if (controls["moveRight"] > 0){
			stepSize = stepSize * controls["moveRight"];
			planets[player.attachedPlanet].player -= (controls["run"]) ? 1.7 * stepSize : 1 * stepSize;
			player.looksLeft = false;
		}
		player.walkState = (controls["moveLeft"] || controls["moveRight"]);

		if (!player.walkState) player.walkFrame = (controls["crouch"]) ? "_duck" : "_stand";
		if (++player.walkCounter > ((controls["run"]) ? 5 : 9)){
			player.walkCounter = 0;
			if (player.walkState) player.walkFrame = (player.walkFrame === "_walk1") ? "_walk2" : "_walk1";
		}
		player.box.center.x = planets[player.attachedPlanet].box.center.x + Math.sin(planets[player.attachedPlanet].player) * (planets[player.attachedPlanet].box.radius + resources[player.name + player.walkFrame].height / 2);
		player.box.center.y = planets[player.attachedPlanet].box.center.y + Math.cos(planets[player.attachedPlanet].player) * (planets[player.attachedPlanet].box.radius + resources[player.name + player.walkFrame].height / 2);
		player.box.angle = Math.PI - planets[player.attachedPlanet].player;
		player.velX = 0;
		player.velY = 0;
		player.fuel = 300;
	} else {
		fadeBackground(false);		
		var chunkX = Math.floor(player.box.center.x / chunkSize),
			chunkY = Math.floor(player.box.center.y / chunkSize);

		if (chunkX !== player.oldChunkX || chunkY !== player.oldChunkY){
			for (var y = -3; y <= 3; y++){
				for (var x = -3; x <= 3; x++){
					if (y >= -1 && y <= 1 && x >= -1 && x <= 1) chunks.addChunk(chunkX + x, chunkY + y);
					else chunks.removeChunk(chunkX + x, chunkY + y);
				}
			}
		}

		player.oldChunkX = chunkX;
		player.oldChunkY = chunkY;

		planets.forEach(function (planet, pi){
			var deltaX = planet.box.center.x - player.box.center.x,
				deltaY = planet.box.center.y - player.box.center.y,
				distPowFour = Math.pow(Math.pow(deltaX, 2) + Math.pow(deltaY, 2), 2);

			player.velX += 9000 * planet.box.radius * deltaX / distPowFour;
			player.velY += 9000 * planet.box.radius * deltaY / distPowFour;

			var origX = player.box.center.x - offsetX,
				origY = player.box.center.y - offsetY;
			if (Math.pow(distPowFour, 1 / 4) < chunkSize) drawArrow(origX, origY, Math.atan2(planet.box.center.x - offsetX - origX, planet.box.center.y - offsetY - origY), 400 / Math.pow(distPowFour, 1 / 4) * planet.box.radius, planet.color);

			if (planet.box.collision(player.box)) {
				//player is in a planet's attraction area
				player.attachedPlanet = pi;
				player.leavePlanet = false;
				planet.player = Math.atan2(deltaX, deltaY) + Math.PI;
			}
		});

		if(controls["jetpack"] > 0 && player.fuel > 0 && controls["crouch"] < 1){
			player.fuel-= controls["jetpack"];
			player.velX += (Math.sin(player.box.angle) / 10) * controls["jetpack"];
			player.velY += (-Math.cos(player.box.angle) / 10) * controls["jetpack"];
		} else if (controls["crouch"] > 0){
			//((player.box.center.x - canvas.width / 2 + (game.dragStartX - game.dragX)) + 19 * offsetX) / 20;
			player.velX = player.velX * 0.987;
			player.velY = player.velY * 0.987;
		}

		var runMultiplicator = controls["run"] ? 1.7 : 1;
		if (controls["moveLeft"] > 0) player.box.angle -= (Math.PI / 140) * controls["moveLeft"] * runMultiplicator;
		if (controls["moveRight"] > 0) player.box.angle += (Math.PI / 140) * controls["moveRight"] * runMultiplicator;

		player.box.center.x += player.velX;
		player.box.center.y += player.velY;
	}

	context.fillText("player.oldChunkX: " + player.oldChunkX, 0, 200);
	context.fillText("player.oldChunkY: " + player.oldChunkY, 0, 250);
	context.fillText("planets.length: " + planets.length, 0,  300);
	drawRotatedImage(resources[player.name + player.walkFrame],
		player.box.center.x - offsetX,
		player.box.center.y - offsetY,
		player.box.angle,
		player.looksLeft);


	//layer 3: HUD / GUI
	context.font = "28px Open Sans";
	context.textAlign = "left";
	context.textBaseline = "hanging";

	context.fillStyle = "#eee";
	context.drawImage(resources[player.name + "_badge"], 8, 18, 32, 32);
	context.fillText("Player Name".toUpperCase(), 55, 20); //uppercase looks better

	context.font = "20px Open Sans";
	context.fillText("Health: ", 8, 90);
	for (var i = 0; i < player.health; i++){
		context.drawImage(resources["shield"], 80 + i * 22, 90, 18, 18);
	}
	context.fillText("Fuel: ", 8, 120);
	context.fillStyle = "#f33";
	context.fillRect(80, 126, player.fuel, 8);
	
	[].forEach.call(document.querySelectorAll("#controls img"), function (element){
		element.setAttribute("style", "opacity: " + (0.3 + controls[element.id] * 0.7));
	});	

	window.requestAnimationFrame(loop);
}

Math.map = function(x, in_min, in_max, out_min, out_max) {
	return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}
init();