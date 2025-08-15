# 🎨 Irys Canvas - Decentralized Pixel Art Platform

A community-driven pixel art canvas built on the Irys blockchain, enabling users to collaboratively create digital art while permanently storing it on-chain.

## ✨ Features

- **Decentralized Canvas**: Collaborative pixel art creation
- **Blockchain Storage**: Permanent storage via Irys network
- **Rate Limiting**: Built-in spam protection
- **Web3 Integration**: MetaMask and WalletConnect support
- **Real-time Updates**: Live canvas synchronization
- **Mobile Responsive**: Works on all devices

## 🏗️ Architecture

### Smart Contracts
- **PlaceCanvas.sol**: Main canvas contract with upgradeable proxy pattern
- **ProgrammableData.sol**: Irys blockchain integration library
- Built with OpenZeppelin security standards

### Frontend
- **React + TypeScript**: Modern web development stack
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: High-quality UI components
- **Ethers.js**: Ethereum wallet interaction
- **@irys/sdk**: Irys network integration

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- MetaMask or compatible wallet

### Frontend Development
```bash
# Clone the repository
git clone https://github.com/yourusername/irys-canvas-public.git
cd irys-canvas-public

# Install dependencies
npm install

# Set up environment
cd frontend
cp env.example .env.local
# Edit .env.local with your configuration

# Start development server
npm run dev
```

### Smart Contract Development
```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to testnet (requires private deployment setup)
# See deployment repository for instructions
```

## ⚙️ Configuration

### Environment Variables

Copy `frontend/env.example` to `frontend/.env.local` and configure:

```bash
# Network Configuration
VITE_IRYS_NETWORK=testnet
VITE_CHAIN_ID=1270

# Contract Addresses (deployed contract addresses)
VITE_CONTRACT_ADDRESS=your_contract_address
VITE_IMPLEMENTATION_ADDRESS=your_implementation_address

# WalletConnect (get from https://cloud.walletconnect.com/)
VITE_WALLETCONNECT_PROJECT_ID=your_project_id

# Optional: Custom RPC endpoints
VITE_IRYS_RPC=https://testnet-rpc.irys.xyz/v1/execution-rpc
```

## 🧪 Testing

```bash
# Run smart contract tests
npx hardhat test

# Run frontend tests
cd frontend
npm test

# Run with coverage
npm run test:coverage
```

## 📱 Usage

1. **Connect Wallet**: Click "Connect Wallet" to connect MetaMask or WalletConnect
2. **Switch Network**: App will prompt to switch to Irys Testnet
3. **Place Pixels**: Click on canvas to place colored pixels
4. **View Transactions**: Monitor your pixel placements on Irys Explorer

## 🛠️ Development

### Project Structure
```
irys-canvas-public/
├── contracts/              # Smart contracts
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utility libraries
│   │   └── config/        # Configuration files
│   └── public/            # Static assets
├── test/                  # Contract tests
└── docs/                  # Documentation
```

### Key Components
- **EnhancedPixelCanvas**: Main canvas component
- **WalletConnect**: Web3 wallet integration
- **IrysIntegration**: Irys network interaction
- **usePixelPlacement**: Pixel placement logic hook
- **useWalletIntegration**: Wallet connection management

## 🔧 Built With

- [Irys](https://irys.xyz/) - Permanent data storage
- [Hardhat](https://hardhat.org/) - Ethereum development environment  
- [React](https://reactjs.org/) - Frontend framework
- [Vite](https://vitejs.dev/) - Build tool
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Ethers.js](https://ethers.org/) - Ethereum library
- [OpenZeppelin](https://openzeppelin.com/) - Smart contract security

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Irys Documentation](https://docs.irys.xyz/)
- [Irys Testnet Explorer](https://testnet-explorer.irys.xyz/)
- [Frontend Demo](https://your-demo-link.vercel.app/)

## 🆘 Support

- 📧 Email: support@yourproject.com
- 💬 Discord: [Join our community](https://discord.gg/yourserver)
- 🐦 Twitter: [@YourProject](https://twitter.com/yourproject)

---

⚠️ **Note**: This is the public repository containing source code only. For deployment instructions and production configuration, authorized developers should refer to the private deployment repository.