# Y-Traction 🎯

[![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)](https://github.com/momahari/Y-traction-)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-yellow.svg)](https://developer.chrome.com/docs/extensions/)

**Boost your productivity by eliminating YouTube distractions and blocking time-wasting websites with an integrated Pomodoro timer.**

Y-Traction is a comprehensive Chrome extension designed to help you stay focused and productive while browsing the web. It combines YouTube content filtering, website blocking, and a built-in focus timer in one powerful tool.

## ✨ Features

### 🍅 **Focus Mode (Pomodoro Timer)**

- **Customizable Timer**: Set focus sessions from 1-60 minutes
- **Visual Progress**: Beautiful circular progress indicator
- **Break Reminders**: Automatic break notifications between focus cycles
- **Session Tracking**: Keep track of completed focus sessions
- **Smart Notifications**: Non-intrusive notifications only when needed

### 📺 **YouTube Content Control**

- **Ad Blocking**: Hide YouTube advertisements and promoted content
- **Distraction Removal**: Hide video suggestions, comments, and playlists
- **Shorts Blocking**: Remove YouTube Shorts from your feed
- **Sidebar Control**: Toggle the YouTube sidebar visibility
- **Granular Control**: Enable/disable specific YouTube elements individually

### 🛡️ **Website Blocker**

- **Quick Block Presets**: One-click blocking for major social media platforms
  - Facebook, Instagram, Twitter/X
  - TikTok, Snapchat, LinkedIn
  - Reddit, Pinterest, Discord
- **Custom Blocking**: Add any website to your block list
- **Beautiful Block Page**: Motivational messages when accessing blocked sites
- **Easy Management**: Simple add/remove interface for blocked websites
- **Instant Blocking**: Real-time website blocking without page refresh

### 🌙 **User Experience**

- **Dark/Light Theme**: Toggle between themes for comfortable viewing
- **Three-Tab Interface**: Organized features in separate, intuitive tabs
- **Responsive Design**: Clean, modern interface that works perfectly
- **Toast Notifications**: Helpful feedback for all actions

## 📸 Screenshots

### Focus Mode

![Focus Mode](screenshots/focus-mode.png)
_Pomodoro timer with circular progress and session controls_

### YouTube Controls

![YouTube Controls](screenshots/youtube-controls.png)
_Granular control over YouTube interface elements_

### Website Blocker

![Website Blocker](screenshots/website-blocker.png)
_Quick preset buttons and custom website management_

## 🚀 Installation

### From Chrome Web Store (Recommended)

_Coming soon - Extension pending review_

### Manual Installation (Developer Mode)

1. **Download the extension**

   ```bash
   git clone https://github.com/momahari/Y-traction-.git
   cd Y-traction-
   ```

2. **Open Chrome Extensions**

   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (top-right toggle)

3. **Load the extension**
   - Click "Load unpacked"
   - Select the `Y-Traction` folder
   - The extension icon will appear in your toolbar

## 🛠️ Usage

### Getting Started

1. **Click the Y-Traction icon** in your Chrome toolbar
2. **Choose your tab** based on what you want to accomplish:
   - **Focus**: Start a productivity session
   - **YouTube**: Customize your YouTube experience
   - **Blocker**: Block distracting websites

### Focus Mode Usage

1. **Set your focus time** using the input field (1-60 minutes)
2. **Click "Start Focus"** to begin your session
3. **Stay focused** - the timer will count down visually
4. **Take breaks** when notified between sessions

### YouTube Controls

1. **Toggle switches** for each YouTube element you want to hide:
   - **Ads**: Remove all YouTube advertisements
   - **Suggestions**: Hide video recommendations
   - **Playlists**: Remove playlist suggestions
   - **Sidebar**: Hide the navigation sidebar
   - **Shorts**: Remove YouTube Shorts content
   - **Comments**: Hide comment sections

### Website Blocker

1. **Quick Block**: Click preset buttons for instant social media blocking
2. **Custom Block**: Add any website URL manually
3. **Manage List**: View and remove blocked websites easily
4. **Block Page**: When visiting blocked sites, see motivational content instead

## ⚙️ Technical Details

### Architecture

- **Manifest V3**: Built with the latest Chrome extension standards
- **Content Scripts**: Efficient DOM manipulation for YouTube and website blocking
- **Background Service Worker**: Handles timer notifications and storage
- **Local Storage**: Secure, persistent settings storage

### Permissions

- `storage`: Save your preferences and blocked websites
- `notifications`: Timer alerts and session reminders
- `activeTab`: Apply YouTube modifications to current tab
- `scripting`: Inject content scripts for website blocking
- `webNavigation`: Detect navigation for website blocking
- `<all_urls>`: Block websites across all domains

### Files Structure

```
Y-Traction/
├── manifest.json          # Extension configuration
├── background.js          # Service worker for timer and notifications
├── content.js            # YouTube DOM manipulation
├── blocker.js            # Website blocking functionality
├── popup/
│   ├── popup.html        # Extension interface
│   ├── popup.css         # Styling and themes
│   └── popup.js          # UI logic and interactions
├── icons/                # Extension icons
└── README.md            # This file
```

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Test thoroughly**
5. **Commit your changes**
   ```bash
   git commit -m "Add amazing feature"
   ```
6. **Push to your branch**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### Development Setup

```bash
# Clone the repository
git clone https://github.com/momahari/Y-traction-.git
cd Y-traction-

# Load in Chrome for testing
# Navigate to chrome://extensions/
# Enable Developer mode
# Click "Load unpacked" and select the project folder
```

## 🐛 Bug Reports & Feature Requests

Found a bug or have a feature idea? We'd love to hear from you!

- **Bug Reports**: [Open an issue](https://github.com/momahari/Y-traction-/issues/new?template=bug_report.md)
- **Feature Requests**: [Request a feature](https://github.com/momahari/Y-traction-/issues/new?template=feature_request.md)
- **General Discussion**: [Start a discussion](https://github.com/momahari/Y-traction-/discussions)

## 📋 Changelog

### Version 2.1.0 (Current)

- ✅ Complete UI redesign with three-tab interface
- ✅ Integrated Pomodoro timer with visual progress
- ✅ Website blocker with preset social media sites
- ✅ Enhanced YouTube controls with granular options
- ✅ Dark/light theme toggle
- ✅ Improved notification system
- ✅ Better error handling and stability

### Version 2.0.0

- ✅ Added focus mode functionality
- ✅ Separated YouTube controls into dedicated tab
- ✅ Implemented website blocking system

### Version 1.x

- ✅ Basic YouTube ad and distraction blocking
- ✅ Simple toggle interface

## 🔒 Privacy

Y-Traction respects your privacy:

- **No Data Collection**: We don't collect or transmit any personal data
- **Local Storage Only**: All settings are stored locally on your device
- **No Analytics**: No tracking, analytics, or telemetry
- **Open Source**: Full transparency - inspect the code yourself

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Icons**: FontAwesome for beautiful icons
- **UI Framework**: Bootstrap for responsive design
- **Inspiration**: Pomodoro Technique by Francesco Cirillo
- **Community**: Thanks to all contributors and users

## 📞 Support

Need help? Here's how to get support:

- **Documentation**: Check this README first
- **Issues**: [GitHub Issues](https://github.com/momahari/Y-traction-/issues)
- **Discussions**: [GitHub Discussions](https://github.com/momahari/Y-traction-/discussions)
- **Email**: Create an issue for direct contact

---

<div align="center">

**Made with ❤️ by [momahari](https://github.com/momahari)**

⭐ Star this repo if you find it helpful!

[Report Bug](https://github.com/momahari/Y-traction-/issues) • [Request Feature](https://github.com/momahari/Y-traction-/issues) • [Contribute](https://github.com/momahari/Y-traction-/pulls)

</div>
