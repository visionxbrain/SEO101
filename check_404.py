#!/usr/bin/env python3
import csv
import requests
import time
from urllib.parse import urlparse
from datetime import datetime
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

def check_url(url, timeout=10):
    """Check if URL returns 404 or other errors"""
    try:
        response = requests.get(url, timeout=timeout, allow_redirects=True)
        status_code = response.status_code
        final_url = response.url
        
        return {
            'original_url': url,
            'status_code': status_code,
            'final_url': final_url,
            'is_404': status_code == 404,
            'error': None,
            'checked_at': datetime.now().isoformat()
        }
    except requests.exceptions.RequestException as e:
        return {
            'original_url': url,
            'status_code': None,
            'final_url': None,
            'is_404': False,
            'error': str(e),
            'checked_at': datetime.now().isoformat()
        }

def read_csv(file_path):
    """Read URLs from CSV file"""
    urls = []
    with open(file_path, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        for row in reader:
            if 'URL' in row:
                urls.append(row['URL'])
    return urls

def check_urls_batch(urls, max_workers=10):
    """Check multiple URLs concurrently"""
    results = []
    total = len(urls)
    completed = 0
    lock = threading.Lock()
    
    def update_progress():
        nonlocal completed
        with lock:
            completed += 1
            print(f"Progress: {completed}/{total} ({completed*100/total:.1f}%)")
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_url = {executor.submit(check_url, url): url for url in urls}
        
        for future in as_completed(future_to_url):
            result = future.result()
            results.append(result)
            update_progress()
            
            if result['is_404']:
                print(f"✗ 404 Found: {result['original_url']}")
            elif result['error']:
                print(f"✗ Error: {result['original_url']} - {result['error']}")
            elif result['status_code'] != 200:
                print(f"⚠ Status {result['status_code']}: {result['original_url']}")
    
    return results

def save_results(results, output_file):
    """Save results to JSON and CSV files"""
    # Save to JSON
    json_file = output_file.replace('.csv', '.json')
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    # Save to CSV
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        fieldnames = ['original_url', 'status_code', 'final_url', 'is_404', 'error', 'checked_at']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)
    
    print(f"\nResults saved to: {output_file} and {json_file}")

def generate_report(results):
    """Generate summary report"""
    total = len(results)
    status_404 = sum(1 for r in results if r['is_404'])
    errors = sum(1 for r in results if r['error'])
    status_200 = sum(1 for r in results if r['status_code'] == 200)
    other_status = total - status_404 - errors - status_200
    
    report = f"""
=== URL Check Report ===
Total URLs checked: {total}

Results:
- 404 Not Found: {status_404}
- 200 OK: {status_200}
- Other Status Codes: {other_status}
- Connection Errors: {errors}

404 URLs:
"""
    
    for r in results:
        if r['is_404']:
            report += f"  - {r['original_url']}\n"
    
    if errors > 0:
        report += "\nFailed URLs (connection errors):\n"
        for r in results:
            if r['error']:
                report += f"  - {r['original_url']}: {r['error']}\n"
    
    return report

def main():
    csv_file = '/Users/tanakitchaithip/Downloads/visionxbrain.com-Coverage-Drilldown-2025-08-22 (1)/ข้อมูล 404.csv'
    output_file = 'results_404_check.csv'
    
    print(f"Reading URLs from: {csv_file}")
    urls = read_csv(csv_file)
    print(f"Found {len(urls)} URLs to check\n")
    
    print("Starting URL checks (using 10 concurrent workers)...")
    start_time = time.time()
    
    results = check_urls_batch(urls, max_workers=10)
    
    elapsed_time = time.time() - start_time
    print(f"\nCompleted in {elapsed_time:.1f} seconds")
    
    save_results(results, output_file)
    
    report = generate_report(results)
    print(report)
    
    # Save report to file
    with open('report_404.txt', 'w', encoding='utf-8') as f:
        f.write(report)
    print("Report saved to: report_404.txt")

if __name__ == "__main__":
    main()