import requests

# Replace with your actual keys
API_KEY = 'AIzaSyDKBRtpsnuqpMVuao5tMp65BxfVUJWZN58'
CSE_ID = 'c5d364eaef3874982'

def search_linkedin_profiles(query, num_results=10):
    search_url = "https://www.googleapis.com/customsearch/v1"
    params = {
        "key": API_KEY,
        "cx": CSE_ID,
        "q": f"site:linkedin.com/in {query}",
        "num": num_results
    }

    response = requests.get(search_url, params=params)
    results = response.json()

    if "items" not in results:
        print("No results or error:", results)
        return []

    for item in results["items"]:
        print(item["title"])
        print(item["link"])
        print("---")

if __name__ == "__main__":
    search_query = "oreo production specialist"
    search_linkedin_profiles(search_query)
