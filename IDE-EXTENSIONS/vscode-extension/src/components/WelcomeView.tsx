import React from "react";
import LanoLogo from "./LanoLogo";
import Button from "./ui/Button";

export interface WelcomeViewProps {
  onLogin: () => void;
  isConnecting: boolean;
}

const WelcomeView: React.FC<WelcomeViewProps> = ({ onLogin, isConnecting }) => {
  return (
    <div className="p-6 space-y-8 flex flex-col items-center justify-center min-h-[400px]">
      <div 
        className="h-14 w-14 bg-gradient-to-br from-[#007ACC] to-[#0E639C] rounded-full flex items-center justify-center shadow-lg shadow-[#007ACC]/30"
      >
        <LanoLogo size={28} className="text-white" />
      </div>
      
      <div 
        className="text-center space-y-4"
      >
        <h2 className="text-lg font-semibold text-[#CCCCCC]">
          Welcome to Lanonasis Memory
        </h2>
        <p className="text-sm text-[#888888] max-w-[250px]">
          Your AI-powered memory assistant for VS Code. Store, search, and retrieve knowledge with semantic understanding.
        </p>
      </div>

      <div 
        className="w-full space-y-3"
      >
        <Button
          onClick={onLogin}
          disabled={isConnecting}
          className="w-full bg-[#007ACC] hover:bg-[#005A9E] text-white border-0"
        >
          {isConnecting ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
              Connecting...
            </>
          ) : (
            "Connect to Lanonasis"
          )}
        </Button>
        
        <div className="text-center">
          <p className="text-xs text-[#666666]">
            Secure OAuth2 authentication
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeView;
