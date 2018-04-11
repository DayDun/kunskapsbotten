const main = require("../../main");

module.exports = {
    usage: "register <email>",
    use: function(args, message) {
        if (message.author.id in main.data.users && main.data.users[message.author.id].verified) {
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
            let newData = main.data.users[message.author.id] = {
                email: args[0],
                code: Math.floor(1000 + Math.random() * 9000),
                verified: false,
                balance: 0,
                xp: 0,
                level: 0
            };
            saveData(newData);
            main.mailTransport.sendMail({
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
    },
};