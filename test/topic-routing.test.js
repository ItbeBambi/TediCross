const assert = require("node:assert/strict");
const test = require("node:test");
const { Bridge } = require("../dist/bridgestuff/Bridge");
const { BridgeMap } = require("../dist/bridgestuff/BridgeMap");
const { bridgesForTelegramTopic } = require("../dist/bridgestuff/TopicRouting");

const telegramTopicId = 130698;
const discordChannelId = "1567394966836351047";
const bridge = new Bridge({
	name: "NEBPAH-Bridge-Lab",
	direction: "both",
	topicOnly: true,
	topicBridgesAutoCreate: false,
	topicBridges: [{ name: "Bridge-Lab", telegram: telegramTopicId, discord: discordChannelId }],
	telegram: {
		chatId: -1002634606116,
		sendUsernames: true,
		relayJoinMessages: false,
		relayLeaveMessages: false,
		crossDeleteOnDiscord: false
	},
	discord: {
		channelId: discordChannelId,
		sendUsernames: true,
		relayJoinMessages: false,
		relayLeaveMessages: false,
		crossDeleteOnTelegram: false,
		useEmbeds: "auto"
	}
});

test("Telegram allows only the configured topic", () => {
	const allowed = bridgesForTelegramTopic([bridge], telegramTopicId);
	assert.equal(allowed.length, 1);
	assert.equal(allowed[0].tgThread, telegramTopicId);
	assert.deepEqual(bridgesForTelegramTopic([bridge], 999999), []);
	assert.deepEqual(bridgesForTelegramTopic([bridge], undefined), []);
});

test("Discord allows only the configured topic mapping", () => {
	const map = new BridgeMap([bridge]);
	const allowed = map.fromDiscordChannelId(discordChannelId);
	assert.equal(allowed.length, 1);
	assert.equal(allowed[0].tgThread, telegramTopicId);
	assert.deepEqual(map.fromDiscordChannelId("999999999999999999"), []);
});
