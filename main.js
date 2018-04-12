const fs = require("fs");

const Discord = require("discord.js");
const discord = new Discord.Client();
let guild;

const secret = JSON.parse(fs.readFileSync("secret.json"));
const data = JSON.parse(fs.readFileSync("data.json"));

// Email
const nodemailer = require("nodemailer");
const mailTransport = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: "thedaydun@gmail.com",
		pass: secret.email
	}
});

// Kunskapsporten stuff
const request = require("request");
const cheerio = require("cheerio");
class KpApi {
	constructor() {
		this.request = request.defaults({jar: true});
		this.loggedin = false;
		this.login().then(function() {
			console.log("KP logged in");
			this.loggedin = true;
		}.bind(this));
	}
	
	login() {
		return new Promise(function(resolve, reject) {
			this.request({
				url: "https://sts.kedschools.com/adfs/ls/idpinitiatedsignon",
				qs: {
					"RelayState": "RPID=https%3A%2F%2Fks.kunskapsporten.se&RelayState=https://ks.kunskapsporten.se/",
					"RedirectToIdentityProvider": "http://sts.kunskapsskolan.se/adfs/services/trust"
				},
				followAllRedirects: true
			}, function(error, response, body) {
				//console.log("step1");
				this.request.post({
					url: response.request.uri.href,
					followAllRedirects: true,
					form: {
						"UserName": secret.kp.username,
						"Password": secret.kp.password,
						"AuthMethod": "FormsAuthentication"
					}
				}, function(error, response, body) {
					//console.log("step2");
					this.request.post({
						url: "https://sts.kedschools.com/adfs/ls/",
						form: {
							"SAMLResponse": body.slice(185, -312),
							"RelayState": body.slice(-262, -226)
						}
					}, function(error, response, body) {
						//console.log("step3");
						this.request.post({
							url: "https://ks.kunskapsporten.se/saml/SAMLAssertionConsumer",
							followAllRedirects: true,
							form: {
								"SAMLResponse": body.slice(205, -305),
								"RelayState": "https://ks.kunskapsporten.se/"
							}
						 }, function(error, response, body) {
							//console.log("step4");
							resolve();
						}.bind(this));
					}.bind(this));
				}.bind(this));
			}.bind(this));
		}.bind(this));
	}
}
const port = new KpApi();

// TODO: Improve interactive menu api
// TODO: Modules
// TODO: Better user data storage management
// TODO: Command aliases
// TODO: Permission system

const PREFIX = module.exports.prefix = "ks!";
const COLOR = module.exports.color = 0x2c9ff7;

let menus = [];

class Menu {
	constructor(channel, data) {
		this.buttons = [];
		this.message = null;
		channel.send(new Discord.RichEmbed(data)).then(async function(message) {
			this.message = message;
			for (let i=0; i<this.buttons.length; i++) {
				await message.react(this.buttons[i][0]);
			};
		}.bind(this));
		
		menus.push(this);
	}
	
	async setButtons(buttons) {
		this.buttons = buttons;
		if (this.message) {
			for (let i=0; i<buttons.length; i++) {
				await this.message.react(buttons[i][0]);
			};
		}
	}
	
	update(data) {
		this.message.edit(new Discord.RichEmbed(data));
	}
	
	interact(user, reaction) {
		reaction.remove(user);
		this.buttons.find(function(button) {
			return button[0] == reaction.emoji.name;
		})[1](user);
	}
	
	remove() {
		this.message.delete();
		menus.splice(menus.indexOf(this), 1);
	}
}

class PageMenu extends Menu {
	constructor(channel, user, pages) {
		super(channel, Object.assign({
			footer: {
				text: "Sida 1 av " + pages.length
			}
		}, pages[0]));
		this.setButtons([
			["⏮", function(user) {
				this.setPage(0);
			}.bind(this)],
			["⬅", function(user) {
				this.setPage(Math.max(this.page - 1, 0));
			}.bind(this)],
			["➡", function(user) {
				this.setPage(Math.min(this.page + 1, this.pages.length - 1));
			}.bind(this)],
			["⏭", function(user) {
				this.setPage(this.pages.length - 1);
			}.bind(this)],
			//["🔢", function() {}.bind(this)],
			["⏏", function() {
				this.remove();
			}.bind(this)]
		]);
		this.user = user;
		this.pages = pages;
		this.page = 0;
	}
	
	setPage(i) {
		if (this.page === i) {
			return;
		}
		
		this.page = i;
		this.update(Object.assign({
			footer: {
				text: "Sida " + (this.page + 1) + " av " + this.pages.length
			}
		}, this.pages[this.page]));
	}
	
	interact(user, reaction) {
		reaction.remove(user);
		if (user == this.user) {
			this.buttons.find(function(button) {
				return button[0] == reaction.emoji.name;
			})[1](user);
		}
	}
}

const roles = module.exports.roles = data.roles || {
	"432939088711254037": { // Moderator
		commands: ["help", "register", "verify", "stats", "balance", "leaderboard", "slots", "daily", "steg", "setbalance", "eval"]
	},
	"431418564755456000": { // @everyone
		commands: ["help", "register", "verify", "stats", "balance", "leaderboard", "slots", "daily", "steg"]
	}
};

function saveData() {
	fs.writeFile("data.json", JSON.stringify(data), function(error) {
		// TODO: Error handling
	});
}

let users = {};
const User = module.exports.User = class User {
	constructor(id) {
		this.id = id;
		
		if (!(this.id in data.users)) {
			data.users[this.id] = {};
		}
		
		users[this.id] = this;
	}
	
	register(email) {
		this.email = email;
		this.code = Math.floor(1000 + Math.random() * 9000);
		this.verified = false;
		this.balance = 0;
		this.xp = 0;
		this.level = 0;
		this.daily = 0;
	}
	
	get email() { return data.users[this.id].email; }
	set email(value) { data.users[this.id].email = value; saveData(); }
	
	get verified() { return data.users[this.id].verified; }
	set verified(value) { data.users[this.id].verified = value; saveData(); }
	
	get balance() { return data.users[this.id].balance; }
	set balance(value) { data.users[this.id].balance = value; saveData(); }
	
	get xp() { return data.users[this.id].xp; }
	set xp(value) { data.users[this.id].xp = value; saveData(); }
	
	get level() { return data.users[this.id].level; }
	set level(value) { data.users[this.id].level = value; saveData(); }
	
	get daily() { return data.users[this.id].daily; }
	set daily(value) { data.users[this.id].daily = value; saveData(); }
	
	static xpForLevel(level) {
		return 6 * (level + 1);
	}
	static xpTotalForLEvel(level) {
		return 3 * (level + 1) * (level + 2);
	}
	
	get totalXp() {
		return this.xpTotalForLevel(this.level - 1) + this.xp;
	}
}
for (let i in data.users) {
	new User(i);
}

const getUser = module.exports.getUser = function getUser(id) {
	return users[id];
}
function getUserQuery(query) {
	let match = query.match(/^<@!?([0-9]+)>$/);
	if (match) {
		query = match[1];
	}
	return discord.guilds.get("431418564755456000").members.find(function(member) {
		return (member.displayName.toLowerCase() == query) ||
			   (member.user.username.toLowerCase() == query) ||
			   (member.id == query);
	});
}

function xpForLevel(level) {
	return 6 * (level + 1);
}
function xpTotal(level) {
	return 3 * (level + 1) * (level + 2);
}
function levelReward(level) {
	return Math.pow(2, level);
}

function userAddXp(id, amount) {
	if ((id in data.users) && data.users[id].verified) {
		data.users[id].xp += amount;
		let didLevelUp = false;
		while (true) {
			if (data.users[id].xp >= xpForLevel(data.users[id].level)) {
				didLevelUp = true;
				data.users[id].xp -= xpForLevel(data.users[id].level);
				data.users[id].balance += levelReward(data.users[id].level);
				data.users[id].level++;
			} else {
				break;
			}
		}
		saveData();
		return didLevelUp;
	}
}
function userXp(id) {
	return (xpTotal(data.users[id].level - 1) + data.users[id].xp);
}

const commands = require("./commands");
commands.steg = {
	usage: "steg <ämne> <steg>",
	use: function(args, message) {
		if (!(message.author.id in data.users) || !data.users[message.author.id].verified) {
			message.channel.send(new Discord.RichEmbed({title:":x: Du måste registrera dig först. __ks!register <email>__"}));
			return true;
		}
		
		if (!port.loggedin) {
			message.channel.send(new Discord.RichEmbed({title:":x: Botten är inte inloggad än. Försök igen om ett tag"}));
			return true;
		}
		
		let subjects = {
			"en": "engelska",
			"eng": "engelska",
			"engelska": "engelska",
			"fr": "franska",
			"franska": "franska",
			"ma": "matematik",
			"matte": "matematik",
			"matematik": "matematik",
			"sp": "spanska",
			"spa": "spanska",
			"spanska": "spanska",
			"sv": "svenska",
			"svenska": "svenska",
			"sva": "svenskasomandrasprak",
			"ty": "tyska",
			"tyska": "tyska"
		};
		
		if (!(args[0].toLowerCase() in subjects)) {
			message.channel.send(new Discord.RichEmbed({title:":x: Ogiltigt ämne"}));
			return false;
		}
		
		let steg = parseInt(args[1]);
		if (isNaN(steg)) {
			message.channel.send(new Discord.RichEmbed({title:":x: Ogiltigt steg"}));
			return false;
		}
		
		port.request("https://ks.kunskapsporten.se/steg/" + subjects[args[0].toLocaleLowerCase()] + "/block" + Math.ceil(steg / 5) + "/steg" + steg + "/introduktion", function(error, response, body) {
			if (error) {
				message.channel.send(new Discord.RichEmbed({title:":x: Steget kunde inte laddas"}));
				return;
			}
			let doc = cheerio.load(body);
			message.channel.send(doc("#readThis > div.sv-vertical.sv-layout > div > div > div.pagecontent.sv-layout.sv-spacer-20pxvt").text());
		});
		return true;
	},
};



discord.on("ready", function() {
	console.log("Ready");
	discord.user.setPresence({status:"online",game:{name:"ks!help"}});
	guild = module.exports.guild = discord.guilds.get(data.guildId || "431418564755456000");
});

discord.on("message", function(message) {
	if (message.author.bot) {
		return;
	}
	
	let didLevelUp = userAddXp(message.author.id, 1);
	
	if (message.content.toLowerCase().startsWith(PREFIX)) {
		let content = message.content.slice(PREFIX.length).split(" ");
		let command = content[0].toLowerCase();
		if (command in commands) {
			let canUse = false;
			let rolesArray = message.member.roles.array();
			let permission = message.member.roles.some(function(role) {
				return (role.id in roles) && roles[role.id].commands.includes(command);
			});
			
			if (permission) {
				let result = commands[command].use.call(this, content.slice(1), message);
				if (!result) {
					message.channel.send(new Discord.RichEmbed({title:":x: " + command + " usage: __" + PREFIX + commands[command].usage + "__"}));
				}
			} else {
				message.channel.send(new Discord.RichEmbed({title:":x: Du har inte behörighet att använda det här kommandot!"}));
			}
		}
		// Don't send an error message if the command doesn't exist.
	}
	
	if (didLevelUp) {
		message.channel.send(new Discord.RichEmbed({
			title: ":arrow_double_up: " + message.member.displayName + " gick upp i nivå " + data.users[message.author.id].level + "! Ditt saldo ökade med " + levelReward(data.users[message.author.id].level - 1)
		}));
	}
});
discord.on("messageReactionAdd", function(reaction, user) {
	if (user.bot) {
		return;
	}
	
	for (let i=0; i<menus.length; i++) {
		if (menus[i] && reaction.message == menus[i].message) {
			menus[i].interact(user, reaction);
			break;
		}
	}
});

discord.login(secret.token);

module.exports.PageMenu = PageMenu;
module.exports.mailTransport = mailTransport;
module.exports.data = data;
module.exports.guild = guild;

module.exports.users = users;
//module.exports.User = User;

module.exports.getUserQuery = getUserQuery;
module.exports.saveData = saveData;
module.exports.xpForLevel = xpForLevel;
module.exports.xpTotal = xpTotal;
module.exports.levelReward = levelReward;
module.exports.userAddXp = userAddXp;
module.exports.userXp = userXp;