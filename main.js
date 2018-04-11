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

const PREFIX = "ks!";
const COLOR = 0x2c9ff7;

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

let roles = data.roles || {
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

function saveData() {
	fs.writeFile("data.json", JSON.stringify(data), function(error) {
		// TODO: Error handling
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
	return (xpTotal(data.users[id].level) + data.users[id].xp);
}

const commands = {
	"help": {
		usage: "help (<command>)",
		use: function(args, message) {
			if (args.length === 0) {
				// TODO: Dynamically generate
				let pages = [
					{
						title: "Kunskapsbotten Help",
						color: COLOR,
						fields: [
							{
								name: "Info",
								value: "Kunskapsbotten är en bot."
							},
							{
								name: "Användning",
								value: "Använd pilknapparna för att navigera menyer som denna.\n:eject: Knappen stänger menyn"
							}
						]
					},
					{
						title: "Kunskapsbotten Help",
						color: COLOR,
						fields: [
							{
								name: "`Utility`",
								value: "```yml\n- help\n- register <email>\n- verify <code>```"
							}
						]
					},
					{
						title: "Kunskapsbotten Help",
						color: COLOR,
						fields: [
							{
								name: "`Economy`",
								value: "```yml\n- stats (<user>)\n- balance (<user>)```"
							}
						]
					}
				];
				new PageMenu(message.channel, message.author, pages);
			} else if (args[0].toLowerCase() in commands) {
				let command = args[0].toLowerCase();
				message.channel.send(new Discord.RichEmbed({
					title: command,
					color: COLOR,
					description: commands[command].description,
					fields: [
						{
							name: "Använding: " + commands[command].usage,
							value: ""
						}
					],
					footer: {
						text: "Kategori: Info"
					}
				}));
			}
			return true;
		}
	},
	"register": {
		usage: "register <email>",
		use: function(args, message) {
			if (message.author.id in data.users && data.users[message.author.id].verified) {
				message.channel.send(new Discord.RichEmbed({title:":x: Redan registrerad"}));
				return true;
			}
			
			if (args.length != 1) {
				return false;
			}
			
			if (/^[a-z]{3}[0-9]{4}@edu\.kunskapsskolan\.se$/.test(args[0].toLowerCase())) {
				// Valid email
				for (let i in data.users) {
					if (data.users[i].email == args[0] && data.users[i].verified) {
						message.channel.send(new Discord.RichEmbed({title:":x: E-post används redan"}));
						return true;
					}
				}
				message.delete();
				data.users[message.author.id] = {
					email: args[0],
					code: Math.floor(1000 + Math.random() * 9000),
					verified: false,
					balance: 0,
					xp: 0,
					level: 0
				};
				saveData();
				mailTransport.sendMail({
					from: "TheDayDun@gmail.com",
					to: args[0],
					subject: "Mejl verifikation",
					text: "Det här är din e-postbekräftelsekod: " + data.users[message.author.id].code
				});
				message.channel.send(new Discord.RichEmbed({title:":white_check_mark: E-postbekräftelseskod skickad! Skriv __ks!verify <code>__ för att verifiera ditt konto."}));
				return true;
			} else {
				message.channel.send(new Discord.RichEmbed({title:":x: Ogiltig e-postadress. E-postadressen måste vara från skolan"}));
				return true;
			}
		}
	},
	"verify": {
		usage: "verify <code>",
		use: function(args, message) {
			if (message.author.id in data.users) {
				if (!data.users[message.author.id].verified) {
					if (data.users[message.author.id].code == args[0]) {
						data.users[message.author.id].verified = true;
						message.member.addRole("432813256638464012");
						saveData();
						message.channel.send(new Discord.RichEmbed({title:":white_check_mark: Ditt konto har blivit verifierat"}));
						return true;
					} else {
						message.channel.send(new Discord.RichEmbed({title:":x: Ogiltig verifieringskod"}));
						return true;
					}
				} else {
					message.channel.send(new Discord.RichEmbed({title:":x: Du har redan verifierat ditt konto"}));
					return true;
				}
			} else {
				message.channel.send(new Discord.RichEmbed({title:":x: Du har inte registrerat dig ännu"}));
				return true;
			}
		}
	},
	"stats": {
		usage: "stats (<user>)",
		use: function(args, message) {
			if (!(message.author.id in data.users) || !data.users[message.author.id].verified) {
				message.channel.send(new Discord.RichEmbed({title:":x: Du måste registrera dig först. __ks!register <email>__"}));
				return true;
			}
			
			let member = message.member;
			if (args.length >= 1) {
				member = getUser(args.join(" ").toLowerCase());
				if (member) {
					if (!(member.id in data.users)) {
						message.channel.send(new Discord.RichEmbed({title:":x: Användaren är inte registrerad"}));
						return true;
					}
				} else {
					message.channel.send(new Discord.RichEmbed({title:":x: Användaren hittades inte"}));
					return true;
				}
			}
			
			message.channel.send(new Discord.RichEmbed({
				author: {
					name: member.displayName,
					icon_url: member.user.avatarURL
				},
				fields: [
					{
						name: "Level",
						value: data.users[member.id].level,
						inline: true
					},
					{
						name: "Xp",
						value: data.users[member.id].xp + " / " + xpForLevel(data.users[member.id].level),
						inline: true
					},
					{
						name: "Saldo",
						value: data.users[member.id].balance,
						inline: true
					}
				]
			}));
			return true;
		}
	},
	"balance": {
		usage: "balance (<user>)",
		use: function(args, message) {
			if (!(message.author.id in data.users) || !data.users[message.author.id].verified) {
				message.channel.send(new Discord.RichEmbed({title:":x: Du måste registrera dig först. __ks!register <email>__"}));
				return true;
			}
			
			if (args.length >= 1) {
				let member = getUser(args.join(" ").toLowerCase());
				if (member) {
					if (member.id in data.users) {
						message.channel.send(new Discord.RichEmbed({title:":dollar: Saldot för " + member.displayName + " är " + data.users[member.id].balance}));
						return true;
					} else {
						message.channel.send(new Discord.RichEmbed({title:":x: Användaren är inte registrerad"}));
						return true;
					}
				} else {
					message.channel.send(new Discord.RichEmbed({title:":x: Användaren hittades inte"}));
					return true;
				}
			} else {
				message.channel.send(new Discord.RichEmbed({title:":dollar: Ditt saldo är " + data.users[message.author.id].balance}));
				return true;
			}
		}
	},
	"setbalance": {
		usage: "setbalance <amount> (<user>)",
		use: function(args, message) {
			if (!(message.author.id in data.users) || !data.users[message.author.id].verified) {
				message.channel.send(new Discord.RichEmbed({title:":x: Du måste registrera dig först. __ks!register <email>__"}));
				return true;
			}
			
			if (isNaN(parseInt(args[0]))) {
				message.channel.send(new Discord.RichEmbed({title:":x: Ogiltigt belopp"}));
				return true;
			}
			
			let member = message.member;
			if (args.length >= 2) {
				member = getUser(args.slice(1).join(" ").toLowerCase());
			}
			
			if (member) {
				if (member.id in data.users) {
					data.users[member.id].balance = parseInt(args[0]);
					saveData();
					message.channel.send(new Discord.RichEmbed({title:":white_check_mark: Saldot av " + member.displayName + " sattes till " + parseInt(args[0])}));
					return true;
				} else {
					message.channel.send(new Discord.RichEmbed({title:":x: Användaren är inte registrerad"}));
					return true;
				}
			} else {
				message.channel.send(new Discord.RichEmbed({title:":x: Användaren hittades inte"}));
				return true;
			}
		}
	},
	"leaderboard": {
		usage: "leaderboard",
		use: function(args, message) {
			if (!(message.author.id in data.users) || !data.users[message.author.id].verified) {
				message.channel.send(new Discord.RichEmbed({title:":x: Du måste registrera dig först. __ks!register <email>__"}));
				return true;
			}
			
			let list = Object.keys(data.users).sort(function(a, b) {
				return userXp(b) - userXp(a);
			});
			let length = Math.max.apply(null, list.map(function(user){return guild.members.get(user).displayName.length;}));

			message.channel.send(new Discord.RichEmbed({
				title: "Leaderboard 📋",
				description: "```md\n" + list.slice(0, 10).map(function(user, i) {
					return "[" + (i + 1 + " ").slice(0, 2) + "]" +
						   "(" + (guild.members.get(user).displayName + (new Array(length).fill(" ").join(""))).slice(0, length) + ") " +
						   "<xp: " + userXp(user) + ">";
				}).join("\n") + "```",
				fields: [
					{
						name: "Din plats",
						value: "```md\n[" + (list.indexOf(message.author.id) + 1) + "](" + message.member.displayName + ") <xp: " + userXp(message.author.id) + ">```"
					}
				]
			}));
			return true;
		}
	},
	"slots": {
		usage: "slots (<bet>)",
		use: function(args, message) {
			if (!(message.author.id in data.users) || !data.users[message.author.id].verified) {
				message.channel.send(new Discord.RichEmbed({title:":x: Du måste registrera dig först. __ks!register <email>__"}));
				return true;
			}
			
			let amount = 1;
			if (args.length == 1 && !isNaN(parseInt(args[1]))) {
				amount = parseInt(args[1]);
			}
			
			
		}
	},
	"daily": {
		usage: "daily",
		use: function(args, message) {
			if (!(message.author.id in data.users) || !data.users[message.author.id].verified) {
				message.channel.send(new Discord.RichEmbed({title:":x: Du måste registrera dig först. __ks!register <email>__"}));
				return true;
			}
			
			if ("daily" in data.users[message.author.id]) {
				let day = 24 * 60 * 60 * 1000;
				let diff = (data.users[message.author.id].daily + day) - Date.now();
				if (diff >= 0) {
					let h = Math.floor(diff / 1000 / 60 / 60);
					let m = Math.floor(diff / 1000 / 60) % 60;
					message.channel.send(new Discord.RichEmbed({title:":x: Du måste vänta " + h + "h " + m + "m för att köra igen"}))
					return true;
				}
			} else {
				data.users[message.author.id].daily = Date.now();
			}
			
			// TODO: Probabilities
			let icons = {
				"🔥": 5,
				"💧": 5,
				"❄": 5,
				"🎟": 10,
				"🎺": 15,
				"💥": 20,
				"⚡": 20,
				"✨": 20,
				"💰": 50,
				"🏆": 50,
				"💳": 100,
				"⭐": 100,
				"💎": 1000
			};
			function rand() {
				let keys = Object.keys(icons);
				return keys[Math.floor(Math.random() * keys.length)];
			}
			let slots = [rand(), rand(), rand()];
			let earnings = 0;
			
			function genMessage(final) {
				let data = {
					title: "Daily 🎰",
					description: "```" + slots[0] + "｜" + slots[1] + "｜" + slots[2] + "```"
				};
				if (final) {
					data.fields = [
						{
							name: "Vinst",
							value: icons[slots[0]] + " + " + icons[slots[1]] + " + " + icons[slots[2]] + " = " + earnings
						}
					];
				}
				return new Discord.RichEmbed(data);
			}
			
			message.channel.send(genMessage(false)).then(function(msg) {
				setTimeout(function() {
					slots = [rand(), rand(), rand()];
					msg.edit(genMessage(false));
				}, 1000);
				setTimeout(function() {
					slots = [rand(), rand(), rand()];
					msg.edit(genMessage(false));
				}, 2000);
				setTimeout(function() {
					slots = [rand(), rand(), rand()];
					earnings = icons[slots[0]] + icons[slots[1]] + icons[slots[2]];
					data.users[message.author.id].balance += earnings;
					saveData();
					msg.edit(genMessage(true));
				}, 3000);
			});
			
			return true;
		}
	},
	"eval": {
		usage: "eval <javascript>",
		use: function(args, message) {
			if (args.length === 0) {
				return false;
			} else {
				let result;
				try {
					result = eval(args.join(" "));
				} catch(e) {
					message.channel.send(e.toString());
					return true;
				}
				// Idk if this is equivalent to just JSON.stringify lol.
				if (typeof result == "undefined") {
					message.channel.send("`undefined`");
				} else if (typeof result == "number") {
					message.channel.send("`" + result + "`");
				} else if (typeof result == "string") {
					message.channel.send("`\"" + result + "\"`");
				} else if (Array.isArray(result)) {
					message.channel.send("`" + JSON.stringify(result) + "`");
				} else {
					message.channel.send("`" + result.toString() + "`");
				}
				return true;
			}
		}
	}
};

discord.on("ready", function() {
	console.log("Ready");
	discord.user.setPresence({status:"online",game:{name:"ks!help"}});
	guild = discord.guilds.get("431418564755456000");
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
				let result = commands[command].use(content.slice(1), message);
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