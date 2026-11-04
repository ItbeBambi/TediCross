
async function makeDiscordMention(username: string, dcBot: Client, bridge: Bridge) {
    try {
        const channel = await fetchDiscordChannel(
            dcBot,
            bridge,
            bridge.tgThread
        );

        const dcUser = await channel.members.find(
            R.propEq(username, "displayName")
        );

        return dcUser ? `<@${dcUser.id}>` : username;
    } catch {
        return username;
    }
}
