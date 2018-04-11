const main = require("../../main");
const COLOR = main.color;

module.exports = {
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
            new main.PageMenu(message.channel, message.author, pages);
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
    },
};