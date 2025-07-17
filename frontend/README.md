# XeyaRetirement Frontend

A modern, responsive React application for the XeyaRetirement DeFi Retirement Calculator. Built with TypeScript, Tailwind CSS, and React best practices.

## Features

- **Modern UI/UX**: Beautiful, responsive design with glassmorphic effects and smooth animations
- **Wallet Integration**: Seamless MetaMask connection with real-time status updates
- **Retirement Calculator**: Advanced calculation engine with inflation and yield rate considerations
- **Interactive Dashboard**: Real-time progress tracking and payment status
- **Dark Mode Ready**: Built with dark mode support (ready for toggle implementation)
- **Mobile Responsive**: Optimized for all device sizes
- **TypeScript**: Full type safety and better development experience

## Tech Stack

- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Context API** for state management
- **MetaMask** integration for wallet connectivity

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MetaMask browser extension

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm start
   ```

3. **Open your browser**:
   Navigate to `http://localhost:3000`

### Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App

## Project Structure

```
src/
├── components/
│   ├── ui/           # Reusable UI components
│   ├── retirement/      # Retirement-related components
│   └── wallet/       # Wallet-related components
├── context/          # React Context providers
├── hooks/            # Custom React hooks
├── utils/            # Utility functions
└── App.tsx           # Main application component
```

## Components

### WalletConnect
- MetaMask integration
- Connection status display
- Error handling
- Disconnect functionality

### RetirementCalculator
- Form validation
- Real-time calculations
- Loading states
- Results display

### RetirementDashboard
- Progress tracking
- Payment status
- Quick actions
- Responsive design

### Header
- Navigation
- Wallet status indicator
- Smooth scrolling
- Responsive design

## Features in Detail

### Retirement Calculation
The calculator uses advanced financial formulas to determine required investment:

1. **Present Value Calculation**: Each future monthly payment is discounted to present value
2. **Inflation Adjustment**: Monthly spending amounts are adjusted for inflation
3. **Yield Rate Integration**: Uses real yield rate (nominal - inflation)
4. **Life Expectancy**: Considers total retirement period

### Wallet Integration
- Automatic account detection
- Network change handling
- Connection persistence
- Error recovery

### Responsive Design
- Mobile-first approach
- Tablet and desktop optimizations
- Touch-friendly interactions
- Adaptive layouts

## Styling

The application uses Tailwind CSS with:
- Custom color schemes
- Gradient backgrounds
- Glassmorphic effects
- Smooth transitions
- Dark mode support (ready)

## Future Enhancements

- Dark mode toggle
- Contract integration
- Real-time data updates
- Advanced charts and graphs
- Export functionality
- Multi-language support

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For support or questions, please open an issue in the repository.
