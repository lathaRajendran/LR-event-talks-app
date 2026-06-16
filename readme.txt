===========================================================
BigQuery Release Notes Tracker & Share Tool
===========================================================

This application is a modern web-based dashboard built using Python Flask, HTML, CSS, and JavaScript. It fetches the latest BigQuery release notes from the Google Cloud release feed, displays them in a sleek, glassmorphic UI, and allows you to instantly tweet any specific update with a tailored pre-filled message.

-----------------------------------------------------------
Features
-----------------------------------------------------------
1. Dynamic Feed: Automatically fetches and parses Google's BigQuery Release Notes Atom XML feed.
2. Category Organization: Automatically groups release items by category (Features, Changes, Deprecations) within daily release logs.
3. Interactive Filtering: Filter release logs dynamically by category type or search keywords.
4. One-Click Tweet: Select any specific update item to open a modal that previews and generates a ready-to-share tweet on X (Twitter).
5. Live Character Count: Built-in character tracker with warning indicators to stay within the 280-character limit.

-----------------------------------------------------------
Prerequisites
-----------------------------------------------------------
- Python 3.7 or higher
- pip (Python package installer)

-----------------------------------------------------------
Installation & Setup
-----------------------------------------------------------
1. Navigate to the project directory:
   cd bq-releases-notes

2. Install the required dependencies:
   pip3 install -r requirements.txt

-----------------------------------------------------------
Running the Application
-----------------------------------------------------------
1. Run the Flask development server:
   python3 app.py

2. Open your web browser and go to:
   http://127.0.0.1:5001

-----------------------------------------------------------
How to Use the App
-----------------------------------------------------------
- Refresh: Click the "Refresh" button at the top right to fetch the absolute latest releases.
- Search & Filter: Use the search bar to search for terms like "Gemini" or click the filter buttons (Features, Changes, Deprecations) to filter the feed.
- Tweeting: Click "Tweet Update" on any individual card item. A preview modal will appear with the formatted tweet. Edit if necessary, then click the "Tweet" button. This will launch Twitter in a new tab with your pre-filled status.
