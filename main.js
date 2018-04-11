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
const https = require("https");
class KpApi {
	constructor() {
		this.options = {
			hostname: "sts.kedschools.com",
			port: 443,
			path: "/adfs/ls/idpinitiatedsignon.aspx?RelayState=RPID%3Dhttps%253A%252F%252Fks.kunskapsporten.se%26RelayState%3Dhttps://ks.kunskapsporten.se/&RedirectToIdentityProvider=http%3a%2f%2fsts.kunskapsskolan.se%2fadfs%2fservices%2ftrust",
			method: "GET",
			headers: {}
		};
	}
	
	request() {
		https.request(this.options);
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
		commands: ["help", "register", "verify", "stats", "balance", "leaderboard", "slots", "daily", "setbalance", "eval"]
	},
	"431418564755456000": { // @everyone
		commands: ["help", "register", "verify", "stats", "balance", "leaderboard", "slots", "daily"]
	}
};

function getUser(query) {
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

function saveData(newData) {
	if(newData) {
		fs.writeFile("data.json", JSON.stringify(newData), function(error) {
			// TODO: Error handling
		});
	} else {
		fs.writeFile("data.json", JSON.stringify(data), function(error) {
			// TODO: Error handling
		});
	}
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
	return (xpTotal(data.users[id].level) + data.users[id].xp);
}

const commands = require("./commands");

discord.on("ready", function() {
	console.log("Ready");
	discord.user.setPresence({status:"online",game:{name:"ks!help"}});
	guild = discord.guilds.get(data.guildId || "431418564755456000");
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

module.exports.getUser = getUser;
module.exports.saveData = saveData;
module.exports.xpForLevel = xpForLevel;
module.exports.xpTotal = xpTotal;
module.exports.levelReward = levelReward;
module.exports.userAddXp = userAddXp;
module.exports.userXp = userXp;