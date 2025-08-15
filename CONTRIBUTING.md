# 🤝 Contributing to IPRAYS

Thank you for your interest in contributing to IPRAYS! This document provides guidelines for contributing to this open-source project.

## 🌟 Ways to Contribute

- 🐛 **Bug Reports**: Report bugs and issues
- ✨ **Feature Requests**: Suggest new features
- 💻 **Code Contributions**: Submit pull requests
- 📚 **Documentation**: Improve documentation
- 🎨 **UI/UX**: Design improvements
- 🧪 **Testing**: Add or improve tests

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Git
- MetaMask or compatible wallet
- Basic knowledge of React, TypeScript, and Solidity

### Setup Development Environment

1. **Fork the repository**
2. **Clone your fork:**
```bash
git clone https://github.com/yourusername/iprays-public.git
cd iprays-public
```

3. **Install dependencies:**
```bash
npm install
cd frontend && npm install
```

4. **Set up environment:**
```bash
cd frontend
cp env.example .env.local
# Edit .env.local with test configuration
```

5. **Start development server:**
```bash
npm run dev
```

## 📝 Development Guidelines

### Code Style
- **TypeScript**: Use TypeScript for all new code
- **ESLint**: Follow the existing ESLint configuration
- **Prettier**: Code formatting is handled by Prettier
- **Naming**: Use camelCase for variables and functions, PascalCase for components

### Commit Messages
Use conventional commit format:
```
type(scope): description

feat(canvas): add color picker component
fix(wallet): resolve connection issue
docs(readme): update installation instructions
test(contract): add rate limiting tests
```

**Types:**
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation
- `test`: Tests
- `refactor`: Code refactoring
- `style`: Code style changes
- `chore`: Maintenance tasks

### Branch Naming
- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `test/description` - Test additions

## 🔧 Development Workflow

### 1. Create a Branch
```bash
git checkout -b feature/amazing-new-feature
```

### 2. Make Changes
- Write clean, documented code
- Follow existing patterns
- Add tests for new functionality
- Update documentation as needed

### 3. Test Your Changes
```bash
# Run contract tests
npx hardhat test

# Run frontend tests
cd frontend && npm test

# Run linting
npm run lint

# Build to ensure no errors
npm run build
```

### 4. Commit Your Changes
```bash
git add .
git commit -m "feat(canvas): add amazing new feature"
```

### 5. Push and Create PR
```bash
git push origin feature/amazing-new-feature
```

Then create a Pull Request on GitHub.

## 🧪 Testing

### Smart Contract Tests
```bash
# Run all contract tests
npx hardhat test

# Run specific test file
npx hardhat test test/PlaceCanvas.test.cjs

# Test with gas reporting
REPORT_GAS=true npx hardhat test
```

### Frontend Tests
```bash
cd frontend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

### Manual Testing
1. Test wallet connection (MetaMask, WalletConnect)
2. Test pixel placement on different screen sizes
3. Verify rate limiting functionality
4. Test network switching
5. Verify responsive design

## 📋 Pull Request Process

### Before Submitting
- [ ] Code follows project style guidelines
- [ ] Tests are passing
- [ ] Documentation is updated
- [ ] Changes are backwards compatible
- [ ] No sensitive data is included

### PR Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Other (please describe)

## Testing
- [ ] Tests pass locally
- [ ] Added tests for new functionality
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots for UI changes

## Additional Notes
Any additional information for reviewers
```

### Review Process
1. **Automated Checks**: CI/CD pipeline runs tests
2. **Code Review**: Core maintainers review code
3. **Testing**: Changes are tested on testnet
4. **Merge**: Approved PRs are merged to main

## 🐛 Bug Reports

### Before Reporting
- Check existing issues
- Try reproducing on latest version
- Test on different browsers/devices

### Bug Report Template
```markdown
**Describe the Bug**
Clear description of what the bug is

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected Behavior**
What you expected to happen

**Screenshots**
Add screenshots if applicable

**Environment:**
- OS: [e.g. iOS]
- Browser [e.g. chrome, safari]
- Version [e.g. 22]
- Wallet [e.g. MetaMask]

**Additional Context**
Add any other context about the problem
```

## 💡 Feature Requests

### Feature Request Template
```markdown
**Is your feature request related to a problem?**
Clear description of the problem

**Describe the solution you'd like**
Clear description of what you want to happen

**Describe alternatives you've considered**
Alternative solutions or features considered

**Additional context**
Add any other context or screenshots
```

## 🏗️ Architecture Guidelines

### Smart Contracts
- Use OpenZeppelin libraries
- Follow upgrade patterns (UUPS proxy)
- Include comprehensive tests
- Gas optimization considerations
- Security best practices

### Frontend
- React functional components with hooks
- TypeScript for type safety
- Responsive design (mobile-first)
- Error handling and loading states
- Accessibility considerations

### Irys Integration
- Use official Irys SDK
- Handle network errors gracefully
- Implement proper retry mechanisms
- Validate data before upload

## 🔐 Security Considerations

### Do NOT Include
- Private keys or secrets
- Real wallet addresses in tests
- API keys or credentials
- Production configuration

### Security Review
- All crypto operations are reviewed
- Smart contract changes require extra scrutiny
- Follow security best practices
- Use official libraries and patterns

## 📞 Getting Help

- 💬 **Discord**: [Join our community](https://discord.gg/yourserver)
- 📧 **Email**: developers@yourproject.com
- 📖 **Documentation**: Check README and docs/
- 🐛 **Issues**: Create GitHub issues for bugs

## 🎉 Recognition

Contributors will be recognized in:
- README contributor section
- Release notes
- Community Discord
- Annual contributor report

Thank you for contributing to IPRAYS! 🎨