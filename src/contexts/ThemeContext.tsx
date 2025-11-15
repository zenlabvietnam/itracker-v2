import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';

// Define the shape of a theme
interface Theme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    accent: string;
  };
}

// Define your themes
export const themes: { [key: string]: Theme } = {
  'windows-7': {
    name: 'Windows 7',
    colors: {
      primary: '#003366', // Darker Blue
      secondary: '#6699CC', // Lighter Blue
      background: '#E6F0F8', // Light Grayish Blue
      text: '#000000', // Black
      accent: '#B0C4DE', // Light Steel Blue
    },
  },
  'windows-11': {
    name: 'Windows 11',
    colors: {
      primary: '#0078D4', // Accent Blue
      secondary: '#666666', // Dark Gray
      background: '#F3F3F3', // Very Light Gray
      text: '#1A1A1A', // Dark Text
      accent: '#E0E0E0', // Light Gray (frosted glass effect)
    },
  },
  'windows-3-1': {
    name: 'Windows 3.1',
    colors: {
      primary: '#808080', // Gray
      secondary: '#C0C0C0', // Light Gray
      background: '#000000', // Black
      text: '#FFFFFF', // White
      accent: '#000000', // Black (borders)
    },
  },
  'cosmic-orange': {
    name: 'Cosmic Orange',
    colors: {
      primary: '#FF5722', // Deep Orange
      secondary: '#FFAB91', // Light Orange
      background: '#FFF3E0', // Very Light Orange
      text: '#BF360C', // Darker Orange
      accent: '#FFCCBC', // Pale Orange
    },
  },
};

// Define the shape of the context
interface ThemeContextType {
  theme: Theme;
  setTheme: (themeName: string) => void;
}

// Create the context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Create the provider component
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(themes['windows-7']);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', theme.colors.primary);
    root.style.setProperty('--secondary-color', theme.colors.secondary);
    root.style.setProperty('--background-color', theme.colors.background);
    root.style.setProperty('--text-color', theme.colors.text);
    root.style.setProperty('--accent-color', theme.colors.accent);
  }, [theme]);

  const setTheme = (themeName: string) => {
    const newTheme = themes[themeName];
    if (newTheme) {
      setThemeState(newTheme);
    }
  };

  const contextValue = useMemo(() => ({ theme, setTheme }), [theme]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// Create a custom hook for using the theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
