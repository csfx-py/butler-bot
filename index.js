require("dotenv").config();
const app = require("express")();
const URL = process.env.URL || `https://${process.env.APP_NAME}.herokuapp.com`;
const PORT = process.env.PORT || 3000;

const { Telegraf } = require("telegraf");

const axios = require("axios");

const translate = require("translate-google");
const langCode = require("./util/langCode");

const qr = require("qrcode");

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.telegram.setWebhook(`${URL}/bot${process.env.BOT_TOKEN}`);
app.use(bot.webhookCallback(`/bot${process.env.BOT_TOKEN}`));

const TC_TOKENS = process.env.TC_TOKENS.split(" ");
const TC_TOKENS_N = TC_TOKENS.length;
let tc_index = 0;
let usage = 0;

TC_URL = "https://webapi-noneu.truecaller.com";
const axiosTC = axios.create({
  baseURL: TC_URL,
});

bot.start((ctx) => ctx.reply(`Hello ${ctx.from.first_name}`));

bot.help((ctx) =>
  ctx.reply(
    `
/start - Start the bot\n
/help - Show this help\n
/phone <10 digit number> - Get the phone number details\n
/translate $<optional from> $<to> <text> - Translate the text. Default <from> is auto detect and <to> is en.
example: /translate $english $hindi hello, how are you?\n
/wifi <ssid> <password> <optional auth-type> - Create qr code to connect wifi. Default <auth type> is WPA/WPA2, You can pass "WEP" or "none" if required. \n
Nothing is stored by the bot, the source code is available on https://github.com/csfx-py/butler-bot\n
Consider giving a star on github if you like this bot.`,
    // disable link previews
    { disable_web_page_preview: true }
  )
);
bot.on("sticker", (ctx) => ctx.reply("👍"));
bot.hears("hi", (ctx) => ctx.reply("Hey there"));

// bot command to get 10 digit phone number
bot.command("phone", async (ctx) => {
  // get the phone number from the user
  const phone = ctx.message.text.split(" ")[1];
  // check if the phone number is 10 digits
  if (phone.length !== 10 || isNaN(phone)) {
    return ctx.reply("Please enter a valid 10 digit phone number");
  }

  try {
    const res = await axiosTC.get("/search", {
      params: {
        countryCode: "in",
        q: phone,
      },
      headers: {
        authorization: `Bearer ${TC_TOKENS[tc_index]}`,
      },
    });
    usage++;
    if (usage == 5) {
      usage = 0;
      tc_index = (tc_index + 1) % TC_TOKENS_N;
    }

    return ctx.reply(
      `Name: ${res.data.name}\n
      Business account? ${res.data.isBusiness ? "Yes" : "No"}\n
      Private account? ${res.data.isPrivate ? "Yes" : "No"}\n
      Image: ${res.data.image}\n
      Phones: ${res.data.phones.map((phone) => phone.number).join(", ")}\n
      Provider: ${res.data.phones.map((phone) => phone.info).join(", ")}\n
      Address: ${res.data.addresses
        ?.map((address) => address.address)
        .join("\n")}\n
      Email: ${res.data.email?.email ? res.data.email.email : "N/A"}\n
      Facebook: ${res.data.facebook?.uri ? res.data.facebook.uri : "N/A"}\n
      Twitter: ${res.data.twitter?.uri ? res.data.twitter.uri : "N/A"}\n`
    );
  } catch (error) {
    console.log(error);
    if (error.response?.status === 429)
      return ctx.reply("TrueCaller API rate limit exceeded");
    return ctx.reply("Something went wrong");
  }
});

bot.command("translate", async (ctx) => {
  let from, to, text;
  if (
    ctx.message.text.split(" ")[1].startsWith("$") &&
    ctx.message.text.split(" ")[2].startsWith("$")
  ) {
    from = ctx.message.text.split(" ")[1].substring(1);
    to = ctx.message.text.split(" ")[2].substring(1);
    text = ctx.message.text.split(" ").slice(3).join(" ");
  } else if (
    ctx.message.text.split(" ")[1].startsWith("$") &&
    !ctx.message.text.split(" ")[2].startsWith("$")
  ) {
    from = "Automatic";
    to = ctx.message.text.split(" ")[1].substring(1);
    text = ctx.message.text.split(" ").slice(2).join(" ");
  } else {
    from = "Automatic";
    to = "English";
    text = ctx.message.text.split(" ").slice(1).join(" ");
  }

  from = langCode(from.charAt(0).toUpperCase() + from.slice(1));
  to = langCode(to.charAt(0).toUpperCase() + to.slice(1));

  try {
    const res = await translate(text, { from, to });
    return ctx.reply(res);
  } catch (error) {
    console.log(error);
    return ctx.reply("Something went wrong");
  }
});

// /wifi command to generate a qr code
bot.command("wifi", async (ctx) => {
  const ssid = ctx.message.text.split(" ")[1];
  const password = ctx.message.text.split(" ")[2];
  let auth = ctx.message.text.split(" ")[3]?.toLowerCase() || "wpa";
  if (!ssid || !password) {
    return ctx.reply("Please enter a wifi name and password");
  }

  if (auth !== "wpa" && auth !== "wep" && auth !== "none") {
    return ctx.reply("Please enter a valid auth type");
  }

  try {
    const qrCode = await qr.toDataURL(
      `WIFI:T:${auth};S:${ssid};P:${password};;`,
      {
        errorCorrectionLevel: "Q",
      }
    );
    // delete previous message
    ctx.deleteMessage();
    return ctx.replyWithPhoto({
      source: Buffer.from(qrCode.split(",")[1], "base64"),
    });
  } catch (error) {
    console.log(error);
    return ctx.reply("Something went wrong");
  }
});

bot.launch();

app.get("/", (req, res) => {
  res.send("Hello!");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
