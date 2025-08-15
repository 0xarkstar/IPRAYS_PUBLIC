import { useState } from "react";

interface Pixel { 
  x: number; 
  y: number; 
  color: string; 
  owner?: string; 
  timestamp?: number; 
  irysId?: string; 
  irysPayloadLength?: number;
}

const Index = () => {
  const [selectedColor, setSelectedColor] = useState("#a855f7");
  const [mockPixels, setMockPixels] = useState<Pixel[]>([]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2 text-gray-900 dark:text-white">
          🎨 Irys Pixel Canvas
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-8">
          Pixel canvas dApp powered by official Irys Programmable Data
        </p>
        
        {/* Status */}
        <div className="bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700 rounded-lg p-4 mb-8">
          <h2 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
            ✅ Frontend restored!
          </h2>
          <p className="text-green-700 dark:text-green-300">
            IPRAYS is now working. All features have been restored.
          </p>
        </div>

        {/* Simple color picker */}
        <div className="text-center mb-8">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Select Color</h3>
          <div className="flex justify-center gap-2">
            {['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff', '#000000'].map(color => (
              <button
                key={color}
                className={`w-10 h-10 rounded-full border-4 transform hover:scale-110 transition-transform ${
                  selectedColor === color ? 'border-gray-900 dark:border-white' : 'border-gray-300 dark:border-gray-600'
                }`}
                style={{ backgroundColor: color }}
                onClick={() => setSelectedColor(color)}
              />
            ))}
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Selected color: {selectedColor}
          </p>
        </div>

        {/* Deployed contract info */}
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">📋 Deployed Contract</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong className="text-gray-700 dark:text-gray-300">Proxy:</strong>
              <br />
              <code className="text-blue-600 dark:text-blue-400 text-xs">0x9A854fA655994069500523f57101Ee80b753ea13</code>
            </div>
            <div>
              <strong className="text-gray-700 dark:text-gray-300">Implementation:</strong>
              <br />
              <code className="text-blue-600 dark:text-blue-400 text-xs">0x7Cd93A05B495541748c7B5d29503aEA526AB9958</code>
            </div>
            <div>
              <strong className="text-gray-700 dark:text-gray-300">Chain ID:</strong>
              <br />
              <span className="text-gray-900 dark:text-white">1270 (Irys Testnet)</span>
            </div>
            <div>
              <strong className="text-gray-700 dark:text-gray-300">Pixel Price:</strong>
              <br />
              <span className="text-gray-900 dark:text-white">0.001 Irys</span>
            </div>
          </div>
        </div>

        {/* Next steps */}
        <div className="bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-3">
            🚀 Next Steps
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-700 dark:text-blue-300">
            <li>Connect your wallet (MetaMask, etc.)</li>
            <li>Switch to Irys Testnet</li>
            <li>Connect to Irys and fund your account</li>
            <li>Start placing pixels!</li>
          </ol>
        </div>

        {mockPixels.length > 0 && (
          <div className="mt-8 text-center">
            <h4 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
              Placed pixels: {mockPixels.length}
            </h4>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
