require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // Irys Testnet
    irysTestnet: {
      url: process.env.IRYS_TESTNET_RPC || "https://testnet-rpc.irys.xyz/v1/execution-rpc",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 1270,
      gas: 'auto',
      gasPrice: 'auto',
      gasMultiplier: 1.2,
    },
    // Irys Mainnet (when available)
    irysMainnet: {
      url: process.env.IRYS_MAINNET_RPC || "https://rpc.irys.xyz/v1/execution-rpc",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 1270, // Same as testnet for now
      gas: 'auto',
      gasPrice: 'auto',
      gasMultiplier: 1.2,
    },
    // Local development
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
  },
  etherscan: {
    apiKey: {
      // Add API keys for contract verification
      irysTestnet: process.env.ETHERSCAN_API_KEY || "your-api-key-here",
    },
    customChains: [
      {
        network: "irysTestnet", 
        chainId: 1270,
        urls: {
          apiURL: "https://testnet-explorer.irys.xyz/api",
          browserURL: "https://testnet-explorer.irys.xyz"
        }
      }
    ]
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 40000,
  },
};

// IMPORTANT: This is a template file!
// Copy this to hardhat.config.cjs and configure with your actual values
// Never commit sensitive information like private keys to the repository