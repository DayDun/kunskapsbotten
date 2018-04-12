const Discord = require("discord.js");
const main = require("../../main");
const getUser = require("../../main").getUser;
const User = require("../../main").User;

module.exports = {
    usage: "register <email>",
    use: function(args, message) {
        let user = getUser(message.author.id);
        if (user && user.verified) {
            message.channel.send(new Discord.RichEmbed({title:":x: Redan registrerad"}));
            return true;
        }
        
        if (args.length != 1) {
            return false;
        }
        
        if (/^[a-z]{3}[0-9]{4}@edu\.kunskapsskolan\.se$/.test(args[0].toLowerCase())) {
            // Valid email
            for (let i in main.data.users) {
                if (main.data.users[i].email == args[0] && main.data.users[i].verified) {
                    message.channel.send(new Discord.RichEmbed({title:":x: E-post används redan"}));
                    return true;
                }
            }
            message.delete();
            new User(message.author.id).register(args[0].toLowerCase());
            main.mailTransport.sendMail({
                from: "TheDayDun@gmail.com",
                to: args[0],
                subject: "Mejl verifikation",
                text: "Det här är din e-postbekräftelsekod: " + getUser(message.author.id).code
            });
            message.channel.send(new Discord.RichEmbed({title:":white_check_mark: E-postbekräftelseskod skickad! Skriv __ks!verify <code>__ för att verifiera ditt konto."}));
            return true;
        } else {
            message.channel.send(new Discord.RichEmbed({title:":x: Ogiltig e-postadress. E-postadressen måste vara från skolan"}));
            return true;
        }
    },
};