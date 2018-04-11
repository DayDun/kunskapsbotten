const Discord = require("discord.js");
const main = require("../../main");

module.exports.leaderboard = {
    usage: "leaderboard",
    use: function(args, message) {
        if (!(message.author.id in main.data.users) || !main.data.users[message.author.id].verified) {
            message.channel.send(new Discord.RichEmbed({title:":x: Du måste registrera dig först. __ks!register <email>__"}));
            return true;
        }
        
        let list = Object.keys(main.data.users).sort(function(a, b) {
            return main.userXp(b) - main.userXp(a);
        });
        let length = Math.max.apply(null, list.map(function(user){return main.guild.members.get(user).displayName.length;}));

        message.channel.send(new Discord.RichEmbed({
            title: "Leaderboard 📋",
            description: "```md\n" + list.slice(0, 10).map(function(user, i) {
                return "[" + (i + 1 + " ").slice(0, 2) + "]" +
                       "(" + (main.guild.members.get(user).displayName + (new Array(length).fill(" ").join(""))).slice(0, length) + ") " +
                       "<xp: " + main.userXp(user) + ">";
            }).join("\n") + "```",
            fields: [
                {
                    name: "Din plats",
                    value: "```md\n[" + (list.indexOf(message.author.id) + 1) + "](" + message.member.displayName + ") <xp: " + main.userXp(message.author.id) + ">```"
                }
            ]
        }));
        return true;
    },
};

module.exports.slots = {
    usage: "slots (<bet>)",
    use: function(args, message) {
        if (!(message.author.id in main.data.users) || !main.data.users[message.author.id].verified) {
            message.channel.send(new Discord.RichEmbed({title:":x: Du måste registrera dig först. __ks!register <email>__"}));
            return true;
        }
        
        let amount = 1;
        if (args.length == 1 && !isNaN(parseInt(args[1]))) {
            amount = parseInt(args[1]);
        }
        
        
    },
};

module.exports.daily = {
    usage: "daily",
    use: function(args, message) {
        if (!(message.author.id in main.data.users) || !main.data.users[message.author.id].verified) {
            message.channel.send(new Discord.RichEmbed({title:":x: Du måste registrera dig först. __ks!register <email>__"}));
            return true;
        }
        
        if ("daily" in main.data.users[message.author.id]) {
            let day = 24 * 60 * 60 * 1000;
            let diff = (main.data.users[message.author.id].daily + day) - Date.now();
            if (diff >= 0) {
                let h = Math.floor(diff / 1000 / 60 / 60);
                let m = Math.floor(diff / 1000 / 60) % 60;
                message.channel.send(new Discord.RichEmbed({title:":x: Du måste vänta " + h + "h " + m + "m för att köra igen"}))
                return true;
            }
        } else {
            main.data.users[message.author.id].daily = Date.now();
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
            let _data = {
                title: "Daily 🎰",
                description: "```" + slots[0] + "｜" + slots[1] + "｜" + slots[2] + "```"
            };
            if (final) {
                _data.fields = [
                    {
                        name: "Vinst",
                        value: icons[slots[0]] + " + " + icons[slots[1]] + " + " + icons[slots[2]] + " = " + earnings
                    }
                ];
            }
            return new Discord.RichEmbed(_data);
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
                main.data.users[message.author.id].balance += earnings;
                main.saveData();
                msg.edit(genMessage(true));
            }, 3000);
        });
        
        return true;
    }
};