const main = require("../../main");

module.exports = {
    usage: "verify <code>",
    use: function(args, message) {
        if (message.author.id in main.data.users) {
            if (!main.data.users[message.author.id].verified) {
                if (main.data.users[message.author.id].code == args[0]) {
                    main.data.users[message.author.id].verified = true;
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
    },
}