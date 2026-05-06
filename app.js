import dotenv from "dotenv";
import { App } from "@slack/bolt";
import express from "express";

dotenv.config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

const TARGET_PRODUCT_NAME = "[CH] [Assistfit 단독] 토스 프론트 렌탈";
const sent = new Set();

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTextFromSlackMessage(message) {
  const parts = [
    message.text || "",
    JSON.stringify(message.blocks || []),
    JSON.stringify(message.attachments || []),
  ];

  return normalizeText(parts.join(" "));
}

app.event("message", async ({ event, client, logger }) => {
  try {
    console.log("메시지 이벤트 들어옴");
    console.log(JSON.stringify(event, null, 2));

    const message = event;

    // 내 알림봇이 직접 쓴 메시지는 무시해서 무한 반복 방지
    if (
      message.bot_profile?.name === "어시스트핏 알림봇" ||
      message.username === "어시스트핏 알림봇"
    ) {
      return;
    }

    const text = extractTextFromSlackMessage(message);

    console.log("최종 텍스트:", text);

    if (!text.includes(TARGET_PRODUCT_NAME)) {
      return;
    }

    const threadTs = message.thread_ts || message.ts;
    const key = `${message.channel}-${threadTs}-${TARGET_PRODUCT_NAME}`;

    if (sent.has(key)) {
      return;
    }

    await client.chat.postMessage({
 	 channel: message.channel,
  	thread_ts: threadTs,
  	text: `:warning: *어시스트핏 주문 건 진행 참고*

	• VAN 등록: *KSNET* 진행 필요
	• 플러그인 적용: 토플파 *[어시스트핏-출석앱]* 적용 필요
<@U090RUENTS4> 참고 부탁드립니다 🙏`,
});

    sent.add(key);
  } catch (error) {
    logger.error(error);
  }
});

const receiverApp = express();

receiverApp.get("/", (req, res) => {
  res.send("Slack bot is running");
});

const PORT = process.env.PORT || 3000;

receiverApp.listen(PORT, async () => {
  await app.start();

  console.log(`✅ Slack alert running on port ${PORT}`);
  console.log("✅ Bot connected successfully");

  app.client.auth.test({
    token: process.env.SLACK_BOT_TOKEN,
  }).then((res) => {
    console.log("✅ BOT INFO:", res.user, res.team);
  }).catch((err) => {
    console.log("❌ BOT AUTH ERROR:", err);
  });
});