const TelegramBot = require('node-telegram-bot-api');
const Web3 = require('web3');
require('dotenv').config();
const { ethers } = require('ethers');

// Telegram Bot Token (replace with your own token)
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Ethereum (ERC-20) configuration
const ethereumRpcUrl = process.env.ETHEREUM_RPC_URL; // mainnet
const ethereumProvider = new ethers.providers.JsonRpcProvider(ethereumRpcUrl);

// Binance Smart Chain (BEP-20) configuration
const bscRpcUrl = process.env.BSC_RPC_URL; // mainnet
const bscProvider = new ethers.providers.JsonRpcProvider(bscRpcUrl);

// Welcome message with a start button and description
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
  
    const welcomeMessage = `Welcome to the Crypto Wallet Bot! Here's what I can do for you:
  
  1. Generate ETH (ERC-20) wallet: Tap on 'Generate Ethereum Wallet.'
  2. Generate BSC (BEP-20) wallet: Tap 'Generate BSC Wallet.'
  3. Check wallet balances: Use the buttons below to check balances.
  
  Enjoy exploring the world of crypto wallets!`;
  
    // Define the menu keyboard
const menuKeyboard = {
    reply_markup: {
      keyboard: [
        [{ text: 'Generate Ethereum Wallet' }, { text: 'Generate BSC Wallet' }, { text: 'Check Balances' }],
      ],
      resize_keyboard: true,
    },
  };
  
    bot.sendMessage(chatId, welcomeMessage, menuKeyboard);
  });
  
  // Ethereum wallet generation
  bot.onText(/Generate Ethereum Wallet/i, (msg) => {
    const chatId = msg.chat.id;
    const wallet = ethers.Wallet.createRandom();
    const ethAddress = wallet.address;
    const ethPrivateKey = wallet.privateKey;
    const creationDate = new Date().toLocaleString();
  
    const message = `Here is a new ETH (ERC-20) wallet generated:
  
  📝 *ETH (ERC-20) Wallet*: \`${ethAddress}\`
  
  🔐 *Private Key*: \`${ethPrivateKey}\`
  
  🗓️ *Creation Date*: _${creationDate}_`;
  
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  });
  
  // Binance Smart Chain (BEP-20) wallet generation
  bot.onText(/Generate BSC Wallet/i, (msg) => {
    const chatId = msg.chat.id;
    const wallet = ethers.Wallet.createRandom({ path: "m/44'/60'/0'/0/0" }); 
    const bscAddress = wallet.address;
    const bscPrivateKey = wallet.privateKey;
    const creationDate = new Date().toLocaleString();
  
    const message = `Here is a new BSC (BEP-20) wallet generated:
  
  📝 *BSC (BEP-20) Wallet*: \`${bscAddress}\`
  
  🔐 *Private Key*: \`${bscPrivateKey}\`
  
  🗓️ *Creation Date*: _${creationDate}_`;
  
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  });
  
  // Inline keyboard for checking wallet balances
bot.onText(/Check Balances/i, (msg) => {
    const chatId = msg.chat.id;
  
    bot.sendMessage(chatId, 'Please send the address for which you want to check both ETH and BSC balances.');
  });

  // Handle incoming messages for checking balances
  bot.on('text', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
  
    // Check if the message contains an supported address
    if (text.match(/^0x[a-fA-F0-9]{40}$/)) {
      try {
        const ethBalance = await ethereumProvider.getBalance(text);
        const formattedEthBalance = (ethBalance / 1e18).toFixed(5);
  
        const bscBalance = await bscProvider.getBalance(text);
        const formattedBscBalance = (bscBalance / 1e18).toFixed(5);
  
        const message = `💵 Balances for ${text}:\n\n<b>ETH Balance:</b> ${formattedEthBalance} ETH\n<b>BSC Balance:</b> ${formattedBscBalance} BNB`;
        bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
      } catch (error) {
        bot.sendMessage(chatId, `Error: ${error.message}`);
      }
    }
  });
  
  // Handle the "Exit" button
  bot.onText(/Exit/i, (msg) => {
    const chatId = msg.chat.id;
    const message = 'You have exited the current operation.';
  
    bot.sendMessage(chatId, message, menuKeyboard);
  });
