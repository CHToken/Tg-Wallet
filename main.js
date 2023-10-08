const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();
const { ethers } = require('ethers');
const mongoose = require('mongoose');

// MongoDB setup
try {
  mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('Connected to MongoDB');
} catch (error) {
  console.error('Error connecting to MongoDB:', error.message);
}

const User = mongoose.model('User', {
  telegramId: String,
  wallets: [
    {
      name: String,
      ethWalletAddress: String,
      bscWalletAddress: String,
    },
  ],
});

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Ethereum (ERC-20) configuration
const ethereumRpcUrl = process.env.ETHEREUM_RPC_URL;
const ethereumProvider = new ethers.providers.JsonRpcProvider(ethereumRpcUrl);

// Binance Smart Chain (BEP-20) configuration
const bscRpcUrl = process.env.BSC_RPC_URL;
const bscProvider = new ethers.providers.JsonRpcProvider(bscRpcUrl);

// Command to start the bot
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  const welcomeMessage = `Welcome to the Crypto Wallet Bot! Here's what I can do for you:

1. Create Wallet
2. Check Balances
3. Delete Wallet
4. Transfer Funds
5. Recieve Funds`;

const options = {
    reply_markup: {
      keyboard: [
        ['Create Wallet', 'Check Balances'],
        ['Delete Wallet', 'Exit'],
      ],
      resize_keyboard: true,
    },
  };

  bot.sendMessage(chatId, welcomeMessage, options);
});

// Handler for creating a multi-chain wallet
bot.onText(/Create Wallet/i, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Enter a name for your new wallet:').then((response) => {
    bot.once('text', async (nameMsg) => {
      const walletName = nameMsg.text;
      const mnemonic = ethers.Wallet.createRandom().mnemonic.phrase;
      const privateKey = ethers.Wallet.fromMnemonic(mnemonic).privateKey;
      const ethWallet = new ethers.Wallet(privateKey, ethereumProvider);
      const bscWallet = new ethers.Wallet(privateKey, bscProvider);
      const creationDate = new Date().toLocaleString();
      
      const message = `Multi-chain wallet "${walletName}" created successfully.\n\n` +
        `📝 *Wallet Name*: \`${walletName}\`\n` +
        `📬 *Ethereum (ETH) Address*: \`${ethWallet.address}\`\n` +
        `📬 *Binance Smart Chain (BSC) Address*: \`${bscWallet.address}\`\n` +
        `🔐 *Private Key*: \`${privateKey}\`\n` +
        `📝 *Mnemonic Phrase*: \`${mnemonic}\`\n\n` +
        `🔐 *Creation Date*: \`${creationDate}\``;

      bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });
  });
});

// Handler for checking balances
bot.onText(/Check Balances/i, async (msg) => {
  const chatId = msg.chat.id;
  const walletNames = await listWallets(chatId);

  if (walletNames.length === 0) {
    bot.sendMessage(chatId, "You haven't created any wallets yet.");
  } else {
    const options = {
      reply_markup: {
        keyboard: walletNames.map((name) => [{ text: name }]),
        resize_keyboard: true,
      },
    };
    bot.sendMessage(chatId, 'Select a wallet to check its balance:', options).then((response) => {
      bot.once('text', async (selectedWalletMsg) => {
        const selectedWalletName = selectedWalletMsg.text;
        const user = await User.findOne({ telegramId: chatId });
        const selectedWallet = user.wallets.find((wallet) => wallet.name === selectedWalletName);

        if (selectedWallet) {
          const ethBalance = await ethereumProvider.getBalance(selectedWallet.ethWalletAddress);
          const formattedEthBalance = (ethBalance / 1e18).toFixed(5);

          const bscBalance = await bscProvider.getBalance(selectedWallet.bscWalletAddress);
          const formattedBscBalance = (bscBalance / 1e18).toFixed(5);

          const message = `💵 Balances for wallet "${selectedWalletName}":\n\n` +
            `<b>ETH Balance:</b> ${formattedEthBalance} ETH\n` +
            `<b>BSC Balance:</b> ${formattedBscBalance} BNB`;

          const exitButton = {
            text: 'Exit',
          };

          const keyboardMarkup = {
            reply_markup: {
              keyboard: walletNames.map((name) => [{ text: name }]).concat([[exitButton]]),
              resize_keyboard: true,
            },
          };

          bot.sendMessage(chatId, message, { parse_mode: 'HTML', ...keyboardMarkup });
        } else {
          bot.sendMessage(chatId, `Wallet "${selectedWalletName}" not found.`);
        }
      });
    });
  }
});

// Handler for deleting a wallet
bot.onText(/Delete Wallet/i, async (msg) => {
  const chatId = msg.chat.id;
  const walletNames = await listWallets(chatId);

  if (walletNames.length === 0) {
    bot.sendMessage(chatId, "You haven't created any wallets yet.");
  } else {
    const options = {
      reply_markup: {
        keyboard: walletNames.map((name) => [{ text: name }]),
        resize_keyboard: true,
      },
    };
    bot.sendMessage(chatId, 'Select a wallet to delete:', options).then((response) => {
      bot.once('text', async (deleteMsg) => {
        const walletNameToDelete = deleteMsg.text;
        await deleteWallet(chatId, walletNameToDelete);
        bot.sendMessage(chatId, `Wallet "${walletNameToDelete}" has been deleted.`);
      });
    });
  }
});

// Function to create a multi-chain wallet
async function createWallet(chatId, walletName, ethWalletAddress, bscWalletAddress, privateKey) {
  const newWallet = {
    name: walletName,
    ethWalletAddress: ethWalletAddress,
    bscWalletAddress: bscWalletAddress,
  };

  await User.findOneAndUpdate({ telegramId: chatId }, { $push: { wallets: newWallet } }, { upsert: true });

  return newWallet;
}

// Function to list wallet names
async function listWallets(chatId) {
  const user = await User.findOne({ telegramId: chatId });
  if (user) {
    const walletNames = user.wallets.map((wallet) => wallet.name);
    return walletNames;
  }
  return [];
}

// Function to delete a wallet
async function deleteWallet(chatId, walletNameToDelete) {
  await User.findOneAndUpdate(
    { telegramId: chatId },
    { $pull: { wallets: { name: walletNameToDelete } } }
  );
}

// Handle the "Exit" button
bot.onText(/Exit/i, (msg) => {
  const chatId = msg.chat.id;
  const message = 'You have exited the current operation.';
  
  const keyboardMarkup = {
    reply_markup: {
      remove_keyboard: true, 
    },
  };

  bot.sendMessage(chatId, message, keyboardMarkup);
});