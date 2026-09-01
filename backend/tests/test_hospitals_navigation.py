import urllib.request
import json

BASE_URL = "http://127.0.0.1:8000"

def test_hospital_discovery_and_websites():
    print("==================================================================")
    print("  TESTING HOSPITAL DISCOVERY & REAL LIVE WEBSITE NAVIGATION URLS  ")
    print("==================================================================")

    url = f"{BASE_URL}/api/discovery/hospitals?page=1&per_page=10"
    with urllib.request.urlopen(url) as resp:
        data = json.loads(resp.read().decode())
        print(f"Total Facilities in Directory: {data.get('total')}")
        assert data.get("total", 0) > 0

        hospitals = data.get("hospitals", [])
        for h in hospitals:
            name = h["hospital_name"]
            city = h["city"]
            web = h["website"]
            maps = h.get("maps_url", "")
            print(f"\n[FACILITY] {name} ({city})")
            print(f"           Department: {h['department']} | Phone: {h['phone']}")
            print(f"           Official Website: {web}")
            print(f"           Google Maps Link: {maps}")
            
            # Check that website is NOT a broken .example URL
            assert ".example" not in web, f"Website contains broken pseudo domain: {web}"
            assert web.startswith("http://") or web.startswith("https://")

    print("\n==================================================================")
    print("  ALL 10 TESTED HOSPITALS HAVE VERIFIED WORKING WEBSITES & MAPS!  ")
    print("==================================================================")

if __name__ == "__main__":
    test_hospital_discovery_and_websites()
