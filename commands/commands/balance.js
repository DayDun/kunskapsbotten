const Discord = require("discord.js");
const main = require("../../main");

module.exports.balance = {
    usage: "balance (<user>)",
    use: function(args, message) {
        if (!(message.author.id in main.data.users) || !main.data.users[message.author.id].verified) {
            message.channel.send(new Discord.RichEmbed({title:":x: Du måste registrera dig först. __ks!register <email>__"}));
            return true;
        }
        
        if (args.length >= 1) {
            let member = main.getUserQuery(args.join(" ").toLowerCase());
            if (member) {
                if (member.id in main.data.users) {
                    message.channel.send(new Discord.RichEmbed({title:":dollar: Saldot för " + member.displayName + " är " + main.data.users[member.id].balance}));
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
            message.channel.send(new Discord.RichEmbed({title:":dollar: Ditt saldo är " + main.data.users[message.author.id].balance}));
            return true;
        }
    },
};

module.exports.setbalance = {
    usage: "setbalance <amount> (<user>)",
    use: function(args, message) {
        if (!(message.author.id in main.data.users) || !main.data.users[message.author.id].verified) {
            message.channel.send(new Discord.RichEmbed({title:":x: Du måste registrera dig först. __ks!register <email>__"}));
            return true;
        }
        
        if (isNaN(parseInt(args[0]))) {
            message.channel.send(new Discord.RichEmbed({title:":x: Ogiltigt belopp"}));
            return true;
        }
        
        let member = message.member;
        if (args.length >= 2) {
            member = main.getUserQuery(args.slice(1).join(" ").toLowerCase());
        }
        
        if (member) {
            if (member.id in main.data.users) {
                main.data.users[member.id].balance = parseInt(args[0]);
                main.saveData();
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
    },
};