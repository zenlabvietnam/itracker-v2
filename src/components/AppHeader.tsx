import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from './ui/button'; // Assuming Button is a shared UI component
import { LogOut } from 'lucide-react'; // Import LogOut icon
import { supabase } from '../lib/supabaseClient'; // Assuming supabase client is accessible
import { useTheme, themes } from '../contexts/ThemeContext';
import styles from './AppHeader.module.css'; // New CSS module for AppHeader

interface AppHeaderProps {
  session: {
    user: {
      id: string;
      email?: string;
    };
  };
}

const AppHeader: React.FC<AppHeaderProps> = ({ session }) => {
  const navigate = useNavigate();
  const { setTheme } = useTheme();

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    } else {
      // Optionally navigate to login page after logout
      navigate('/login');
    }
  }

  const handleTitleClick = () => {
    navigate('/#'); // Navigate to homepage on title click
  };

  return (
    <div className={styles.headerContainer}>
      <div className={styles.topRow}>
        <div className={styles.appTitleGroup} onClick={handleTitleClick} style={{ cursor: 'pointer' }}>
          <h1 className={styles.title}>inFlow</h1>
          <p className={styles.tagline}>Your Income Flow, Every Moment</p>
        </div>
        <div className={styles.headerControls}>
          <div className={styles.authStatus}>
            <div className={styles.userInfo}>
              <Button
                onClick={handleSignOut}
                className={styles.logoutButton}
                variant="ghost"
                size="icon"
              >
                <LogOut className={styles.logoutIcon} />
              </Button>
              <p className={styles.emailText}>{session.user.email}</p>
            </div>
          </div>
          <div className={styles.themeSelector}>
            {Object.keys(themes).map((themeName) => (
              <button
                key={themeName}
                className={styles.themeButton}
                style={{ backgroundColor: themes[themeName].colors.primary }}
                onClick={() => setTheme(themeName)}
                aria-label={`Switch to ${themes[themeName].name} theme`}
              />
            ))}
          </div>
        </div>
      </div>
      <nav className={styles.mainNav}>
        <Link to="/" className={styles.navLink}>Dashboard</Link>
        <Link to="/goals" className={styles.navLink}>Goals</Link>
        <Link to="/income-sources" className={styles.navLink}>Income Sources</Link>
        {/* TODO: Re-enable reports link after fixing the chart bug. */}
        {/* <Link to="/reports" className={styles.navLink}>Reports</Link> */}
      </nav>
    </div>
  );
};

export default AppHeader;
