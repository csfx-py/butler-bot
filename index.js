require("dotenv").config();
const { Telegraf } = require("telegraf");
const axios = require("axios");

const bot = new Telegraf(process.env.BOT_TOKEN);

const TC_TOKENS = process.env.TC_TOKENS.split(" ");
const TC_TOKENS_N = TC_TOKENS.length;
let tc_index = 0;
let usage = 0;

TC_URL = "https://webapi-noneu.truecaller.com";
const axiosTC = axios.create({
  baseURL: TC_URL,
  headers: {
    authorization: `Bearer ${TC_TOKENS[tc_index]}`,
  },
});

bot.start((ctx) => ctx.reply("Welcome"));
bot.help((ctx) =>
  ctx.reply(`
/start - Start the bot\n
/help - Show this help\n
/phone <10 digit number> - Get the phone number details`)
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
    });
    usage++;
    if(usage == 5){
      usage = 0;
      tc_index = (tc_index + 1) % TC_TOKENS_N;
    }

    return ctx.reply(
      `Name: ${res.data.name}\n
    Business account? ${res.data.isBusiness}\n
    Private account? ${res.data.isPrivate}\n
    Image: ${res.data.image}\n
    Phones: ${res.data.phones.map((phone) => phone.number).join(", ")}\n
    Provider: ${res.data.phones.map((phone) => phone.info).join(", ")}\n
    Address: ${res.data.addresses
      .map((address) => address.address)
      .join("\n")}\n
    Email: ${res.data.email.email}\n
    Facebook: ${res.data.facebook.uri}\n
    Twitter: ${res.data.twitter.uri}\n`
    );
  } catch (error) {
    console.log(error);
    if (error.response.status === 429)
      return ctx.reply("TrueCaller API rate limit exceeded");
    return ctx.reply("Something went wrong");
  }
});

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
