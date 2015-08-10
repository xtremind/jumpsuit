var fs = require("fs"),
	http = require("http"),
	WebSocketServer = require("ws").Server,
	MESSAGE = require("./static/message.js").MESSAGE,
	ERROR = require("./static/message.js").ERROR,
	collisions = require("./static/collisions.js"),
	engine = require("./static/engine.js");


var configSkeleton = {
	interactive: false,
	monitor: false,
	port: 8080
},
	configPath = process.argv[2] || "./config.json";
try {
	fs.statSync(configPath);
} catch(err) {
	if(err.code === "ENOENT") {
		console.log("No config file (\033[1m" + configPath + "\033[0m) found. Creating it.");
		fs.writeFileSync(configPath, JSON.stringify(configSkeleton, null, "\t"));
	}
}
var config,
	previousConfig;
function loadConfig(firstRun) {
	function clone(obj) {
		var target = {};
		for (var i in obj) {
			if (obj.hasOwnProperty(i)) target[i] = obj[i];
		}
		return target;
	}
	if(config !== undefined) previousConfig = clone(config);

	if(loadConfig.selfModified === true) {
		loadConfig.selfModified = false;
		return;
	}
	try {
		config = JSON.parse(fs.readFileSync(configPath));
		for(key in config) {
			if(configSkeleton[key] === undefined) throw new Error("Invalid property " + key + " in " + configPath);
		}
		console.log("Succesfully loaded" + (firstRun === true ? "" : " modified") + " config file.");
		var addedProp = [];
		for(key in configSkeleton) {
			if(!config.hasOwnProperty(key)) {
				config[key] = configSkeleton[key];//all the properties must be listed in `config.json`
				addedProp.push(key);
			}
		}
		if(addedProp.length !== 0) {
			fs.writeFileSync(configPath, JSON.stringify(config, null, "\t"));
			loadConfig.selfModified = true;
			console.log("New properties added to \033[1mconfig.json\033[0m file: \033[4m" + addedProp.join("\033[0m, \033[4m") + "\033[0m");
		}
	} catch(err) {
		console.log(err, "Unproper config file found. Loading default settings.");
		config = configSkeleton;
	}
	if(previousConfig !== undefined) {
		if(config.port !== previousConfig.port) {
			server.close();
			server.listen(config.port);
		}
		if(config.monitor !== previousConfig.monitor) {
			if(previousConfig.monitor) {
				clearInterval(monitorTimerID);
				process.stdout.write('\033c');
			} else monitorTimerID = setInterval(monitoring, 500);
		}
		if(config.interactive !== previousConfig.interactive) {
			if(previousConfig.interactive) rl.close();
			else initRl();
		}
	}
}
loadConfig(true);
fs.watchFile(configPath, loadConfig);//refresh config whenever the `config.json` is modified

var files = {};
files.construct = function(path, oName) {
	fs.readdirSync(path).forEach(function(pPath) {
		var cPath = path + "/" + pPath,
			stat = fs.statSync(cPath);
		if(stat.isDirectory()) {//WE NEED TO GO DEEPER
			files.construct(cPath, oName + pPath + "/");
		} else {
			files[oName + pPath] = fs.readFileSync(cPath);
			files[oName + pPath].mtime = stat.mtime;
		}
	});
}
files.construct("./static", "/");//load everything under `./static` in RAM for fast access

if(config.interactive) initRl();
var rl;
function initRl(){
	rl = require("readline").createInterface({
		input: process.stdin,
		output: process.stdout
	});

	rl.on("line", function (cmd) {
		//allowing to output variables on purpose
		console.log(eval(cmd));
	});
}

//send static files
var server = http.createServer(function (req, res){
	if(req.url === "/") req.url = "/index.html";
	var extension = req.url.slice(req.url.lastIndexOf(".") - req.url.length + 1),
		mime;
	switch(extension) {
		case "html":
			mime = "text/html";
			break;
		case "css":
			mime = "text/css";
			break;
		case "svg":
			mime = "image/svg+xml";
			break;
		case "png":
			mime = "image/png";
			break;
		case "js":
			mime = "application/javascript";
			break;
		default:
			mime = "application/octet-stream";
	}

	if(files[req.url] !== undefined) {
			res.setHeader("Cache-Control", "public, no-cache, must-revalidate, proxy-revalidate");
		if(req.headers["if-modified-since"] !== undefined && new Date(req.headers["if-modified-since"]).getTime() === files[req.url].mtime.getTime()) {
			res.writeHead(304);
			res.end();
		} else {
			res.setHeader("Content-Type", mime);
			res.setHeader("Last-Modified", files[req.url].mtime.toUTCString());
			res.writeHead(200);
			res.end(files[req.url]);
		}
	} else {
		res.writeHead(404);
		res.end("Error 404:\nPage not found\n");
	}
});
server.listen(config.port);

var lobbies = [],
	wss = new WebSocketServer({server: server});


function Lobby(name, maxPlayers){
	this.players = new Array(maxPlayers || 8);
	this.planets = [];
	this.enemies = [];
	this.processTime = 0;
	this.players.firstEmpty = function(){
		for (var i = 0; i < this.length; i++){
			if (this[i] === undefined) return i;
		}
		return -1;
	};
	this.players.amount = function(){
		var amount = 0;
		this.forEach(function(player) {
			amount += 1;
		});
		return amount;
	};
	this.players.getData = function(){
		var plData = [];
		this.forEach(function(player) {
			plData.push({name: player.name, appearance: player.appearance});
		});
		return plData;
	};
	this.enemies.getWorldData = function(){
		var enemData = [];
		for (var i = 0; i < this.length; i++){			
			enemData.push({x: this[i].box.center.x, y: this[i].box.center.y, appearance: this[i].appearance});
		}
		return enemData;
	};
	this.enemies.getGameData = function(){
		var enemData = [], enemShotData;
		for (var i = 0; i < this.length; i++){
			enemShotData = [];
			for (var j = 0; j < this[i].shots.length; j++){
				enemShotData.push({x: this[i].shots[j].box.center.x, y: this[i].shots[j].box.center.y, angle: this[i].shots[j].box.angle, lt: this[i].shots[j].lt});
			}
			enemData.push({angle: this[i].box.angle, shots: enemShotData});
		}
		return enemData;
	};
	this.planets.getWorldData = function(){
		var pltData = [];
		for (var i = 0; i < this.length; i++){
			pltData.push({x: this[i].box.center.x, y: this[i].box.center.y, radius: this[i].box.radius});
		}
		return pltData;
	};
	this.planets.getGameData = function(){
		var pltData = [];
		for (var i = 0; i < this.length; i++){
			//pltData.push(this[i].progress);
			pltData.push({color: this[i].progress.color, value: this[i].progress.value, team: this[i].progress.team});
		}
		return pltData;
	};

	
	//generate world structure
	var areaSize = 6400,
		chunkSize = 1600;

	for (var y = 0; y < areaSize; y += chunkSize){
		for (var x = 0; x < areaSize; x += chunkSize){
			var px = Math.floor(Math.random() * (chunkSize - 400) + 200),
				py = Math.floor(Math.random() * (chunkSize - 400) + 200),
				radius = Math.floor(Math.random() * (px <= 300 || px >= chunkSize - 300 || py <= 300 || py >= chunkSize - 300 ? 80 : 250) + 100);
			this.planets.push(new engine.Planet(x + px, y + py, radius));
		}
	}
	
	var iterations = 0;
	while (iterations < 250 && this.enemies.length < 15){
		var newEnemy = new engine.Enemy(Math.floor(Math.random() * 6400), Math.floor(Math.random() * 6400)), wellPositioned = true;
		this.enemies.forEach(function (enemy){
			if (!wellPositioned) return;
			if ((new collisions.Circle(new collisions.Point(newEnemy.box.center.x, newEnemy.box.center.y), 175)).collision(new collisions.Circle(new collisions.Point(enemy.box.center.x, enemy.box.center.y), 175))) wellPositioned = false;
		});
		this.planets.forEach(function (planet){
			if (!wellPositioned) return;
			if (newEnemy.aggroBox.collision(planet.box)) wellPositioned = false;
		});
		if (wellPositioned) this.enemies.push(newEnemy);
		iterations++;
	}

	this.gameProgress = {ticks: 0, "alienBeige": 0, "alienBlue": 0, "alienGreen": 0, "alienPink": 0, "alienYellow": 0};
	this.name = name || "Unnamed Lobby";
	this.maxPlayers = maxPlayers || 8;
}
Lobby.prototype.broadcast = function(message) {
	this.players.forEach(function(player) {
		try {
			player.ws.send(message);
		} catch(e) {/*Ignore errors*/}
	});
}
Lobby.prototype.update = function() {
	var oldDate = Date.now(), playerData = [];
	engine.doPhysics(this.players, this.planets, this.enemies);
	this.processTime = Date.now() - oldDate;
	if (this.gameProgress.ticks++ === 50){
		this.planets.forEach(function(planet){
			if (planet.progress.value >= 80) this.gameProgress[planet.progress.team]++; 
		}.bind(this));
		this.gameProgress.ticks = 0;
	}
	this.players.forEach(function(player, i) {
		function truncTo(number, decimalNbr) {
			var lel = Math.pow(10, decimalNbr);
			return Math.round(number * lel) / lel;
		}
		playerData[i] = (player !== undefined) ? {x: truncTo(player.box.center.x, 5), y: truncTo(player.box.center.y, 5), attachedPlanet: player.attachedPlanet,
			angle: truncTo(player.box.angle, 7), walkFrame: player.walkFrame, health: player.health, fuel: player.fuel,
			name: player.name, appearance: player.appearance, looksLeft: player.looksLeft, jetpack: player.jetpack
		} : null;
	});
	this.players.forEach(function(player, i) {
		setTimeout(function() {
			if (player === undefined) return;
			try {
				player.ws.send(JSON.stringify({
					msgType: MESSAGE.PLAYER_DATA,
					data: playerData
				}));
				player.ws.send(JSON.stringify({
					msgType: MESSAGE.GAME_DATA,
					data: {
						planets: this.planets.getGameData(),
						enemies: this.enemies.getGameData(),
						gameProgress: this.gameProgress
					}
				}));
				player.lastRefresh = Date.now();
			} catch(e) {/*Ignore errors*/}
		}.bind(this), Math.max(16, Date.now() - player.lastRefresh + player.latency));
	}.bind(this));

}
Lobby.prototype.pingPlayers = function() {
	this.players.forEach(function(player) {
		player.lastPing = {};
		player.lastPing.timestamp = Date.now();
		player.lastPing.key = Math.floor(Math.random()*65536);

		player.ws.send(JSON.stringify({
			msgType: MESSAGE.PING,
			data: {
				key: player.lastPing.key
			}
		}));
	});
}
lobbies.getUid = function(index) {
	var uid = index.toString(16);
	while(uid.length !== 6) {
		uid = "0" + uid;
	}
	return uid;
}
lobbies.getByUid = function(uid) {
	var index = parseInt(uid, 16);
	if(index === NaN || !isFinite(index) || index % 1 !== 0) return null;
	return this[index];
}

setInterval(function() {
	lobbies.forEach(function(lobby) {
		lobby.update();
	});
}, 16);

setInterval(function() {
	lobbies.forEach(function(lobby) {
		lobby.pingPlayers();
	});
}, 1000);

function monitoring() {
	process.stdout.write("\033c");
	console.log("Jumpsuit Server [STATUS: RUNNING]");
	console.log("\nMonitoring Lobbies:");
	var headerSizes = [40, 10, 20],
		headerNames = ["lobby name", "player", "process time", "lifetime"],
		header = "";
	for (var i = 0; i < headerSizes.length; i++){
		header += (i !== 0 ? " | " : "") + headerNames[i].toUpperCase() + Array(headerSizes[i] - headerNames[i].length).join(" ");
	}
	console.log(header);
	for (var i = 0; i < lobbies.length; i++){
		var info = lobbies[i].name + Array(headerSizes[0] - lobbies[i].name.length).join(" "),
			amount = lobbies[i].players.amount().toString(),
			processTime = lobbies[i].processTime.toString();
		info += " | " + amount + Array(headerSizes[1] - amount.length).join(" ");
		info += " | " + processTime + Array(headerSizes[2] - processTime.length).join(" ");
		console.log(info);
	}
}
if(config.monitor) var monitorTimerID = setInterval(monitoring, 500);

wss.on("connection", function(ws) {
	ws.on("message", function(message) {
		var msg;
		try {
			msg = JSON.parse(message);
			console.log("received: ", msg);
			switch(msg.msgType){
				case MESSAGE.CONNECT:
					var lobby = lobbies.getByUid(msg.data.uid);
					if(lobby.players.amount() === lobby.maxPlayers) ws.send(JSON.stringify({msgType: MESSAGE.ERROR, data: {code: ERROR.NO_SLOT}}));
					else if(lobby.players.some(function(player) { return player.name === msg.data.name; })) ws.send(JSON.stringify({msgType: MESSAGE.ERROR, data: {code: ERROR.NAME_TAKEN}}));
					else if(lobby === null) ws.send(JSON.stringify({msgType: MESSAGE.ERROR, data: {code: ERROR.NO_LOBBY}}));
					else {
						var pid = lobby.players.firstEmpty();
						lobby.players.splice(pid, 1, new engine.Player(msg.data.name, msg.data.appearance, 0, 0, this));
						ws.send(JSON.stringify({msgType: MESSAGE.CONNECT_SUCCESSFUL, data: {pid: pid}}));
						ws.send(JSON.stringify({msgType: MESSAGE.WORLD_DATA, data: {planets: lobby.planets.getWorldData(), enemies: lobby.enemies.getWorldData()}}));
						lobby.players[pid].lastRefresh = Date.now();
						lobby.broadcast(JSON.stringify({msgType: MESSAGE.PLAYER_SETTINGS, data: lobby.players.getData()}));
						lobby.broadcast(JSON.stringify({msgType: MESSAGE.CHAT, data: {content: "'" + msg.data.name + "' connected", pid: -1}}));
					}
					break;
				case MESSAGE.GET_LOBBIES:
					var lobbyList = [];
					lobbies.forEach(function(lobby, i) {
						lobbyList.push({uid: lobbies.getUid(i), name: lobby.name, players: lobby.players.amount(), maxPlayers: lobby.maxPlayers});
					});
					ws.send(JSON.stringify({msgType: MESSAGE.SENT_LOBBIES, data: lobbyList}));
					break;
				case MESSAGE.CREATE_LOBBY:
					lobbies.push(new Lobby(msg.data.name, 8));
					break;
				case MESSAGE.PLAYER_SETTINGS:
					var lobby = lobbies.getByUid(msg.data.uid);
					if (lobby === null) ws.send(JSON.stringify({msgType: MESSAGE.ERROR, data: {code: ERROR.NO_LOBBY}}));
					else {
						var oldName = lobby.players[msg.data.pid].name;
						lobby.players[msg.data.pid].name = msg.data.name;
						lobby.players[msg.data.pid].appearance = msg.data.appearance;
						lobby.broadcast(JSON.stringify({msgType: MESSAGE.PLAYER_SETTINGS, data: lobby.players.getData()}));
						if (oldName !== msg.data.name) lobby.broadcast(JSON.stringify({msgType: MESSAGE.CHAT, data: {content: "'" + oldName + "' changed name to '" + msg.data.name + "'", pid: -1}}));
					}
					break;
				case MESSAGE.CHAT:
					var lobby = lobbies.getByUid(msg.data.uid);
					if (lobby !== null){
						i = msg.data.content;
						lobby.broadcast(JSON.stringify({msgType: MESSAGE.CHAT, data: {content: i, name: lobby.players[msg.data.pid].name, pid: msg.data.pid, appearance: lobby.players[msg.data.pid].appearance}}));
					}
					break;
				case MESSAGE.PLAYER_CONTROLS:
					var lobby = lobbies.getByUid(msg.data.uid);
					if (lobby !== null){
						for (i in msg.data.controls){
							lobby.players[msg.data.pid].controls[i] = msg.data.controls[i];
						}
					}
					break;
				case MESSAGE.DISCONNECT:
				case MESSAGE.LEAVE_LOBBY:
					var lobby = lobbies.getByUid(msg.data.uid);
					if (lobby !== null){
						delete lobby.players[msg.data.pid];
						lobby.broadcast(JSON.stringify({msgType: MESSAGE.CHAT, data: {content: "'" + lobby.players[msg.data.pid].name + "' has left the game", pid: -1}}));						
					}
					break;
				case MESSAGE.PONG:
					var lobby = lobbies.getByUid(msg.data.uid);
					if(lobby !== null) {
						var thisPlayer = lobby.players[msg.data.pid];
						if(thisPlayer.lastPing.key === msg.data.key) {
							thisPlayer.latency = (Date.now() - thisPlayer.lastPing.timestamp) / 2;
							//up speed is usually faster than down speed so we can send world data at `thisPlayer.latency` pace
						}
					}
					break;
			}
		} catch (e){
			console.log("ERROR", e, msg);
		}
	});
	ws.on("close", function(e){
		var found = false;
		lobbies.forEach(function (lobby){
			lobby.players.forEach(function (player, i){
				if (player.ws == ws){
					delete lobby.players[i];
					lobby.broadcast(JSON.stringify({msgType: MESSAGE.CHAT, data: {content: "'" + player.name + "' has left the game", pid: -1}}));
					found = true;
					return;
				}
			});
			if (found) return;
		});
	});
});

Math.map = function(x, in_min, in_max, out_min, out_max) {
	return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

lobbies.push(new Lobby("Lobby No. 1", 7));
