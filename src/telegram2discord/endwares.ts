};

/**
 * Replies to a command with info about the chat
 *
 * @param ctx	The Telegraf context
 */
export const chatinfo = (ctx: Context) => {
	// Reply with the info
	ctx.reply(`chatID: ${ctx.message?.chat.id}`)
		// Wait some time
		.then(sleepOneMinute)
		// Delete the info and the command
		.then(message =>
			Promise.all([
				// Delete the info
				deleteMessage(ctx, message),
				// Delete the command
				ctx.deleteMessage()
			])
		)
		.catch(ignoreAlreadyDeletedError as any);
};

/**
 * Replies to a command with info about the thread
 *
 * @param ctx	The Telegraf context
 */
export const threadinfo = (ctx: Context) => {
	// Reply with the info
	if (ctx.message?.message_thread_id) {
		ctx.reply(`chatID: ${ctx.message.chat?.id}\nthreadID: ${ctx.message.message_thread_id}`)
			// Wait some time
			.then(sleepOneMinute)
			// Delete the info and the command
			.then(message =>
				Promise.all([
					// Delete the info
					deleteMessage(ctx, message),
					// Delete the command
					ctx.deleteMessage()
				])
			)
			.catch(ignoreAlreadyDeletedError as any);
	} else {
		ctx.reply(`Unable to detect threadID - call /threadinfo command from target thread's chat`)
			// Wait some time
			.then(sleepOneMinute)
			// Delete the info and the command
			.then(message =>
				Promise.all([
					// Delete the info
					deleteMessage(ctx, message),
					// Delete the command
					ctx.deleteMessage()
				])
			)
			.catch(ignoreAlreadyDeletedError as any);
	}
};

/**
 * Handles users joining chats
 *
 * @param ctx The Telegraf context
 * @param ctx.tediCross.message The Telegram message received
 * @param ctx.tediCross.message.new_chat_members List of the users who joined the chat
 * @param ctx.TediCross The global TediCross context of the message
 */
export const newChatMembers = createMessageHandler((ctx: TediCrossContext, bridge: any) =>
	// Notify Discord about each user
	R.forEach(user => {
		// Make the text to send
		const from = createFromObjFromUser(user as User);
		const text = `**${from.firstName} (${R.defaultTo(
			"No username",
			from.username
		)})** joined the Telegram side of the chat`;

		// Pass it on
		ctx.TediCross.dcBot.ready
			.then(() => fetchDiscordChannel(ctx.TediCross.dcBot, bridge).then((channel: any) => channel.send(text)))
			.catch((err: any) =>
				ctx.TediCross.logger.error(
					`Could not tell Discord about a new chat member on bridge ${bridge.name}: ${err.message}`
				)
			);
	})(ctx.tediCross.message.new_chat_members)
);

/**
 * Handles users leaving chats
 *
 * @param ctx The Telegraf context
 * @param ctx.tediCross The TediCross context of the message
 * @param ctx.tediCross.message The Telegram message received
 * @param ctx.tediCross.message.left_chat_member The user object of the user who left
 * @param ctx.TediCross The global TediCross context of the message
 */
export const leftChatMember = createMessageHandler((ctx: TediCrossContext, bridge: any) => {
	// Make the text to send
	const from = createFromObjFromUser(ctx.tediCross.message.left_chat_member);
	const text = `**${from.firstName} (${R.defaultTo(
		"No username",
		from.username
	)})** left the Telegram side of the chat`;

	// Pass it on
	ctx.TediCross.dcBot.ready
		.then(() => fetchDiscordChannel(ctx.TediCross.dcBot, bridge).then(channel => channel.send(text)))
		.catch((err: any) =>
			ctx.TediCross.logger.error(
				`Could not tell Discord about a chat member who left on bridge ${bridge.name}: ${err.message}`
			)
		);
});

const parseMediaGroup = (ctx: TediCrossContext, byTimer: boolean = false) => {
	//ctx.TediCross.logger.info(ctx.tediCross.message.media_group_id, byTimer);

	const groupIdMap = ctx.TediCross.groupIdMap;
	const groupId = ctx.tediCross.message.media_group_id;

	if (byTimer) {
		if (groupIdMap.has(groupId)) {
			const ctxArray = groupIdMap.get(groupId);
			groupIdMap.delete(groupId);
			if (ctxArray) {
				// Telegram delivers each album item as a separate update. Processing can
				// complete out of order, so restore the album's original message order.
				ctxArray.sort(
					(a: TediCrossContext, b: TediCrossContext) =>
						Number(a.tediCross.messageId) - Number(b.tediCross.messageId)
				);
				//ctx.TediCross.logger.info(`Array Length: ${ctxArray.length}`);
				const comboCtx: TediCrossContext = ctxArray[0];
				comboCtx.tediCross.hasMediaGroup = true;
				const prepared = comboCtx.tediCross.prepared[0];
				prepared.files = [];
				prepared.sourceMessageIds = ctxArray
					.map((item: TediCrossContext) => item.tediCross.messageId)
					.filter((id: string | number | undefined) => id !== undefined)
					.map(String);
				const contentTexts: string[] = [];
				const mediaNotices = new Map<string, string>();

				for (const lCtx of ctxArray) {
					const lPrepared = lCtx.tediCross.prepared[0];
					if (lPrepared.header) {
						prepared.header = lPrepared.header;
					}
					if (lPrepared.hasLinks) {
						prepared.hasLinks = lPrepared.hasLinks;
					}
					if (lPrepared.contentText !== undefined) {
						if (lPrepared.contentText) contentTexts.push(lPrepared.contentText);
						if (lPrepared.mediaNotice) {
							mediaNotices.set(lPrepared.mediaNoticeKey || lPrepared.mediaNotice, lPrepared.mediaNotice);
						}
					} else if (lPrepared.text) {
						contentTexts.push(lPrepared.text);
					}
					if (lPrepared.file?.attachment) {
						prepared.files.push(lPrepared.file);
					}
				}
				prepared.contentText = contentTexts.join("\n");
				prepared.mediaNotice = [...mediaNotices.values()].join("\n");
				prepared.text = [prepared.contentText, prepared.mediaNotice].filter(Boolean).join("\n");

				//ctx.TediCross.logger.info(`Files Array Length: ${prepared.files.length}`);

				relayMessage(comboCtx);
			}
		} else {
			//ctx.TediCross.logger.info(`No groupId: ${groupId}`);
			return;
		}
	} else {
		let ctxArray: TediCrossContext[] | undefined;
		ctxArray = groupIdMap.get(groupId);
		if (!ctxArray) ctxArray = [];
		ctxArray.push(ctx);
		groupIdMap.set(groupId, ctxArray);
	}
};

/**
 * Relays a message from Telegram to Discord
 *
 * @param ctx The Telegraf context
