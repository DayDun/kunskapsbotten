const main = require("../../main");

module.exports.eval = {
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