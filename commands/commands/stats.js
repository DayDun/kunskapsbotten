const Discord = require("discord.js");
const main = require("../../main");


module.exports = {
    usage: "stats (<user>)",
    use: function(args, message) {
        if (!(message.author.id in main.data.users) || !main.data.users[message.author.id].verified) {
            message.channel.send(new Discord.RichEmbed({title:":x: Du måste registrera dig först. __ks!register <email>__"}));
            return true;
        }
        
        let member = message.member;
        if (args.length >= 1) {
            member = main.getUserQuery(args.join(" ").toLowerCase());
            if (member) {
                if (!(member.id in main.data.users)) {
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
                    value: main.data.users[member.id].level,
                    inline: true
                },
                {
                    name: "Xp",
                    value: main.data.users[member.id].xp + " / " + main.xpForLevel(main.data.users[member.id].level),
                    inline: true
                },
                {
                    name: "Saldo",
                    value: main.data.users[member.id].balance,
                    inline: true
                }
            ]
        }));
        return true;
    },
};