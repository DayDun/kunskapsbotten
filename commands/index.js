module.exports = {
    help: require("./commands/help"),
    register: require("./commands/register"),
    verify: require("./commands/verify"),
    stats: require("./commands/stats"),
    balance: require("./commands/balance").balance,
    setbalance: require("./commands/balance").setbalance,
    leaderboard: require("./commands/leaderboard").leaderboard,
    daily: require("./commands/leaderboard").daily,    
    slots: require("./commands/leaderboard").slots,
    eval: require("./commands/admin").eval,
}