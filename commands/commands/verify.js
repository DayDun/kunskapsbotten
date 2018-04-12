const Discord = require("discord.js");
const main = require("../../main");
const getUser = require("../../main").getUser;

module.exports = {
    usage: "verify <code>",
    use: function(args, message) {
        let user = getUser(message.author.id);
        if (user) {
            if (!user.verified) {
                if (user.code == args[0]) {
                    user.verified = true;
                    message.member.addRole("432813256638464012");
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
    },
}