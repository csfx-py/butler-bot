# Telegram bot

## Prerequisites
- [Node.js](https://nodejs.org/en/)
- [npm](https://www.npmjs.com/)
- [Telegram](https://telegram.org/)

### Steps to make it work
- Clone the repository
- Install the dependencies using `yarn` or `npm i`
- Create .env file with your Telegram bot token `BOT_TOKEN` 
- Add `TC_TOKENS` to your .env file with your TrueCaller token (yes, multiple space seperated tokens are allowed)
- Run the bot using `yarn dev` or `npm run dev` for development and `yarn start` or `npm start` for production
- Find your bot in the Telegram bot list, start a conversation with it and type `/start`

## Features
- Can find user details by phone number using truecaller
- Can translate text using Google Translate