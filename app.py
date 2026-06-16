import os
import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def fetch_and_parse_feed():
    try:
        req = urllib.request.Request(FEED_URL, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'})
        with urllib.request.urlopen(req) as response:
            xml_data = response.read()
        
        root = ET.fromstring(xml_data)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        entries = []
        
        for entry in root.findall('atom:entry', ns):
            id_val = entry.find('atom:id', ns)
            title = entry.find('atom:title', ns)
            updated = entry.find('atom:updated', ns)
            content = entry.find('atom:content', ns)
            
            entries.append({
                'id': id_val.text if id_val is not None else '',
                'title': title.text if title is not None else '',
                'updated': updated.text if updated is not None else '',
                'content': content.text if content is not None else ''
            })
        return entries, None
    except Exception as e:
        return [], str(e)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    entries, error = fetch_and_parse_feed()
    if error:
        return jsonify({'error': error}), 500
    return jsonify(entries)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
