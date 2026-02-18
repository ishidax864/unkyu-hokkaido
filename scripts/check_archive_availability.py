import urllib.request
import json
from collections import defaultdict
import time

def check_archive_availability():
    # Target URL prefix for JR Hokkaido operation status
    target_url = "https://www3.jrhokkaido.co.jp/webunkou/*"
    
    # CDX API URL
    # output=json, fl=timestamp,original, statuscode=200, collapse=digest (to avoid duplicates)
    api_url = f"http://web.archive.org/cdx/search/cdx?url={target_url}&output=json&fl=timestamp,original&filter=statuscode:200&collapse=digest"
    
    print(f"Checking availability for: {target_url}")
    print("Querying Wayback Machine CDX API... (this may take a moment)")
    
    try:
        with urllib.request.urlopen(api_url) as response:
            data = json.loads(response.read().decode('utf-8'))
            
        # Remove header row
        if data and data[0][0] == 'timestamp':
            data.pop(0)
            
        print(f"Total snapshots found: {len(data)}")
        
        # Group by year
        year_counts = defaultdict(int)
        area_counts = defaultdict(int)
        
        for timestamp, original_url in data:
            year = timestamp[:4]
            year_counts[year] += 1
            
            # Check for area specific pages
            if "area_" in original_url:
                area_counts[original_url.split('/')[-1]] += 1

        print("\n--- Snapshots by Year ---")
        for year in sorted(year_counts.keys()):
            print(f"{year}: {year_counts[year]} snapshots")
            
        print("\n--- Snapshots by Page Type (Top 10) ---")
        sorted_areas = sorted(area_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        for url, count in sorted_areas:
            print(f"{url}: {count} snapshots")
            
        # Winter season check (Nov-Mar)
        winter_count = 0
        for timestamp, _ in data:
            month = int(timestamp[4:6])
            if month in [11, 12, 1, 2, 3]:
                winter_count += 1
        
        print(f"\nTotal Winter Season Snapshots (Nov-Mar): {winter_count}")

    except Exception as e:
        print(f"Error querying Archive.org: {e}")

if __name__ == "__main__":
    check_archive_availability()
